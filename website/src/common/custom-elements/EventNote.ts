import ElementFactory from "../html-element-factory/ElementFactory";
import { EventInfo } from "../firebase/database/events/EventDatabase";
import { getMostContrasting, getStringColor } from "../util/ColorUtil";
import RichText from "../ui/RichText";
import { DATE_FORMATS, areFullDays, isSameDay, spanInDays } from "../util/DateUtil";
import { showError, showMessage, showWarning } from "../ui/info-messages";
import { HasSections } from "../util/ElementUtil";
import getErrorMessage from "../firebase/authentication/error-messages";

/** Amount of detail present in an EventNote element. */
export type DetailLevel = "full" | "high" | "normal" | "low";
type EventNoteSection = "name" | "timespan" | "description" | "registerButton";
const VISIBILITY_AT_LOD:Record<DetailLevel, Record<EventNoteSection, boolean>> = {
    full: {
        name: true,
        timespan: true,
        description: true,
        registerButton: true
    },
    high: {
        name: true,
        timespan: true,
        description: true,
        registerButton: true
    },
    normal: {
        name: true,
        timespan: true,
        description: false,
        registerButton: false
    },
    low: {
        name: true,
        timespan: false,
        description: false,
        registerButton: false
    }
};

export class EventNote extends HTMLElement implements HasSections<EventNoteSection> {

    private readonly event:EventInfo;
    private _lod:DetailLevel;
    public set lod(newLod:DetailLevel) {
        this._lod = newLod;
        this.setAttribute("detail", newLod);
        const lod = VISIBILITY_AT_LOD[newLod];
        for (const k in lod) {
            const sectionName = k as EventNoteSection;
            this[sectionName].hidden = !lod[sectionName];
        }
    }
    private readonly expanded:boolean

    readonly name: HTMLHeadingElement;
    readonly timespan: HTMLParagraphElement;
    readonly description: HTMLDivElement;
    readonly registerButton: HTMLButtonElement;

    constructor(event: EventInfo, lod:DetailLevel="normal", expanded=false) {
        super();

        this.event = event;

        // initializing element
        this.expanded = expanded;
        if (expanded) this.setAttribute("expanded", "");

        const bgColor = event.color ?? getStringColor(event.category);
        this.style.backgroundColor = bgColor;
        this.style.color = getMostContrasting(bgColor, "#111111", "#ffffff");

        // event name
        this.name = this.appendChild(ElementFactory.heading(expanded ? 1 : 5).html(RichText.parseLine(event.name)).class("name", "rich-text").make());

        // event start/end time
        let timespanText = isSameDay(event.starts_at, event.ends_at) ?
            `${DATE_FORMATS.TIME.SHORT(event.starts_at)} - ${DATE_FORMATS.TIME.SHORT(event.ends_at)}` :
            areFullDays(event.starts_at, event.ends_at) ?
                `${DATE_FORMATS.DAY.SHORT_NO_YEAR(event.starts_at)} t/m ${DATE_FORMATS.DAY.SHORT_NO_YEAR(event.ends_at)}` :
                `${DATE_FORMATS.DAY_AND_TIME.SHORT_NO_YEAR(event.starts_at)} t/m ${DATE_FORMATS.DAY_AND_TIME.SHORT_NO_YEAR(event.ends_at)}`;
        this.timespan = this.appendChild(ElementFactory.p(timespanText).class("timespan", "subtitle", "italic").make());

        // description
        this.description = this.appendChild(RichText.parse(event.description));
        this.description.classList.add("description");

        // registration button
        this.registerButton = this.appendChild(
            ElementFactory.button(() => showWarning("Not implemented yet."))
                .class("register-button", "center-content", "main-axis-space-between")
                .children(
                    ElementFactory.h2("Inschrijven"),
                    ElementFactory.h2("person_add").class("icon")
                )
                .onMake(self => {
                    self.disabled = true;
                    this.event.isRegistered()
                    .then(isReg => {
                        self.children[0].textContent = isReg ? "Uitschrijven" : "Inschrijven";
                        self.children[1].textContent = isReg ? "person_remove" : "person_add";
                        self.disabled = false;
                    })
                    .catch(err => showError(getErrorMessage(err)));
                })
                .on("click", (ev,self) => {
                    self.disabled = true;
                    this.event.toggleRegistered()
                    .then(isReg => {
                        showMessage(isReg ? "Succesvol ingeschreven" : "Succesvol uitgeschreven")
                        self.children[0].textContent = isReg ? "Uitschrijven" : "Inschrijven";
                        self.children[1].textContent = isReg ? "person_remove" : "person_add";
                    })
                    .catch(e => showError(getErrorMessage(e)))
                    .finally(() => self.disabled = false);
                })
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