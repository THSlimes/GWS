import writeXlsxFile from 'write-excel-file'

import { EventInfo } from "../firebase/database/events/EventDatabase";
import { Class, HasSections } from "../util/UtilTypes";
import ColorUtil from "../util/ColorUtil";
import { onPermissionCheck } from "../firebase/authentication/permission-based-redirect";
import EventCalendar from "./EventCalendar";
import FunctionUtil from "../util/FunctionUtil";
import RichTextInput from "./rich-text/RichTextInput";
import { DetailLevel } from "../util/UtilTypes";
import Permissions from "../firebase/database/Permissions";
import getErrorMessage from "../firebase/authentication/error-messages";
import { onAuth } from "../firebase/init-firebase";
import ElementFactory from "../html-element-factory/ElementFactory";
import DateUtil from "../util/DateUtil";
import URLUtil from "../util/URLUtil";
import Switch from "./Switch";
import Responsive from "../ui/Responsive";
import UserFeedback from "../ui/UserFeedback";
import ElementUtil from "../util/ElementUtil";
import EventDatabaseFactory from "../firebase/database/events/EventDatabaseFactory";
import NumberUtil from "../util/NumberUtil";
import Loading from "../Loading";
import { EventComponentEditor } from './EventComponentEditor';
import ObjectUtil from '../util/ObjectUtil';

/**
 * An EventNote displays relevant information of an event.
 */
export class EventNote extends HTMLElement implements HasSections<EventNote.SectionName> {

    private static permissionsQueried = false;
    private static permissionsQueriedHandlers:VoidFunction[] = [];
    /** Whether the user is allowed to delete events from the database. */
    protected static CAN_DELETE = false;
    /** Whether the user is allowed to add events to the database. */
    protected static CAN_UPDATE = false;
    /** Promise that resolves once relevant permissions have been queried. */
    protected static onPermissionsQueried():Promise<void> {
        return new Promise(resolve => {
            if (this.permissionsQueried) resolve(); // already done
            else this.permissionsQueriedHandlers.push(resolve); // called in static block
        });
    }

    static { // query permissions
        onPermissionCheck([Permissions.Permission.DELETE_EVENTS, Permissions.Permission.UPDATE_EVENTS], (_, res) => {
            this.CAN_DELETE = res.DELETE_EVENTS;
            this.CAN_UPDATE = res.UPDATE_EVENTS;
            this.permissionsQueried = true;
            for (const h of this.permissionsQueriedHandlers) h(); // resolved waiting promises
        }, true, true);
    }
    
    /** Mapping of section names to the minimum DetailLevel from which they should be visible. */
    protected static SECTIONS_VISIBLE_FROM:Record<EventNote.SectionName,DetailLevel> = {
        name: DetailLevel.LOW,
        timespan: DetailLevel.MEDIUM,
        description: DetailLevel.HIGH,
        quickActions: DetailLevel.HIGH,
    };

    /** Whether the section with the given name should be visible */
    protected isVisible(sectionName:EventNote.SectionName):boolean {
        const ownClass = (this.constructor as typeof EventNote);
        return ownClass.SECTIONS_VISIBLE_FROM[sectionName] <= this.lod;
    }

    public name!:HTMLHeadingElement;
    public timespan!:HTMLParagraphElement;
    public description!:HTMLDivElement;
    public quickActions!:HTMLDivElement;

    protected readonly _expanded:boolean;
    public get expanded() { return this._expanded; }
    private _lod!:DetailLevel;
    /** Level of detail */
    public get lod() { return this._lod; }
    public set lod(newLOD) {
        if (newLOD !== this.lod) {
            this._lod = newLOD; // store LOD
            this.setAttribute("lod", this.lod.toString());
            const ownClass = (this.constructor as typeof EventNote);

            for (const k in ownClass.SECTIONS_VISIBLE_FROM) { // apply lod
                const sectionName = k as EventNote.SectionName;
                const elem = this[sectionName];
                
                if (elem) elem.hidden = this.lod < ownClass.SECTIONS_VISIBLE_FROM[sectionName];
            }
        }
    }

    /** EventInfo of the note */
    public event!:EventInfo;

    constructor(event:EventInfo, lod=DetailLevel.MEDIUM, expanded=false) {
        super();

        this._expanded = this.hasAttribute("expanded") || expanded;

        const eventOrigin = ElementUtil.getAttrAs<EventDatabaseFactory.Origin>(this, "origin", v => Object.values(EventDatabaseFactory.Origin).includes(v as EventDatabaseFactory.Origin));
        const eventId = this.getAttribute("id");
        if (eventOrigin && eventId) {
            const db = EventDatabaseFactory.fromOrigin(eventOrigin);
            db.getById(eventId)
            .then(event => {
                if (!event) throw new Error(`no event with id "${eventId}" found in ${eventOrigin} database.`);

                this.event = event;
                this.initElement();
                this.lod = NumberUtil.clamp(ElementUtil.getAttrAsNumber(this, "lod", false) ?? lod, DetailLevel.LOW, DetailLevel.FULL);
                EventNote.applyComponents(this, ...this.event.components);
            })
            .catch(console.error);
        }
        else {
            this.event = event;
            this.initElement();
            this.lod = NumberUtil.clamp(ElementUtil.getAttrAsNumber(this, "lod", false) ?? lod, DetailLevel.LOW, DetailLevel.FULL);
            EventNote.applyComponents(this, ...this.event.components);
        }

    }

    initElement():void {
        this.classList.add("flex-rows");
        this.classList.toggle("min-section-gap", this._expanded);
        this.toggleAttribute("expanded", this._expanded);

        // apply color palette
        if (!this.event.hasComponent(EventInfo.Components.Color)) ColorUtil.getStringColor(this.event.category || this.event.name)
            .then(bgColor => {
                this.style.setProperty("--background-color", bgColor);
                this.style.setProperty("--text-color", ColorUtil.getMostContrasting(bgColor, "#233452", "#ffffff"));
            })
            .catch(err => UserFeedback.error(getErrorMessage(err)));

        // name section
        this.name = ElementFactory.heading(this._expanded ? 1 : 5, this.event.name).class("name", "no-margin").make();

        // timespan section
        let timespanText:string;
        if (this._expanded) { // include year
            if (DateUtil.Timespans.areFullDays([this.event.starts_at, this.event.ends_at])) {
                timespanText = DateUtil.Days.isSame(this.event.starts_at, this.event.ends_at) ?
                    DateUtil.DATE_FORMATS.DAY.SHORT(this.event.starts_at) :
                    `${DateUtil.DATE_FORMATS.DAY.SHORT(this.event.starts_at)} t/m ${DateUtil.DATE_FORMATS.DAY.SHORT(this.event.ends_at)}`;
            }
            else if (this.event.starts_at.getTime() === this.event.ends_at.getTime()) timespanText = DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT(this.event.starts_at);
            else timespanText = `${DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT(this.event.starts_at)} t/m ${DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT(this.event.ends_at)}`;
        }
        else { // exclude year
            if (DateUtil.Timespans.areFullDays([this.event.starts_at, this.event.ends_at])) {
                timespanText = DateUtil.Days.isSame(this.event.starts_at, this.event.ends_at) ?
                    DateUtil.DATE_FORMATS.DAY.SHORT_NO_YEAR(this.event.starts_at) :
                    `${DateUtil.DATE_FORMATS.DAY.SHORT_NO_YEAR(this.event.starts_at)} t/m ${DateUtil.DATE_FORMATS.DAY.SHORT_NO_YEAR(this.event.ends_at)}`;
            }
            else if (this.event.starts_at.getTime() === this.event.ends_at.getTime()) timespanText = DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT_NO_YEAR(this.event.starts_at);
            else timespanText = `${DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT_NO_YEAR(this.event.starts_at)} t/m ${DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT_NO_YEAR(this.event.ends_at)}`;
        }

        this.timespan = ElementFactory.p(timespanText).class("timespan", "subtitle", "no-margin").make();
        this.appendChild(
            ElementFactory.div()
                .children(this.name, this.timespan)
                .style({ width: "100%" })
                .make()
        );

        // description section
        this.description = this.appendChild(ElementFactory.richText(this.event.description).class("description").make());

        // quick actions section
        EventNote.onPermissionsQueried()
        .then(() => this.quickActions = this.appendChild(
            ElementFactory.div(undefined, "quick-actions", "flex-columns")
                .children(
                    EventNote.CAN_DELETE && ElementFactory.iconButton("delete", (_, self) => {
                            if (self.hasAttribute("awaiting-confirmation")) this.event.sourceDB.delete(this.event)
                                .then(() => {
                                    UserFeedback.success("Activiteit is succesvol verwijderd.");
                                    EventCalendar.closeFullscreenNote();
                                })
                                .catch(() => UserFeedback.error("Kon activiteit niet verwijderen, probeer het later opnieuw."));
                            else {
                                self.toggleAttribute("awaiting-confirmation", true);
                                self.textContent = "delete_forever";
                                UserFeedback.warning("Weet je het zeker? Een activiteit verwijderen kan niet worden teruggedraaid.", 3000);
                                setTimeout(() => {
                                    self.removeAttribute("awaiting-confirmation");
                                    self.textContent = "delete";
                                }, 3000);
                            }
                        }, "Activiteit verwijderen")
                        .class("delete-button"),
                    EventNote.CAN_UPDATE && ElementFactory.iconButton("edit_square", () => {
                        this.replaceWith(new EditableEventNote(this.event.copy(), this.lod, this._expanded));
                    }, "Activiteit bewerken"),
                    ElementFactory.iconButton("share", () => {
                            const url = `${location.origin}/agenda.html#id=${this.event.id}`;
                            const shareData:ShareData = { url, title: `GWS Activiteit - ${this.event.name}` };
                            if (navigator.canShare(shareData)) navigator.share(shareData); // share
                            else navigator.clipboard.writeText(url) // can't share, copy to clipboard
                                .then(() => UserFeedback.success("Link gekopieerd!"))
                                .catch(() => UserFeedback.error("Kan link niet kopiëren, probeer het later opnieuw."));
                        }, "Delen"),
                    ElementFactory.iconButton("close", () => EventCalendar.closeFullscreenNote()),
                )
                .onMake(self => self.hidden = !this.isVisible("quickActions"))
                .make()
        ));

    }

    public copy(lod:DetailLevel=this._lod, expanded:boolean=this._expanded) {
        return new EventNote(this.event, lod ?? this.lod, expanded ?? this._expanded);
    }

}

export namespace EventNote {
    /** Names of sections of an EventNote */
    export type SectionName = "name" | "timespan" | "description" | "quickActions";

    export async function applyComponents(note:EventNote, ...components:EventInfo.Component[]) {
        Loading.markLoadStart(note);

        const now = new Date();
        
        // sort based on application order
        components = components.toSorted((a, b) => applyComponents.ORDER.indexOf(a.Class) - applyComponents.ORDER.indexOf(b.Class));

        const formResponseGetters:(()=>EventInfo.Components.Form.Response)[] = [];

        for (const comp of components) {
            if (comp instanceof EventInfo.Components.Color) {
                note.style.setProperty("--background-color", comp.bg);
                note.style.setProperty("--text-color", ColorUtil.getMostContrasting(comp.bg, "#233452", "#ffffff"));
            }
            else if (comp instanceof EventInfo.Components.Registerable) {

                const spacesLeft = (comp.capacity ?? Infinity) - comp.numRegistrations;

                comp.onRegistrationsChanged = () => note.style.setProperty("--num-registrations", comp.numRegistrations.toString());
                note.style.setProperty("--num-registrations", comp.numRegistrations.toString());
                
                await Promise.all([
                    onAuth(),
                    comp.getResponsesFor(note.event),
                    EventInfo.Components.Registerable.checkCanReadResponses(),
                    EventInfo.Components.Registerable.checkCanRegister(),
                    EventInfo.Components.Registerable.checkCanDeregister(),
                ])
                .then(([user, responses, canReadResponses, canRegister, canDeregister]) => {
                    if (note.lod >= DetailLevel.FULL) {
                        const sortedIDs = Object.keys(comp.registrations).sort((a, b) => comp.registrations[a].localeCompare(comp.registrations[b]));

                        // list of registrations
                        const newReg = ElementFactory.div(undefined, "registrations", "flex-rows", "in-section-gap")
                            .children(
                                ElementFactory.div()
                                .class(
                                    "flex-columns",
                                    canReadResponses && Responsive.isSlimmerOrEq(Responsive.Viewport.DESKTOP_SLIM) ? "main-axis-center" : "main-axis-space-between",
                                    "cross-axis-center",
                                    "in-section-gap"
                                )
                                .children(
                                    ElementFactory.heading(note.expanded ? 3 : 4, user === null ? `${ObjectUtil.sizeOf(comp.registrations)} ingeschreven geitjes` : "Ingeschreven geitjes")
                                    .children(Number.isFinite(spacesLeft) && ElementFactory.span(` (${spacesLeft} plekken over)`).class("subtitle"))
                                    .class("no-margin"),
                                    canReadResponses && ElementFactory.div(undefined, "flex-columns", "cross-axis-center", "in-section-gap")
                                    .children(
                                        comp.numRegistrations !== 0 && ElementFactory.iconButton("download", () => { // create xlsx file and download it
                                            const headerRow = [
                                                { value: "Naam" },
                                                { value: "Inschrijfmoment" },
                                                { value: "Opmerking" },
                                                ...(Object.values(responses).find(res => res.form_responses !== undefined)?.form_responses ?? []).map(r => {
                                                    return { value: r.name };
                                                })
                                            ];

                                            const data = sortedIDs.map(id => {
                                                const name = comp.registrations[id];

                                                if (id in responses) {
                                                    const response = responses[id];
                                                    return [
                                                        { type: String, value: name },
                                                        { type: Date, value: response.created_at, format: "d mmmm yyyy" },
                                                        { type: String, value: response.body ?? "" },
                                                        ...(response.form_responses ?? []).map(r => {
                                                            return { type: String, value: r.value || '-' }
                                                        })
                                                    ];
                                                }
                                                else return [{ type: String, value: name }];
                                            });

                                            const widths:number[] = [0, headerRow[1].value.length];
                                            for (const row of [headerRow, ...data]) {
                                                while (row.length > widths.length) widths.push(0);
                                                for (let i = 0; i < row.length; i ++) {
                                                    if (i !== 1) widths[i] = Math.max(widths[i], row[i].value.toString().length);
                                                }
                                            }

                                            const fileName = `Inschrijvingen ${note.event.name} (${DateUtil.DATE_FORMATS.DAY.SHORT_NO_YEAR(note.event.starts_at)}).xlsx`;
                                            writeXlsxFile(
                                                [headerRow, ...data],
                                                { columns: widths.map(w => { return { width: Math.round(w*1.25) } }), fileName }
                                            )
                                            .catch(err => console.error(err));
                                        }, "Inschrijvingen downloaden"),
                                        (ObjectUtil.sizeOf(responses) !== 0) && ElementFactory.iconButton("comment", (_, self) => {
                                            if (self.toggleAttribute("selected", !note.toggleAttribute("hide-comments"))) {
                                                [self.textContent, self.title] = ["comment", "Opmerkingen verbergen"];
                                            }
                                            else [self.textContent, self.title] = ["comments_disabled", "Opmerkingen tonen"]
                                        }, "Opmerkingen verbergen").attr("selected").attr("can-unselect")
                                    )
                                ),
                                (user !== null) && ElementFactory.div(undefined, "registrations-list", "no-margin")
                                .children(
                                    ...sortedIDs.map(id => {
                                        const name = comp.registrations[id];
                                        const resp = responses[id];
                                        const showResponse = resp?.body !== undefined || resp?.form_responses?.length !== undefined;
                                        return ElementFactory.div(undefined, "flex-rows", "cross-axis-center")
                                            .children(
                                                ElementFactory.p(name + (showResponse ? '*' : "")).class("no-margin", "text-center"),
                                                showResponse && ElementFactory.div(undefined, "comment", "flex-rows", "cross-axis-center")
                                                .children(
                                                    ElementFactory.div(undefined, "point").children(ElementFactory.div(undefined, "inside")),
                                                    ElementFactory.div(undefined, "message", "flex-rows")
                                                    .children(
                                                        (resp.body !== undefined) && ElementFactory.p(`"${resp.body}"`)
                                                        .class("message", "no-margin", "subtitle"),
                                                        ...(resp.form_responses ?? []).map((resp, i) => {
                                                            return ElementFactory.p()
                                                                .children(`${i+1}.  ${resp.value || '-'}`)
                                                                .class("no-margin", "subtitle", "flex-columns", "main-axis-space-between");
                                                        })
                                                    )
                                                    .tooltip(DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT_NO_YEAR(resp.created_at)),
                                                )
                                            )
                                    })
                                )
                            )
                            .make();

                        Array.from(note.getElementsByClassName("registrations")).forEach(e => e.remove()); // remove old element
                        note.insertBefore(newReg, note.quickActions);

                        // registration form
                        const isReg = user !== null && comp.isRegistered(user.uid);
                        const newButton = ElementFactory.button().class("registration-button");
                        let icon:string, text:string, onClick:(ev:MouseEvent, self:HTMLButtonElement)=>void, disabled:boolean;
                        if (now > note.event.ends_at) [icon, text, onClick, disabled] = ["event_busy", "Activiteit is al voorbij", () => {}, true];
                        else if (now > note.event.starts_at) [icon, text, onClick, disabled] = ["calendar_today", "Activiteit is al gestart", () => {}, true];
                        else if (user === null) [icon, text, onClick, disabled] = ["login", "Log in om je in te schrijven", () => location.href = URLUtil.createLinkBackURL("./inloggen.html").toString(), false];
                        else if (isReg) { // is registered
                            if (canDeregister) [icon, text, onClick, disabled] = ["free_cancellation", "Uitschrijven", (_, self) => {
                                self.disabled = true;
                                comp.deregister(note.event)
                                .then(() => {
                                    UserFeedback.success("Je bent uitgeschreven!");
                                    applyComponents(note, ...components);
                                })
                                .catch(err => UserFeedback.error(getErrorMessage(err)))
                                .finally(() => self.disabled = false);
                            }, false];
                            else [icon, text, onClick, disabled] = ["event_available", "Ingeschreven", () => {}, true];
                        }
                        else if (canRegister) [icon, text, onClick, disabled] = ["calendar_add_on", "Inschrijven", (_, self) => {
                            self.disabled = true;
                            
                            comp.register(note.event, commentBox.value ? commentBox.value : undefined, formResponseGetters.map(f => f()))
                            .then(() => {
                                UserFeedback.success("Je staat ingeschreven!");
                                applyComponents(note, ...components);
                            })
                            .catch(err => UserFeedback.error(getErrorMessage(err)))
                            .finally(() => self.disabled = false);
                        }, false];
                        else [icon, text, onClick, disabled] = ["event_busy", "Inschrijving niet mogelijk", () => {}, true];
                        
                        let commentBox = ElementFactory.textarea()
                            .class("comment-box")
                            .attr("no-resize")
                            .placeholder("Opmerking...")
                            .maxLength(1024)
                            .spellcheck(true)
                            .make();

                        Array.from(note.getElementsByClassName("registration-form")).forEach(e => e.remove()); // remove old element
                        note.insertBefore(
                            ElementFactory.div(undefined, "registration-form", "flex-rows", "center-content", "in-section-gap")
                            .children(
                                !isReg && !disabled && commentBox,
                                newButton.children(
                                    ElementFactory.h4(icon).class("icon", "no-margin"),
                                    ElementFactory.h4(text).class("no-margin")
                                )
                                .attr("disabled", disabled ? "" : null)
                                .on("click", onClick)
                            )
                            .make(),
                            note.quickActions
                        );

                    }
                    else {
                        const regComp = comp;
                        let icon:string, tooltip:string;
                        function getIndicatorState():[string,string] {
                            const isReg = user !== null && regComp.isRegistered(user.uid);
                            if (now > note.event.ends_at) return ["event_busy", "Activiteit is al voorbij"];
                            else if (now > note.event.starts_at) return ["calendar_today", "Activiteit is al gestart"];
                            else if (isReg) return [canDeregister ? "free_cancellation" : "event_available", "Ingeschreven"];
                            else return ["calendar_add_on", "Open voor inschrijving!"];
                        }

                        const state = getIndicatorState();

                        note.appendChild(
                            ElementFactory.p(state[0])
                            .class("icon", "registration-indicator")
                            .tooltip(state[1])
                            .onMake(self => {
                                comp.onRegistrationsChanged = () => [self.textContent, self.title] = getIndicatorState();
                            })
                            .make()
                        );
                    }
                })
                .catch(err => console.error(err));
                
                
            }
            else if (comp instanceof EventInfo.Components.RegistrationStart) {
                if (now < comp.moment) { // is before registration period
                    if (note.lod >= DetailLevel.FULL) {
                        const regButton = note.getElementsByClassName("registration-button")[0];
                        const regForm = note.getElementsByClassName("registration-form")[0];

                        regButton.toggleAttribute("disabled", true);
                        regForm.childNodes.forEach(cn => {
                            if (cn !== regButton) cn.remove();
                        });
                        regButton.firstElementChild!.textContent = "calendar_clock";
                        regButton.lastElementChild!.textContent = `Inschrijven kan pas vanaf ${DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT_NO_YEAR(comp.moment)}`;
                    }
                    else {
                        const regIndicator = note.getElementsByClassName("registration-indicator")[0] as HTMLElement;

                        regIndicator.textContent = "calendar_clock";
                        regIndicator.title = `Inschrijven kan pas vanaf ${DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT_NO_YEAR(comp.moment)}`;
                    }
                }
            }
            else if (comp instanceof EventInfo.Components.RegistrationEnd) {
                if (note.event.starts_at > now && now > comp.moment) { // is between event start and registration end
                    if (note.lod >= DetailLevel.FULL) {
                        const regButton = note.getElementsByClassName("registration-button")[0];
                        const regForm = note.getElementsByClassName("registration-form")[0];
                        if (new Date() > comp.moment) {
                            regButton.toggleAttribute("disabled", true);
                            regForm.childNodes.forEach(cn => {
                                if (cn !== regButton) cn.remove();
                            });
                            regButton.firstElementChild!.textContent = "event_upcoming";
                            regButton.lastElementChild!.textContent = "Inschrijving is al gesloten";
                        }
                    }
                    else {
                        const regIndicator = note.getElementsByClassName("registration-indicator")[0] as HTMLElement;

                        regIndicator.textContent = "event_upcoming";
                        regIndicator.title = "Inschrijving is al gesloten";
                    }

                }
            }
            else if (comp instanceof EventInfo.Components.Form) {
                if (note.lod >= DetailLevel.FULL) {

                    const regButton = note.getElementsByClassName("registration-button")[0];
                    const regForm = note.getElementsByClassName("registration-form")[0];

                    if (!regButton.hasAttribute("disabled")) await onAuth()
                        .then(user => {
                            if (user && !note.event.getComponent(EventInfo.Components.Registerable)!.isRegistered(user.uid)) {
                                regForm.prepend(
                                    ElementFactory.div(undefined, "form-inputs", "flex-columns", "center-content", "min-section-gap")
                                    .children(
                                        ...comp.inputs.map(input => {
                                            switch (input.type) {
                                                case "select":
                                                    return ElementFactory.div(undefined, "flex-columns", "cross-axis-center", "in-section-gap")
                                                        .children(
                                                            ElementFactory.label(input.name + (input.required ? '*' : "")),
                                                            ElementFactory.select([...(input.required ? [] : [""]), ...input.options])
                                                            .value(input.required ? input.options[0] : "")
                                                            .onMake(self => formResponseGetters.push(() => {
                                                                return { type: input.type, name: input.name, value: self.value };
                                                            }))
                                                        )
                                                        .make()
                                                case "text":
                                                    return ElementFactory.div(undefined, "flex-columns", "cross-axis-center", "in-section-gap")
                                                        .children(
                                                            ElementFactory.label(input.name + (input.required ? '*' : "")),
                                                            ElementFactory.input.text()
                                                            .maxLength(input.maxLength)
                                                            .onValueChanged((curr, prev) => {
                                                                if (input.required) {
                                                                    if (curr && !prev) ElementUtil.enable(regButton); // empty to non-empty
                                                                    else if (prev && !curr) ElementUtil.disable(regButton); // non-empty to empty
                                                                }
                                                            })
                                                            .onMake(self => {
                                                                formResponseGetters.push(() => { return { type: input.type, name: input.name, value: self.value } });
                                                                if (input.required && self.value.length === 0) ElementUtil.disable(regButton);
                                                            })
                                                        )
                                                        .make()
                                            }
                                        })
                                    )
                                    .make()
                                );
                            }
                        });

                }
            }
            else if (comp instanceof EventInfo.Components.Cost) {
                if (note.lod >= DetailLevel.FULL) {
                    
                    const regForm = note.getElementsByClassName("registration-form")[0];
                    const regButton = note.getElementsByClassName("registration-button")[0];

                    if (regButton.hasAttribute("disabled")) {
                        regForm.prepend(ElementFactory.p(`De inschrijfkosten bedragen €${(comp.cost * .01).toFixed(2).replace('.', ',')}.`).make());
                    }
                    else await onAuth()
                        .then(user => {
                            if (user && !note.event.getComponent(EventInfo.Components.Registerable)!.isRegistered(user.uid)) {
                                let allowPaymentSwitch = new Switch(false, regButton);
            
                                regForm.insertBefore(
                                    ElementFactory.div(undefined, "payment-disclaimer", "flex-columns", "cross-axis-center", "min-section-gap")
                                    .children(
                                        ElementFactory.label(`Ik ga akkoord met de kosten van €${(comp.cost * .01).toFixed(2).replace('.', ',')} voor deze activiteit.`),
                                        ElementFactory.div(undefined, "icon-switch")
                                        .children(
                                            ElementFactory.p("euro_symbol").class("icon", "no-margin"),
                                            allowPaymentSwitch
                                        )
                                        .tooltip(`Kosten (€${(comp.cost * .01).toFixed(2).replace('.', ',')}) accepteren`)
                                    )
                                    .make(),
                                    regForm.getElementsByClassName("comment-box")[0]
                                );
                            }
                        });
                }
            }
            else console.error(`no applicator found for ${comp.Class.name}`);
        }

        Loading.markLoadEnd(note);
    }

    export namespace applyComponents {
        /** Order that components should be applied in */
        export const ORDER:Class<EventInfo.Component>[] = [
            EventInfo.Components.Color,
            EventInfo.Components.Registerable,
            EventInfo.Components.RegistrationStart,
            EventInfo.Components.RegistrationEnd,
            EventInfo.Components.Form,
            EventInfo.Components.Cost
        ];
    }
}

Loading.onDOMContentLoaded().then(() => customElements.define("event-note", EventNote));


/**
 * An EditableEventNote is a type of HTMLElement that allows the user to edit details
 * of an event more easily.
 */
export class EditableEventNote extends HTMLElement implements HasSections<EditableEventNote.SectionName> {

    public name!:HTMLHeadingElement;
    public category!:HTMLTextAreaElement;
    public useTime!:Switch;
    public startsAt!:HTMLInputElement;
    public endsAt!:HTMLInputElement;
    public description!:RichTextInput;
    public componentEditor!:EventComponentEditor;
    public quickActions!:HTMLDivElement;
    public saveButton!:HTMLElement;

    protected readonly originalEvent:EventInfo;
    protected readonly event:EventInfo;
    /** Replaces the EditableEventNote with its non-editable version. */
    protected replaceWithOriginal(event=this.event):void {
        this.replaceWith(new EventNote(event.copy(), this.lod, this.expanded));
    }

    protected get savableEvent() {
        let [startDate, endDate] = [this.startDate, this.endDate];
        if (startDate > endDate) { // put start and end moments right way around
            if (DateUtil.Timespans.areFullDays([startDate, endDate])) {
                endDate.setHours(0, 0, 0, 0);
                startDate.setHours(23, 59, 59, 999);
            }
            [startDate, endDate] = [endDate, startDate];
        }

        return new EventInfo(
            this.event.sourceDB,
            this.event.id,
            this.name.textContent ?? "Activiteit",
            this.description.value,
            this.category.value ? this.category.value : undefined,
            [startDate, endDate],
            this.event.components.map(c => c.copy())
        );
    }

    protected readonly lod:DetailLevel;
    protected readonly expanded:boolean;
    protected readonly saveAsNew:boolean;

    protected onSaveHandlers:((note:EditableEventNote)=>void)[] = [];
    public set onSave(newHandler:(note:EditableEventNote)=>void) {
        this.onSaveHandlers.push(newHandler);
    }

    private get startDate() {
        let out = new Date(this.startsAt.value);
        if (!DateUtil.Timestamps.isValid(out)) out = this.event.starts_at;

        if (!this.useTime.value) out.setHours(0, 0, 0, 0);
        
        return out;
    }

    private get endDate() {
        let out = new Date(this.endsAt.value);
        if (!DateUtil.Timestamps.isValid(out)) out = this.event.ends_at;
        
        if (!this.useTime.value) out.setHours(23, 59, 59, 999);
        
        return out;
    }

    constructor(event:EventInfo, lod=DetailLevel.MEDIUM, expanded=false, saveAsNew=false) {
        super();

        this.originalEvent = event.copy();
        this.event = event;
        this.lod = lod;
        this.expanded = expanded;
        this.saveAsNew = saveAsNew;

        this.initElement();

        window.addEventListener("beforeunload", ev => {
            if (document.body.contains(this) && !ev.defaultPrevented && !this.savableEvent.equals(this.event)) ev.preventDefault();
        });
        
    }

    private applyComponents() {
        // apply color palette
        const bgColorPromise = this.event.hasComponent(EventInfo.Components.Color) ?
            Promise.resolve(this.event.getComponent(EventInfo.Components.Color)!.bg) :
            ColorUtil.getStringColor(this.category.value || this.name.textContent!);
        
        bgColorPromise.then(bgColor => {
            this.style.setProperty("--background-color", bgColor);
            this.style.setProperty("--text-color", ColorUtil.getMostContrasting(bgColor, "#233452", "#ffffff"));

        });
    }

    initElement():void {
        this.classList.add("flex-rows");
        this.classList.toggle("min-section-gap", this.expanded);
        this.toggleAttribute("expanded", this.expanded);

        this.appendChild( // name and category sections
            ElementFactory.div(undefined, "flex-columns", "in-section-gap")
                .children(
                    this.name = ElementFactory.heading(this.expanded ? 1 : 5, this.event.name)
                        .class("name", "no-margin")
                        .attr("contenteditable", "plaintext-only")
                        .on("input", () => FunctionUtil.setDelayedCallback(() => this.applyComponents(), 250))
                        .make(),
                    this.category = ElementFactory.textarea(this.event.category)
                        .class("category")
                        .attr("no-resize")
                        .placeholder("Categorie")
                        .on("input", () => FunctionUtil.setDelayedCallback(() => this.applyComponents(), 250))
                        .make()
                )
                .make(),
        );

        // timespan section
        const areFullDays = DateUtil.Timespans.areFullDays([this.event.starts_at, this.event.ends_at]);
        this.appendChild(
            ElementFactory.div(undefined, "timespan", "flex-columns", "cross-axis-center", "in-section-gap")
                .children(
                    ElementFactory.div(undefined, "flex-columns", "main-axis-space-around", "cross-axis-center", "in-section-gap")
                        .children(
                            this.startsAt = areFullDays ?
                                ElementFactory.input.date(this.event.starts_at)
                                .on("input", () => this.event.starts_at = this.startDate)
                                .make() :
                                ElementFactory.input.dateTimeLocal(this.event.starts_at)
                                .on("input", () => this.event.starts_at = this.startDate)
                                .make(),
                            ElementFactory.p()
                                .class("no-margin")
                                .onMake(self => {
                                    Responsive.onChange(vp => self.textContent = Responsive.isSlimmerOrEq(Responsive.Viewport.SQUARE) ? '→' : "t/m", true);
                                }),
                            this.endsAt = areFullDays ?
                                ElementFactory.input.date(this.event.ends_at)
                                .on("input", () => this.event.ends_at = this.endDate)
                                .make() :
                                ElementFactory.input.dateTimeLocal(this.event.ends_at)
                                .on("input", () => this.event.ends_at = this.endDate)
                                .make()
                        ),
                    ElementFactory.div(undefined, "icon-switch")
                        .children(
                            ElementFactory.p("more_time").class("icon", "no-margin"),
                            this.useTime = new Switch(!areFullDays)
                        )
                        .tooltip("Tijd instellen")
                )
                .make()
        );

        this.useTime.addEventListener("input", () => { // update on switch
                                    
            const newSAInput = this.useTime.value ?
                ElementFactory.input.dateTimeLocal(this.startsAt.valueAsDate ?? this.event.starts_at)
                .on("input", () => this.event.starts_at = this.startDate)
                .make() :
                ElementFactory.input.date(this.startsAt.valueAsDate ?? this.event.starts_at)
                .on("input", () => this.event.starts_at = this.startDate)
                .make();
            this.startsAt.replaceWith(newSAInput);
            this.startsAt = newSAInput;

            const newEAInput = this.useTime.value ?
                ElementFactory.input.dateTimeLocal(this.endsAt.valueAsDate ?? this.event.ends_at)
                .on("input", () => this.event.ends_at = this.endDate)
                .make() :
                ElementFactory.input.date(this.endsAt.valueAsDate ?? this.event.ends_at)
                .on("input", () => this.event.ends_at = this.endDate)
                .make();
            this.endsAt.replaceWith(newEAInput);
            this.endsAt = newEAInput;
        });

        // description section
        this.description = this.appendChild(
            ElementFactory.input.richText(this.event.description, true)
                .class("description")
                .placeholder("Beschrijving")
                .make()
        );

        // component editor section
        this.componentEditor = this.appendChild(new EventComponentEditor(this.event));
        this.componentEditor.classList.add("component-editor");
        this.componentEditor.addEventListener("change", () => this.applyComponents());
        this.componentEditor.addEventListener("input", () => this.applyComponents());

        // quick-actions section
        this.quickActions = this.appendChild(
            ElementFactory.div(undefined, "quick-actions", "flex-columns")
                .children(
                    this.saveButton = ElementFactory.iconButton(this.saveAsNew ? "calendar_add_on" : "save_as", () => {
                        const newEvent = this.savableEvent;

                        this.event.sourceDB.write(newEvent)
                        .then(() => {
                            if (this.saveAsNew) UserFeedback.success("Activiteit is succesvol toegevoegd.");
                            else UserFeedback.success("Activiteit is succesvol bijgewerkt.");
                            for (const handler of this.onSaveHandlers) handler(this);
                            this.replaceWithOriginal(newEvent);
                        })
                        .catch(err => UserFeedback.error(getErrorMessage(err)));
                    }, this.saveAsNew ? "Activiteit toevoegen" : "Aanpassingen opslaan").make(),
                    !this.saveAsNew && ElementFactory.iconButton("backspace", () => this.replaceWithOriginal(this.originalEvent), "Annuleren")
                        .class("cancel-edit-button")
                )
                .make()
        );
        
        this.applyComponents();
    }

}

export namespace EditableEventNote {

    export type SectionName = "name" | "category" | "useTime" | "startsAt" | "endsAt" | "description" | "componentEditor" | "quickActions" | "saveButton";

    export type OptionMap = {
        "color": ColorUtil.HexColor
    };

}

Loading.onDOMContentLoaded().then(() => customElements.define("editable-event-note", EditableEventNote));