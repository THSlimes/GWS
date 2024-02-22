import ElementFactory from "../html-element-factory/ElementFactory";
import { EventInfo, RegisterableEventInfo } from "../firebase/database/events/EventDatabase";
import { showError, showSuccess, showWarning } from "../ui/info-messages";
import { HasSections } from "../util/ElementUtil";
import getErrorMessage from "../firebase/authentication/error-messages";
import { onAuth } from "../firebase/init-firebase";
import ColorUtil from "../util/ColorUtil";
import DateUtil from "../util/DateUtil";
import { onPermissionCheck } from "../firebase/authentication/permission-based-redirect";
import Permission from "../firebase/database/Permission";
import EventCalendar from "./EventCalendar";
import URLUtil from "../util/URLUtil";
import Switch from "./Switch";
import { HexColor } from "../util/StyleUtil";
import FunctionUtil from "../util/FunctionUtil";
import RichTextInput from "./rich-text/RichTextInput";
import RichTextSerializer from "./rich-text/RichTextSerializer";

/** Amount of detail present in an EventNote element. */
export type DetailLevel = "full" | "high" | "normal" | "low";
type EventNoteSection = "name" | "timespan" | "description" | "paymentDisclaimer" | "allowsPaymentSwitch"| "commentBox" | "registerButton" | "quickActions";
const ALL_EVENT_NOTE_SECTIONS:EventNoteSection[] = ["name", "timespan", "description", "paymentDisclaimer", "allowsPaymentSwitch", "commentBox", "registerButton", "quickActions"];
const VISIBLE_AT_LOD:Record<DetailLevel, EventNoteSection[]> = {
    full: ["name", "timespan", "description", "paymentDisclaimer", "allowsPaymentSwitch", "commentBox", "registerButton", "quickActions"],
    high: ["name", "timespan", "description", "quickActions"],
    normal: ["name", "timespan"],
    low: ["name"]
};

export class EventNote extends HTMLElement implements HasSections<EventNoteSection> {

    protected static CAN_DELETE = false;
    protected static CAN_UPDATE = false;
    protected static CAN_REGISTER = false;
    protected static CAN_DEREGISTER = false;

    static {
        onPermissionCheck([Permission.DELETE_EVENTS, Permission.UPDATE_EVENTS, Permission.REGISTER_FOR_EVENTS, Permission.DEREGISTER_FOR_EVENTS], (_, res) => {
            this.CAN_DELETE = res.DELETE_EVENTS;
            this.CAN_UPDATE = res.UPDATE_EVENTS;
            this.CAN_REGISTER = res.REGISTER_FOR_EVENTS;
            this.CAN_DEREGISTER = res.DEREGISTER_FOR_EVENTS;
        }, true, true);
    }

    /** Gives a [text,icon,disabled] button state based on the events state. */
    private refreshRegisterButton() {
        if (this.event instanceof RegisterableEventInfo) {
            const regEvent = this.event;
            
            onAuth()
            .then(user => {
                const isLoggedIn = user !== null;
                const isRegistered = user !== null && regEvent.isRegistered(user.uid);
                const allowsPayment = !regEvent.requires_payment || isRegistered || this.allowsPaymentSwitch!.value;

                let state:[string,string,boolean];

                const now = new Date();
                if (regEvent.ends_at <= now) state = ["event_busy", "Activiteit is al voorbij", true]; // already ended
                else if (regEvent.starts_at <= now) state = ["calendar_today", "Activiteit is al gestart", true]; // already started
                else if (regEvent.can_register_from && now < regEvent.can_register_from) { // before registration period
                    state = ["calendar_clock", `Inschrijving start op ${DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT_NO_YEAR(regEvent.can_register_from)}`, true];
                }
                else if (regEvent.can_register_until && regEvent.can_register_until < now) { // after registration period
                    state = ["event_upcoming", "Inschrijving is gesloten", true];
                }
                else if (isRegistered) state = EventNote.CAN_DEREGISTER ?
                    ["free_cancellation", "Uitschrijven", !allowsPayment] :
                    ["event_available", "Ingeschreven", true];
                else if (regEvent.isFull()) state = ["event_busy", "Activiteit zit vol", true];
                else if (!isLoggedIn) state = ["login", "Log in om je in te schrijven.", false];
                else state = EventNote.CAN_REGISTER ?
                    ["calendar_add_on", "Inschrijven", !allowsPayment] :
                    ["event_busy", "Inschrijving niet mogelijk", true];

                this.registerButton!.firstChild!.textContent = state[0];
                this.registerButton!.children[1]!.textContent = state[1];
                this.registerButton!.disabled = state[2];

                if (this.paymentDisclaimer && VISIBLE_AT_LOD[this.lod].includes("paymentDisclaimer")) this.paymentDisclaimer.hidden = isRegistered;
                if (this.commentBox && VISIBLE_AT_LOD[this.lod].includes("commentBox")) this.commentBox.hidden = isRegistered;
            })
            .catch(console.error);
        }

    }

    public readonly event:EventInfo;
    private _lod:DetailLevel;
    public set lod(newLod:DetailLevel) {
        this._lod = newLod;
        this.setAttribute("detail", newLod);
        const visibleSections = VISIBLE_AT_LOD[newLod];
        
        for (const sectionName of ALL_EVENT_NOTE_SECTIONS) {
            const elem = this[sectionName];
            if (elem) elem.hidden = !visibleSections.includes(sectionName);
        }
    }
    public get lod() { return this._lod; }
    protected readonly expanded:boolean;

    public name:HTMLElement|null = null;
    public timespan:HTMLElement|null = null;
    public description:HTMLElement|null = null;
    public paymentDisclaimer:HTMLDivElement|null = null;
    public allowsPaymentSwitch:Switch|null = null;
    public commentBox:HTMLTextAreaElement|null = null;
    public registerButton:HTMLButtonElement|null = null;
    public quickActions:HTMLDivElement|null = null;

    constructor(event: EventInfo, lod:DetailLevel="normal", expanded=false) {
        super();

        this.event = event;

        // initializing element
        this.expanded = expanded;

        this.initElement();
        
        this._lod = lod;
        this.lod = lod;
    }

    initElement(): void {
        
        if (this.expanded) this.setAttribute("expanded", "");

        const bgColor = this.event.color ?? ColorUtil.getStringColor(this.event.category);
        this.style.setProperty("--background-color", bgColor);
        this.style.setProperty("--text-color", ColorUtil.getMostContrasting(bgColor, "#111111", "#ffffff"));

        // event name
        this.name = this.appendChild(ElementFactory.heading(this.expanded ? 1 : 5).html(this.event.name).class("name", "rich-text").make());

        // event start/end time
        let timespanText = DateUtil.Timespans.areFullDays([this.event.starts_at, this.event.ends_at]) ?
            DateUtil.Days.isSame(this.event.starts_at, this.event.ends_at) ?
                DateUtil.DATE_FORMATS.DAY.SHORT_NO_YEAR(this.event.starts_at) :
                `${DateUtil.DATE_FORMATS.DAY.SHORT_NO_YEAR(this.event.starts_at)} t/m ${DateUtil.DATE_FORMATS.DAY.SHORT_NO_YEAR(this.event.ends_at)}` :
            DateUtil.Days.isSame(this.event.starts_at, this.event.ends_at) ?
                `${DateUtil.DATE_FORMATS.TIME.SHORT(this.event.starts_at)} - ${DateUtil.DATE_FORMATS.TIME.SHORT(this.event.ends_at)}` :
                `${DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT_NO_YEAR(this.event.starts_at)} t/m ${DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT_NO_YEAR(this.event.ends_at)}`;
        this.timespan = this.appendChild(ElementFactory.p(timespanText).class("timespan", "subtitle", "italic").make());

        // description
        this.description = this.appendChild(
            ElementFactory.div(undefined, "description", "rich-text", "flex-rows", "in-section-gap")
                .children(...RichTextSerializer.deserialize(this.event.description))
                .make()
        );
        this.description.classList.add("description");

        // registration button
        if (this.event instanceof RegisterableEventInfo) { // only add if registerable
            const regEvent = this.event;

            this.allowsPaymentSwitch = new Switch(!regEvent.requires_payment);
            this.allowsPaymentSwitch.addEventListener("input", () => this.refreshRegisterButton());

            this.commentBox = this.appendChild(
                ElementFactory.textarea()
                    .class("comment-box")
                    .placeholder("Opmerking...")
                    .maxLength(512)
                    .spellcheck(true)
                    .attr("no-resize")
                    .make()
            );

            this.registerButton = ElementFactory.button()
                .class("register-button", "center-content", "main-axis-space-between")
                .children(
                    ElementFactory.h4("calendar_add").class("icon"),
                    ElementFactory.h4("Inschrijven")
                )
                .onMake(self => {
                    self.disabled = true;
                    this.refreshRegisterButton();
                })
                .on("click", (ev,self) => {
                    self.disabled = true;
                    onAuth()
                    .then(user => {
                        console.log(this.commentBox?.value);
                        
                        if (user === null) location.href = URLUtil.createLinkBackURL("./login.html").toString();
                        else regEvent.toggleRegistered(user.uid, this.commentBox?.value)
                            .then(isReg => this.refreshRegisterButton())
                            .catch(err => showError(getErrorMessage(err)));
                    });
                })
                .make();

            this.appendChild(
                ElementFactory.div(undefined, "flex-rows", "cross-axis-center")
                    .children(
                        regEvent.requires_payment && (this.paymentDisclaimer = ElementFactory.div(undefined, "flex-columns", "cross-axis-center", "in-section-gap")
                            .children(
                                ElementFactory.p("Ik ga akkoord met de kosten voor deze activiteit."),
                                this.allowsPaymentSwitch
                            )
                            .make()),
                        this.commentBox,
                        this.registerButton
                    )
                    .make()
            );
        }
        
        this.quickActions = this.appendChild(
            ElementFactory.div(undefined, "quick-actions")
                .children(
                    EventNote.CAN_UPDATE && ElementFactory.p("edit_square")
                        .id("edit-button")
                        .class("icon", "click-action")
                        .tooltip("Activiteit bewerken")
                        .on("click", (ev, self) => {
                            // upgrade to editable version
                            this.replaceWith(new EditableEventNote(this.event, this.lod, this.expanded));
                        }),
                    EventNote.CAN_DELETE && ElementFactory.p("delete")
                        .id("delete-button")
                        .class("icon", "click-action")
                        .tooltip("Activiteit verwijderen")
                        .on("click", (ev, self) => {
                            if (self.hasAttribute("awaiting-confirmation")) {
                                this.event.sourceDB.delete(this.event)
                                .then(() => {
                                    showSuccess("Activiteit succesvol verwijderd.");
                                    if (this.expanded) EventCalendar.closeFullscreenNote();
                                })
                                .catch(err => showError(getErrorMessage(err)));
                            }
                            else {
                                self.textContent = "delete_forever";
                                self.title = "Definitief verwijderen";
                                self.setAttribute("awaiting-confirmation", "");
                                self.classList.add("pulsate-in");

                                showWarning("Zeker weten? Een activiteit verwijderen kan niet worden teruggedraaid!", 5000);
                                setTimeout(() => {
                                    self.textContent = "delete";
                                    self.title = "Activiteit verwijderen";
                                    self.classList.remove("pulsate-in");
                                    self.removeAttribute("awaiting-confirmation");
                                }, 5000);
                            }
                        }),
                    ElementFactory.p("share")
                        .id("share-button")
                        .class("icon", "click-action")
                        .tooltip("Delen")
                        .on("click", () => {
                            const url = `${location.origin}/calendar.html#looking-at=${this.event.id}`;
                            if (navigator.canShare({ url, title: `GWS Activiteit - ${this.event.name}` })) {
                                navigator.share({ url, title: `GWS Activiteit - ${this.event.name}` });
                            }
                            else navigator.clipboard.writeText(url)
                                .then(() => showSuccess("Link gekopieerd!"))
                                .catch(() => showError("Kan link niet kopiëren, probeer het later opnieuw."));
                        }),
                    this.expanded && ElementFactory.p("close")
                        .id("close-button")
                        .class("icon", "click-action")
                        .tooltip("Sluiten")
                        .on("click", () => EventCalendar.closeFullscreenNote()),
                )
                .make()
        );
    }

    public copy(lod:DetailLevel=this._lod, expanded:boolean=this.expanded) {
        return new EventNote(this.event, lod, expanded);
    }

}

window.addEventListener("DOMContentLoaded", () => customElements.define("event-note", EventNote));

export class EditableEventNote extends EventNote implements HasSections<"category"|"useColor"|"color"|"startsAt"|"endsAt"> {

    public override name!:HTMLTextAreaElement;
    public override description!:RichTextInput;
    public category!:HTMLInputElement;
    public useColor!:Switch;
    public color!:HTMLInputElement;
    public startsAt!:HTMLInputElement;
    public endsAt!:HTMLInputElement;

    override initElement(): void {
        
        if (this.expanded) this.setAttribute("expanded", "");
        this.classList.add("flex-rows", "section-gap");

        const bgColor = this.event.color ?? ColorUtil.getStringColor(this.event.category);
        this.style.setProperty("--background-color", bgColor);
        this.style.setProperty("--text-color", ColorUtil.getMostContrasting(bgColor, "#000000", "#ffffff"));

        let refreshColors = () => { // changes background and text color according to input
            const bgColor = this.useColor.value ? this.color.value as HexColor : ColorUtil.getStringColor(this.category.value);
            this.style.setProperty("--background-color", bgColor);
            this.style.setProperty("--text-color", ColorUtil.getMostContrasting(bgColor, "#000000", "#ffffff"));
        }

        this.appendChild(
            ElementFactory.div(undefined, "general", "in-section-gap")
                .children(
                    () => this.name = ElementFactory.textarea(this.event.name)
                        .class("name")
                        .attr("no-resize")
                        .placeholder("Naam")
                        .make(),
                    this.category = ElementFactory.input.text(this.event.category)
                        .class("category")
                        .placeholder("categorie")
                        .spellcheck(true)
                        .on("input", () => FunctionUtil.setDelayedCallback(refreshColors, 500))
                        .make(),
                    ElementFactory.div(undefined, "color", "flex-rows", "center-content", "in-section-gap")
                        .children(
                            ElementFactory.p("Zelf kleur instellen?")
                                .class("text-center", "no-margin"),
                            ElementFactory.div(undefined, "flex-columns", "center-content", "in-section-gap")
                                .children(
                                    () => {
                                        this.color = ElementFactory.input.color(this.event.color ?? "#aaaaaa").make();
                                        return [
                                            this.useColor = new Switch(this.event.color !== undefined, [this.color]),
                                            this.color
                                        ];
                                    }
                                )
                        )
                        .on("input", refreshColors)
                )
                .make()
        );

        this.timespan = this.appendChild( // timespan
            ElementFactory.div(undefined, "timespan", "flex-columns", "cross-axis-center", "in-section-gap")
                .children(
                    this.startsAt = ElementFactory.input.dateTimeLocal(this.event.starts_at)
                        .class("starts-at")
                        .make(),
                    ElementFactory.p("t/m")
                        .class("no-margin"),
                    this.endsAt = ElementFactory.input.dateTimeLocal(this.event.ends_at)
                        .class("ends-at")
                        .make(),
                )
                .make()
        );

        this.description = this.appendChild(
            ElementFactory.input.richText(this.event.description)
                .compact()
                .class("description")
                .attr("no-resize")
                .make()
        );

        this.quickActions = this.appendChild( // quick-actions
            ElementFactory.div(undefined, "quick-actions")
                .children(
                    ElementFactory.p("save_as")
                        .id("save-changes-button")
                        .class("icon", "click-action")
                        .tooltip("Wijzigingen opslaan")
                        .on("click", (ev, self) => {
                            // validate inputs
                            const [startDate, endDate] = [new Date(this.startsAt.value), new Date(this.endsAt.value)];

                            if (!this.name.value.trim()) showError("Naam-veld is leeg.");
                            else if (!this.startsAt?.value) showError("Beginmoment is leeg.");
                            else if (!this.endsAt?.value) showError("Eindmoment is leeg.");
                            else if (!DateUtil.Timestamps.isValid(startDate)) showError("Beginmoment is ongeldig.");
                            else if (!DateUtil.Timestamps.isValid(endDate)) showError("Eindmoment is ongeldig.");
                            else if (endDate < startDate) showError("Eindmoment is voor startmoment.");
                            else { // all valid, save to DB
                                const newEvent = new EventInfo(
                                    this.event.sourceDB,
                                    this.event.id,
                                    this.name.value.trim(),
                                    this.description.value.trim(),
                                    this.category.value.trim(),
                                    this.useColor.value ? this.color.value as HexColor : undefined,
                                    [startDate, endDate]
                                );

                                this.event.sourceDB.write(newEvent)
                                .then(() => {
                                    showSuccess("Wijzigingen opgeslagen!");
                                    this.replaceWith(new EventNote(newEvent, this.lod, this.expanded));
                                })
                                .catch(err => showError(getErrorMessage(err)));
                            }
                        }),
                    ElementFactory.p("backspace")
                        .id("cancel-edit-button")
                        .class("icon", "click-action")
                        .tooltip("Wijzigingen annuleren")
                        .on("click", () => {
                            this.replaceWith(new EventNote(this.event, this.lod, this.expanded));
                        })
                )
                .make()
        );
    }

}

window.addEventListener("DOMContentLoaded", () => customElements.define("editable-event-note", EditableEventNote));