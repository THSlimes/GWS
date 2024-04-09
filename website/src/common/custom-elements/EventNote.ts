import writeXlsxFile from 'write-excel-file'

import { EventComment, EventInfo, RegisterableEventInfo } from "../firebase/database/events/EventDatabase";
import { HasSections } from "../util/UtilTypes";
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
import OptionCollection from "../ui/OptionCollection";
import DateUtil from "../util/DateUtil";
import ObjectUtil from "../util/ObjectUtil";
import URLUtil from "../util/URLUtil";
import Switch from "./Switch";
import Responsive from "../ui/Responsive";
import UserFeedback from "../ui/UserFeedback";
import ElementUtil from "../util/ElementUtil";
import EventDatabaseFactory from "../firebase/database/events/EventDatabaseFactory";
import NumberUtil from "../util/NumberUtil";
import Loading from "../Loading";


export class EventNote extends HTMLElement implements HasSections<EventNote.SectionName> {

    private static permissionsQueried = false;
    private static permissionsQueriedHandlers:VoidFunction[] = [];
    protected static CAN_DELETE = false;
    protected static CAN_UPDATE = false;
    protected static onPermissionsQueried():Promise<void> {
        return new Promise(resolve => {
            if (this.permissionsQueried) resolve(); // already done
            else this.permissionsQueriedHandlers.push(resolve); // called in static block
        });
    }

    static {
        onPermissionCheck([Permissions.Permission.DELETE_EVENTS, Permissions.Permission.UPDATE_EVENTS], (_, res) => {
            this.CAN_DELETE = res.DELETE_EVENTS;
            this.CAN_UPDATE = res.UPDATE_EVENTS;
            this.permissionsQueried = true;
            for (const h of this.permissionsQueriedHandlers) h(); // resolved waiting promises
        }, true, true);
    }
    
    protected static SECTIONS_VISIBLE_FROM:Record<EventNote.SectionName,DetailLevel> = {
        name: DetailLevel.LOW,
        timespan: DetailLevel.MEDIUM,
        description: DetailLevel.HIGH,
        quickActions: DetailLevel.HIGH
    };

    protected isVisible(sectionName:EventNote.SectionName):boolean {
        const ownClass = (this.constructor as typeof EventNote);
        return ownClass.SECTIONS_VISIBLE_FROM[sectionName] <= this.lod;
    }

    public name!:HTMLHeadingElement;
    public timespan!:HTMLParagraphElement;
    public description!:HTMLDivElement;
    public quickActions!:HTMLDivElement;

    protected readonly expanded:boolean;
    private _lod!:DetailLevel;
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

    public event!:EventInfo;
    /** Replaces the EventNote with its editable version. */
    protected replaceWithEditable(event=this.event):void {
        this.replaceWith(new EditableEventNote(event, this.lod, this.expanded));
    }

    constructor(event:EventInfo, lod=DetailLevel.MEDIUM, expanded=false) {
        super();

        this.expanded = this.hasAttribute("expanded") || expanded;

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
            })
            .catch(console.error);
        }
        else {
            this.event = event;
            this.initElement();
            this.lod = NumberUtil.clamp(ElementUtil.getAttrAsNumber(this, "lod", false) ?? lod, DetailLevel.LOW, DetailLevel.FULL);
        }

    }

    initElement():void {
        this.classList.add("flex-rows");
        this.classList.toggle("min-section-gap", this.expanded);
        this.toggleAttribute("expanded", this.expanded);

        // apply color palette
        const bgColor = this.event.color ?? ColorUtil.getStringColor(this.event.category);
        this.style.setProperty("--background-color", bgColor);
        this.style.setProperty("--text-color", ColorUtil.getMostContrasting(bgColor, "#233452", "#ffffff"));

        // name section
        this.name = ElementFactory.heading(this.expanded ? 1 : 5, this.event.name).class("name", "no-margin").make();

        // timespan section
        let timespanText:string;
        if (this.expanded) { // include year
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
                    EventNote.CAN_UPDATE && ElementFactory.iconButton("edit_square", () => this.replaceWithEditable(this.event), "Activiteit bewerken"),
                    ElementFactory.iconButton("share", () => {
                            const url = `${location.origin}/calendar.html#id=${this.event.id}`;
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

    public copy(lod:DetailLevel=this._lod, expanded:boolean=this.expanded) {
        return new EventNote(this.event, lod ?? this.lod, expanded ?? this.expanded);
    }

}

export namespace EventNote {
    export type SectionName = "name" | "timespan" | "description" | "quickActions";
}

Loading.onDOMContentLoaded().then(() => customElements.define("event-note", EventNote));



export class EditableEventNote extends HTMLElement implements HasSections<EditableEventNote.SectionName> {

    public name!:HTMLHeadingElement;
    public category!:HTMLTextAreaElement;
    public useTime!:Switch;
    public startsAt!:HTMLInputElement;
    public endsAt!:HTMLInputElement;
    public description!:RichTextInput;
    public quickActions!:HTMLDivElement;
    public saveButton!:HTMLElement;

    private optionCollection:OptionCollection<string,{}> = new OptionCollection({});
    protected addOptions(newOptions:OptionCollection<string,any>) {
        const combined = this.optionCollection.combine(newOptions);
        this.optionCollection.replaceWith(combined);
        this.optionCollection = combined;
    }
    protected hideOptions(...optionNames:string[]) {
        for (const optionName of optionNames) this.optionCollection.hide(optionName);
    }

    private noteOptions!:OptionCollection<keyof EditableEventNote.OptionMap, EditableEventNote.OptionMap>;

    protected readonly event:EventInfo;
    /** Replaces the EditableEventNote with its non-editable version. */
    protected replaceWithOriginal(event=this.event):void {
        this.replaceWith(new EventNote(event, this.lod, this.expanded));
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
            this.noteOptions.has("color") ? this.noteOptions.get("color")! : undefined,
            [startDate, endDate]
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

    private refreshColorPalette() {
        // apply color palette
        const bgColor = this.noteOptions.has("color") ? this.noteOptions.get("color")! : ColorUtil.getStringColor(this.category.value);
        this.style.setProperty("--background-color", bgColor);
        this.style.setProperty("--text-color", ColorUtil.getMostContrasting(bgColor, "#233452", "#ffffff"));
    }

    constructor(event:EventInfo, lod=DetailLevel.MEDIUM, expanded=false, saveAsNew=false) {
        super();

        this.event = event;
        this.lod = lod;
        this.expanded = expanded;
        this.saveAsNew = saveAsNew;

        this.initElement();

        window.addEventListener("beforeunload", ev => {
            if (document.body.contains(this) && !ev.defaultPrevented && !this.savableEvent.equals(this.event)) ev.preventDefault();
        });
        
    }

    initElement():void {
        this.classList.add("flex-rows");
        this.classList.toggle("min-section-gap", this.expanded);
        this.toggleAttribute("expanded", this.expanded);

        const refreshColorCallback = () => this.refreshColorPalette();

        this.appendChild( // name and category sections
            ElementFactory.div(undefined, "flex-columns", "in-section-gap")
                .children(
                    this.name = ElementFactory.heading(this.expanded ? 1 : 5, this.event.name)
                        .class("name", "no-margin")
                        .attr("contenteditable", "plaintext-only")
                        .make(),
                    this.category = ElementFactory.textarea(this.event.category)
                        .class("category")
                        .attr("no-resize")
                        .placeholder("Categorie")
                        .on("input", () => FunctionUtil.setDelayedCallback(refreshColorCallback, 250))
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
                                ElementFactory.input.date(this.event.starts_at).make() :
                                ElementFactory.input.dateTimeLocal(this.event.starts_at).make(),
                            ElementFactory.p()
                                .class("no-margin")
                                .onMake(self => {
                                    Responsive.onChange(vp => self.textContent = Responsive.isSlimmerOrEq(Responsive.Viewport.SQUARE) ? '→' : "t/m", true);
                                }),
                            this.endsAt = areFullDays ?
                                ElementFactory.input.date(this.event.ends_at).make() :
                                ElementFactory.input.dateTimeLocal(this.event.ends_at).make()
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
                ElementFactory.input.dateTimeLocal(this.startsAt.valueAsDate ?? this.event.starts_at).make() :
                ElementFactory.input.date(this.startsAt.valueAsDate ?? this.event.starts_at).make();
            this.startsAt.replaceWith(newSAInput);
            this.startsAt = newSAInput;

            const newEAInput = this.useTime.value ?
                ElementFactory.input.dateTimeLocal(this.endsAt.valueAsDate ?? this.event.ends_at).make() :
                ElementFactory.input.date(this.endsAt.valueAsDate ?? this.event.ends_at).make();
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

        // options
        this.appendChild(this.optionCollection);

        this.noteOptions = new OptionCollection<keyof EditableEventNote.OptionMap, EditableEventNote.OptionMap>({
            "color": [
                "palette",
                ElementFactory.div(undefined, "center-content", "in-section-gap")
                    .children(
                        ElementFactory.h4("Kleurenpalet instellen").class("no-margin"),
                        ElementFactory.input.color(this.event.color ?? "#eeeeee")
                        .onValueChanged(() => this.refreshColorPalette()),
                    )
                    .make(),
                elem => (elem.lastChild as HTMLInputElement).value as ColorUtil.HexColor
            ]
        }, { "color": "Achtergrondkleur" });
        if (this.event.color !== undefined) this.noteOptions.add("color");

        this.noteOptions.onActiveOptionsChanged = () => this.refreshColorPalette();

        this.addOptions(this.noteOptions);

        this.refreshColorPalette();

        // quick-actions section
        this.quickActions = this.appendChild(
            ElementFactory.div(undefined, "quick-actions", "flex-columns")
                .children(
                    this.saveButton = ElementFactory.iconButton(this.saveAsNew ? "calendar_add_on" : "save_as", () => {
                        const newEvent = this.savableEvent;

                        this.event.sourceDB.write(newEvent)
                        .then(() => {
                            UserFeedback.success("Activiteit is succesvol bijgewerkt.");
                            for (const handler of this.onSaveHandlers) handler(this);
                            this.replaceWithOriginal(newEvent);
                        })
                        .catch(err => UserFeedback.error(getErrorMessage(err)));
                    }, this.saveAsNew ? "Activiteit toevoegen" : "Aanpassingen opslaan").make(),
                    !this.saveAsNew && ElementFactory.iconButton("backspace", () => this.replaceWithOriginal(), "Annuleren")
                        .class("cancel-edit-button")
                )
                .make()
        );

        if (this.saveAsNew) {
            const regOption = new OptionCollection(
                {"registerable": ["how_to_reg", ElementFactory.h4("Inschrijfbaar voor leden").class("text-center", "no-margin").make(), () => undefined]},
                { "registerable": "Inschrijfbaar voor leden" }
            );
            regOption.onActiveOptionsChanged = () => {
                if (regOption.has("registerable")) {
                    const replacement = new EditableRegisterableEventNote(
                        RegisterableEventInfo.fromSuper(this.savableEvent, {}, false, undefined, [undefined, undefined]),
                        this.lod, this.expanded, this.saveAsNew
                    );
                    [replacement.id, replacement.className] = [this.id, this.className];
                    for (const handler of this.onSaveHandlers) replacement.onSave = handler;

                    this.replaceWith(replacement);
                }
            }

            this.addOptions(regOption);
        }
    }

}

export namespace EditableEventNote {

    export type SectionName = "name" | "category" | "useTime" | "startsAt" | "endsAt" | "description" | "quickActions" | "saveButton";

    export type OptionMap = {
        "color": ColorUtil.HexColor
    };

}

Loading.onDOMContentLoaded().then(() => customElements.define("editable-event-note", EditableEventNote));



export class RegisterableEventNote extends EventNote implements HasSections<RegisterableEventNote.SectionName> {

    private static registrationPermissionsQueried = false;
    private static registrationsPermissionsQueriedHandlers:VoidFunction[] = [];
    private static CAN_REGISTER = false;
    private static CAN_DEREGISTER = false;
    private static CAN_READ_COMMENTS = false;
    private static onRegistrationPermissionsQueried():Promise<void> {
        return new Promise(resolve => {
            if (this.registrationPermissionsQueried) resolve(); // already done
            else this.registrationsPermissionsQueriedHandlers.push(resolve);
        });
    }

    static {
        onPermissionCheck([Permissions.Permission.REGISTER_FOR_EVENTS, Permissions.Permission.DEREGISTER_FOR_EVENTS, Permissions.Permission.READ_EVENT_COMMENTS], (_, res) => {
            this.CAN_REGISTER = res.REGISTER_FOR_EVENTS;
            this.CAN_DEREGISTER = res.DEREGISTER_FOR_EVENTS;
            this.CAN_READ_COMMENTS = res.READ_EVENT_COMMENTS;
            EventNote.onPermissionsQueried()
            .then(() => {
                this.registrationPermissionsQueried = true;
                for (const h of this.registrationsPermissionsQueriedHandlers) h(); // resolve promises
            });
        }, true, true);
    }

    protected static override SECTIONS_VISIBLE_FROM: Record<RegisterableEventNote.SectionName, DetailLevel> = {
        ...super.SECTIONS_VISIBLE_FROM,
        registrations: DetailLevel.HIGH,
        paymentDisclaimer: DetailLevel.FULL,
        allowPaymentSwitch: DetailLevel.FULL,
        commentBox: DetailLevel.FULL,
        registerButton: DetailLevel.FULL
    };

    protected override isVisible(sectionName: RegisterableEventNote.SectionName): boolean {
        return RegisterableEventNote.SECTIONS_VISIBLE_FROM[sectionName] <= this.lod;
    }

    public registrations!: HTMLDivElement;
    public paymentDisclaimer!: HTMLDivElement | null;
    public allowPaymentSwitch!: Switch | null;
    public registerButton!: HTMLButtonElement;
    public commentBox!: HTMLTextAreaElement;

    private refreshRegistrationDetails() {
        RegisterableEventNote.onRegistrationPermissionsQueried()
        .then(() => onAuth())
        .then(user => {
            const allowsPayment = !this.allowPaymentSwitch || this.allowPaymentSwitch.value;
            const isRegistered = user !== null && this.event.isRegistered(user.uid);
            let state: RegisterableEventNote.ButtonState;
            const now = new Date();

            if (!user) state = ["login", "Log in om je in te schrijven", true, false];
            else {
                if (this.event.ends_at <= now) state = ["event_busy", "Activiteit is al voorbij", false, false];
                else if (this.event.starts_at <= now) state = ["calendar_today", "Activiteit is al gestart", false, false];
                else if (this.event.can_register_until && this.event.can_register_until <= now) {
                    state = ["event_upcoming", "Inschrijving is al gesloten", false, false];
                }
                else if (this.event.can_register_from && now <= this.event.can_register_from) {
                    state = ["calendar_clock", `Inschrijven kan pas vanaf ${DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT_NO_YEAR(this.event.can_register_from)}`, false, false];
                }
                else if (isRegistered) state = RegisterableEventNote.CAN_DEREGISTER ?
                    ["free_cancellation", "Uitschrijven", true, false] :
                    ["event_available", "Ingeschreven", false, false];
                else if (this.event.isFull()) state = ["event_busy", "Activiteit zit vol", false, false];
                else state = RegisterableEventNote.CAN_REGISTER ?
                    ["calendar_add_on", "Inschrijven", allowsPayment, true] :
                    ["event_busy", "Inschrijving niet mogelijk", false, false];
            }

            [this.registerButton.firstElementChild!.textContent, this.registerButton.children[1].textContent] = state;
            this.registerButton.disabled = !state[2];

            if (this.paymentDisclaimer && this.isVisible("paymentDisclaimer")) this.paymentDisclaimer.hidden = !state[3];
            if (this.isVisible("commentBox")) this.commentBox.hidden = !state[3];
            this.registrations.hidden ||= ObjectUtil.sizeOf(this.event.registrations) === 0;

            const spacesLeft = (this.event.capacity ?? 0) - ObjectUtil.sizeOf(this.event.registrations);
            const commentsPromise = RegisterableEventNote.CAN_READ_COMMENTS ? this.event.getComments() : new Promise<Record<string,EventComment>>(resolve => resolve({}));
            
            commentsPromise.then(comments => {
                const newRegistrations = ElementFactory.div(undefined, "registrations", "flex-rows", "in-section-gap")
                    .children(
                        ElementFactory.div(undefined, "flex-columns", "cross-axis-center", "in-section-gap")
                            .children(
                                ElementFactory.heading(this.expanded ? 3 : 4, "Ingeschreven geitjes")
                                    .children((spacesLeft > 0 && state[3]) && ElementFactory.span(` (${spacesLeft} plekken over)`).class("subtitle"))
                                    .class("no-margin"),
                                RegisterableEventNote.CAN_READ_COMMENTS && ElementFactory.iconButton("download", () => { // create xlsx file and download it
                                    const headerRow = [
                                        { value: "Naam" },
                                        { value: "Inschrijfmoment" },
                                        { value: "Opmerking" }
                                    ];

                                    let maxNameLength = headerRow[0].value.length;
                                    let maxCommentLength = headerRow[2].value.length;

                                    const data = ObjectUtil.mapToArray(this.event.registrations, (id, name) => {
                                        maxNameLength = Math.max(maxNameLength, name.length);
                                        if (id in comments) {
                                            maxCommentLength = Math.max(maxCommentLength, comments[id].body.length);
                                            return [
                                                {
                                                    type: String,
                                                    value: name,
                                                },
                                                {
                                                    type: Date,
                                                    value: comments[id].created_at,
                                                    format: "d mmmm yyyy",
                                                },
                                                {
                                                    type: String,
                                                    value: comments[id].body
                                                }
                                            ];
                                        }
                                        else return [ { type: String, value: name } ];
                                    });

                                    writeXlsxFile([
                                        headerRow,
                                        ...data
                                    ], {
                                        columns: [{ width: maxNameLength }, { width: 15 }, { width: maxCommentLength }],
                                        fileName: `inschrijvingen ${this.event.name} (${DateUtil.DATE_FORMATS.DAY.SHORT_NO_YEAR(this.event.starts_at)}).xlsx`
                                    })
                                    .catch(err => console.error(err));
                                }, "Inschrijvingen downloaden")
                            ),
                        ElementFactory.div()
                            .class("registrations-list", "no-margin")
                            .children(
                                ...ObjectUtil.mapToArray(this.event.registrations, (id, name) => {
                                    const comment = id in comments ? comments[id] : undefined;
                                    const commentText = id in comments ? `${name}:\n${comments[id].body} \n\n${DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT_NO_YEAR(comments[id].created_at)}` : "";
                                    return ElementFactory.div(undefined, "flex-columns", "cross-axis-center", "in-section-gap")
                                        .children(
                                            ElementFactory.p(name).class("no-margin"),
                                            (id in comments) && ElementFactory.iconButton("comment", () => navigator.clipboard.writeText(commentText)
                                                .then(() => UserFeedback.success("Opmerking gekopieerd."))
                                                .catch(() => UserFeedback.error("Kon opmerking niet kopiëren, probeer het later opnieuw."))
                                            )
                                            .class("comment")
                                            .tooltip(commentText)
                                        )
                                    }
                                )
                            )
                            .make()
                    )
                    .make();
                
                this.registrations.replaceWith(newRegistrations);
                newRegistrations.hidden = this.registrations.hidden;
                this.registrations = newRegistrations;

            })
            .catch(console.error);
        })
        .catch(console.error);
    }

    override event!: RegisterableEventInfo;
    protected override replaceWithEditable(event = this.event): void {
        this.replaceWith(new EditableRegisterableEventNote(event, this.lod, this.expanded));
    }

    constructor(regEvent: RegisterableEventInfo, lod = DetailLevel.MEDIUM, expanded = false) {
        super(regEvent, lod, expanded);

        // refresh at registration start
        if (this.event.can_register_from && this.event.can_register_from.getTime() > Date.now()) setTimeout(() => {
            this.refreshRegistrationDetails();
        }, this.event.can_register_from.getTime() - Date.now());
        // refresh at registration end
        const regEnd = this.event.can_register_until ?? this.event.starts_at;
        if (regEnd.getTime() > Date.now()) setTimeout(() => this.refreshRegistrationDetails(), regEnd.getTime() - Date.now());
    }

    public override initElement(): void {
        super.initElement();

        // registrations
        this.registrations = this.appendChild(ElementFactory.div().make());

        this.appendChild( // registration info
            ElementFactory.div(undefined, "flex-rows", "cross-axis-center", "in-section-gap")
                .children(
                    // payment disclaimer section
                    (this.event.requires_payment === true) && (this.paymentDisclaimer = this.appendChild(
                        ElementFactory.div(undefined, "payment-disclaimer", "flex-columns", "cross-axis-center", "in-section-gap")
                            .children(
                                ElementFactory.p("Ik ga akkoord met de kosten van deze activiteit.").class("no-margin"),
                                ElementFactory.div(undefined, "icon-switch")
                                    .children(
                                        ElementFactory.p("euro_symbol").class("icon", "no-margin"),
                                        this.allowPaymentSwitch = new Switch(false)
                                    )
                                    .tooltip("Kosten accepteren")
                            )
                            .make()
                    )),
                    // comment box
                    this.commentBox = ElementFactory.textarea()
                        .class("comment-box")
                        .placeholder("Opmerking")
                        .attr("no-resize")
                        .spellcheck(true)
                        .maxLength(512)
                        .make(),
                    // register button
                    this.registerButton = ElementFactory.button(() => onAuth()
                        .then(user => {
                            if (!user) location.href = URLUtil.createLinkBackURL("./login.html").toString(); // must log in to register
                            else this.event.toggleRegistered(user.uid, this.commentBox.value)
                                .then(isReg => {
                                    UserFeedback.success(`Je bent succesvol ${isReg ? "ingeschreven" : "uitgeschreven"}.`);
                                    this.refreshRegistrationDetails();
                                })
                                .catch(err => UserFeedback.error(getErrorMessage(err)));
                        })
                        .catch(err => UserFeedback.error(getErrorMessage(err)))
                    )
                    .class("register-button")
                    .attr("no-select")
                    .children(ElementFactory.h4("event").class("icon"), ElementFactory.h4("Inschrijven"))
                    .make()
                )
                .make()
        );

        if (this.allowPaymentSwitch) this.allowPaymentSwitch.addEventListener("input", () => this.refreshRegistrationDetails());
        this.refreshRegistrationDetails();
    }

    public override copy(lod?: DetailLevel, expanded?: boolean): RegisterableEventNote {
        return new RegisterableEventNote(this.event, lod ?? this.lod, expanded ?? this.expanded);
    }

}

export namespace RegisterableEventNote {
    export type SectionName = EventNote.SectionName | "registrations" | "paymentDisclaimer" | "allowPaymentSwitch" | "registerButton" | "commentBox";
    
    /** [icon, text, enabled, show extra options] tuple */
    export type ButtonState = [string, string, boolean, boolean];
}

customElements.define("registerable-event-note", RegisterableEventNote);



export class EditableRegisterableEventNote extends EditableEventNote implements HasSections<EditableRegisterableEventNote.SectionName> {

    private registrationOptions!: OptionCollection<keyof EditableRegisterableEventNote.OptionMap, EditableRegisterableEventNote.OptionMap>;

    protected override event!: RegisterableEventInfo;
    protected override get savableEvent(): RegisterableEventInfo {
        // put registration bounds right way around
        let [canRegisterFrom, canRegisterUntil] = [this.registrationOptions.get("canRegisterFrom"), this.registrationOptions.get("canRegisterUntil")];
        if (canRegisterFrom !== undefined && canRegisterUntil !== undefined && canRegisterFrom > canRegisterUntil) {
            [canRegisterFrom, canRegisterUntil] = [canRegisterUntil, canRegisterFrom];
        }

        return RegisterableEventInfo.fromSuper(
            super.savableEvent,
            this.event.registrations,
            this.registrationOptions.get("requiresPayment") ?? false,
            this.registrationOptions.has("capacity") ? Math.max(ObjectUtil.sizeOf(this.event.registrations), this.registrationOptions.get("capacity")!) : undefined,
            [canRegisterFrom, canRegisterUntil]
        );
    }

    protected override replaceWithOriginal(regEvent = this.event): void {
        this.replaceWith(new RegisterableEventNote(regEvent, this.lod, this.expanded));
    }

    constructor(regEvent: RegisterableEventInfo, lod = DetailLevel.MEDIUM, expanded = false, saveAsNew?: boolean) {
        super(regEvent, lod, expanded, saveAsNew);
    }

    public override initElement(): void {
        super.initElement();

        this.registrationOptions = new OptionCollection({
            "capacity": [
                "social_distance",
                ElementFactory.div(undefined, "center-content", "in-section-gap")
                    .children(
                        ElementFactory.h4("Maximaal aantal inschrijvingen").class("no-margin"),
                        ElementFactory.input.number(Math.max(1, this.event.capacity ?? 0, ObjectUtil.sizeOf(this.event.registrations)))
                            .min(Math.max(1, ObjectUtil.sizeOf(this.event.registrations)))
                            .step(1)
                            .style({ "width": "4em" })
                    )
                    .make(),
                elem => {
                    const input = elem.lastChild as HTMLInputElement;
                    return input.value ? input.valueAsNumber : 0;
                }
            ],
            "canRegisterFrom": [
                "line_start_square",
                ElementFactory.div(undefined, "center-content", "in-section-gap")
                    .children(
                        ElementFactory.h4("Inschrijving kan vanaf").class("no-margin"),
                        ElementFactory.input.dateTimeLocal(this.event.can_register_from ?? new Date())
                    )
                    .make(),
                elem => {
                    const date = new Date((elem.lastChild as HTMLInputElement).value);
                    return DateUtil.Timestamps.isValid(date) ? date : new Date();
                }
            ],
            "canRegisterUntil": [
                "line_end_square",
                ElementFactory.div(undefined, "center-content", "in-section-gap")
                    .children(
                        ElementFactory.h4("Inschrijving kan t/m").class("no-margin"),
                        ElementFactory.input.dateTimeLocal(this.event.can_register_until ?? this.event.starts_at)
                    )
                    .make(),
                elem => {
                    const date = new Date((elem.lastChild as HTMLInputElement).value);
                    return DateUtil.Timestamps.isValid(date) ? date : this.event.starts_at;
                }
            ],
            "requiresPayment": ["euro_symbol", ElementFactory.h4("Activiteit kost geld").class("text-center", "no-margin").make(), () => true],
        }, {
            "capacity": "Maximaal aantal inschrijvingen",
            "canRegisterFrom": "Startmoment voor inschrijving",
            "canRegisterUntil": "Eindmoment voor inschrijving",
            "requiresPayment": "Activiteit kost geld"
        });

        if (this.event.requires_payment) this.registrationOptions.add("requiresPayment");
        if (this.event.can_register_from !== undefined) this.registrationOptions.add("canRegisterFrom");
        if (this.event.can_register_until !== undefined) this.registrationOptions.add("canRegisterUntil");
        if (this.event.capacity !== undefined) this.registrationOptions.add("capacity");

        this.addOptions(this.registrationOptions);

        this.querySelector("option-collection")!.prepend(
            ElementFactory.div(undefined, "option", "flex-columns", "cross-axis-center", "in-section-gap")
                .children(
                    ElementFactory.p("how_to_reg").class("icon"),
                    ElementFactory.h4("Inschrijfbaar voor leden").class("no-margin").style({ "textAlign": "center" }),
                    this.saveAsNew ?
                        ElementFactory.iconButton("remove", () => {
                            const replacement = new EditableEventNote(this.savableEvent, this.lod, this.expanded, this.saveAsNew);
                            [replacement.id, replacement.className] = [this.id, this.className];
                            for (const handler of this.onSaveHandlers) replacement.onSave = handler;

                            this.replaceWith(replacement);
                        }, "Instelling weghalen") :
                        ElementFactory.p("done").class("icon")
                )
                .make()
        );

        this.hideOptions("registerable");
    }

}

export namespace EditableRegisterableEventNote {
    export type SectionName = EditableEventNote.SectionName;

    export type OptionMap = {
        capacity: number;
        canRegisterFrom: Date;
        canRegisterUntil: Date;
        requiresPayment: boolean;
    };
}

Loading.onDOMContentLoaded().then(() => customElements.define("editable-registerable-event-note", EditableRegisterableEventNote));