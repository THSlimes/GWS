import ElementFactory from "../html-element-factory/ElementFactory";
import { EventInfo, RegisterableEventInfo } from "../firebase/database/events/EventDatabase";
import RichText from "../ui/RichText";
import { showError, showSuccess, showWarning } from "../ui/info-messages";
import { HasSections } from "../util/ElementUtil";
import getErrorMessage from "../firebase/authentication/error-messages";
import { onAuth } from "../firebase/init-firebase";
import { createLinkBackURL } from "../util/UrlUtil";
import ColorUtil from "../util/ColorUtil";
import DateUtil from "../util/DateUtil";
import { checkPermissions } from "../firebase/authentication/permission-based-redirect";
import Permission from "../firebase/database/Permission";
import EventCalendar from "./EventCalendar";

/** Amount of detail present in an EventNote element. */
export type DetailLevel = "full" | "high" | "normal" | "low";
type EventNoteSection = "name" | "timespan" | "description" | "registerButton" | "quickActions";
const VISIBILITY_AT_LOD:Record<DetailLevel, Record<EventNoteSection, boolean>> = {
    full: { name: true, timespan: true, description: true, registerButton: true, quickActions: true },
    high: { name: true, timespan: true, description: true, registerButton: false, quickActions: true },
    normal: { name: true, timespan: true, description: false, registerButton: false, quickActions: false },
    low: { name: true, timespan: false, description: false, registerButton: false, quickActions: false }
};

/** Gives a [text,icon,disabled] button state based on the events state. */
function getRegisterButtonState(isReg:boolean, e:RegisterableEventInfo):[string,string,boolean] {
    const now = new Date();
    if (e.ends_at <= now) return ["Activiteit is al voorbij", "event_busy", true];
    else if (e.starts_at <= now) return ["Activiteit is al gestart", "event_upcoming", true];
    else if (e.can_register_from && now < e.can_register_from) {
        return [`Inschrijving start op ${DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT_NO_YEAR(e.can_register_from)}`, "event", true];
    }
    else if (e.can_register_until && e.can_register_until < now) {
        return ["Inschrijving is gesloten", "event_busy", true];
    }
    else if (isReg) return ["Uitschrijven", "free_cancellation", false];
    else if (e.isFull()) return ["Activiteit zit vol", "event_busy", true];
    else return ["Inschrijven", "calendar_add_on", false];
}

export class EventNote extends HTMLElement implements HasSections<EventNoteSection> {

    private static CAN_DELETE_EVENTS = false;
    static {
        checkPermissions(Permission.DELETE_EVENTS, canDelete => this.CAN_DELETE_EVENTS = canDelete, true, true);
    }

    private readonly event:EventInfo;
    private _lod:DetailLevel;
    public set lod(newLod:DetailLevel) {
        this._lod = newLod;
        this.setAttribute("detail", newLod);
        const lod = VISIBILITY_AT_LOD[newLod];
        for (const k in lod) {
            const sectionName = k as EventNoteSection;
            const elem = this[sectionName];
            if (elem) elem.hidden = !lod[sectionName];
        }
    }
    private readonly expanded:boolean;

    readonly name: HTMLHeadingElement;
    readonly timespan: HTMLParagraphElement;
    readonly description: HTMLDivElement;
    readonly registerButton: HTMLElement|null;
    readonly quickActions: HTMLDivElement;

    constructor(event: EventInfo, lod:DetailLevel="normal", expanded=false) {
        super();

        this.event = event;

        // initializing element
        this.expanded = expanded;
        if (expanded) this.setAttribute("expanded", "");

        const bgColor = event.color ?? ColorUtil.getStringColor(event.category);
        this.style.setProperty("--background-color", bgColor);
        this.style.setProperty("--text-color", ColorUtil.getMostContrasting(bgColor, "#111111", "#ffffff"));

        // event name
        this.name = this.appendChild(ElementFactory.heading(expanded ? 1 : 5).html(RichText.parseLine(event.name)).class("name", "rich-text").make());

        // event start/end time
        let timespanText = DateUtil.Timespans.areFullDays([event.starts_at, event.ends_at]) ?
            DateUtil.Days.isSame(event.starts_at, event.ends_at) ?
                DateUtil.DATE_FORMATS.DAY.SHORT_NO_YEAR(event.starts_at) :
                `${DateUtil.DATE_FORMATS.DAY.SHORT_NO_YEAR(event.starts_at)} t/m ${DateUtil.DATE_FORMATS.DAY.SHORT_NO_YEAR(event.ends_at)}` :
            DateUtil.Days.isSame(event.starts_at, event.ends_at) ?
                `${DateUtil.DATE_FORMATS.TIME.SHORT(event.starts_at)} - ${DateUtil.DATE_FORMATS.TIME.SHORT(event.ends_at)}` :
                `${DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT_NO_YEAR(event.starts_at)} t/m ${DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT_NO_YEAR(event.ends_at)}`;
        this.timespan = this.appendChild(ElementFactory.p(timespanText).class("timespan", "subtitle", "italic").make());

        // description
        this.description = this.appendChild(RichText.parse(event.description));
        this.description.classList.add("description");

        // registration button
        if (this.event instanceof RegisterableEventInfo) {
            const regEvent = this.event;

            this.registerButton = this.appendChild(
                ElementFactory.button(() => showWarning("Not implemented yet."))
                    .class("register-button", "center-content", "main-axis-space-between")
                    .children(
                        ElementFactory.h4("person_add").class("icon"),
                        ElementFactory.h4("Inschrijven")
                    )
                    .onMake(self => {
                        self.disabled = true;
                        onAuth()
                        .then(user => {
                            [
                                self.children[1].textContent,
                                self.children[0].textContent,
                                self.disabled
                            ] = user === null ? ["Log in om je in te schrijven", "login", false] :
                                                getRegisterButtonState(regEvent.isRegistered(user.uid), regEvent);
                        });
                    })
                    .on("click", (ev,self) => {
                        self.disabled = true;
                        onAuth()
                        .then(user => {
                            if (user === null) createLinkBackURL("./login.html");
                            else regEvent.toggleRegistered(user.uid)
                                .then(isReg => {
                                    [
                                        self.children[1].textContent,
                                        self.children[0].textContent,
                                        self.disabled
                                    ] = getRegisterButtonState(isReg, regEvent);
                                })
                                .catch(err => showError(getErrorMessage(err)));
                        });
                    })
                    .make()
            );
        }
        else this.registerButton = null;
        
        this.quickActions = this.appendChild(
            ElementFactory.div(undefined, "quick-actions")
                .children(
                    EventNote.CAN_DELETE_EVENTS && ElementFactory.p("delete")
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
                                self.setAttribute("awaiting-confirmation", "");

                                showWarning("Zeker weten? Een activiteit verwijderen kan niet worden teruggedraaid!", 5000);
                                setTimeout(() => {
                                    self.textContent = "delete";
                                    self.removeAttribute("awaiting-confirmation");
                                }, 5000);
                            }
                        }),
                    this.expanded && ElementFactory.p("close")
                        .id("close-button")
                        .class("icon", "click-action")
                        .tooltip("Sluiten")
                        .on("click", () => EventCalendar.closeFullscreenNote()),
                )
                .make()
        );
        
        this._lod = lod;
        this.lod = lod;
    }

    public copy(lod:DetailLevel=this._lod, expanded:boolean=this.expanded) {
        return new EventNote(this.event, lod, expanded);
    }

}

customElements.define("event-note", EventNote);