import ElementFactory from "../html-element-factory/ElementFactory";
import { EventInfo } from "../firebase/database/database-def";
import { getMostContrasting, getStringColor } from "../util/ColorUtil";
import RichText from "../ui/RichText";
import { areFullDays, isSameDay, spanInDays } from "../util/DateUtil";
import { showWarning } from "../ui/info-messages";

export class EventNote extends HTMLElement {

    private readonly event:EventInfo;

    private readonly expanded:boolean

    private readonly nameElement: HTMLHeadingElement;
    private readonly timespanElement: HTMLParagraphElement;
    private readonly descriptionElement?: HTMLDivElement;
    private readonly registerButton?: HTMLButtonElement;

    constructor(event: EventInfo, expanded=false) {
        super();

        this.event = event;

        // initializing element
        this.expanded = expanded;
        if (expanded) this.setAttribute("expanded", "");

        const bgColor = event.color ?? getStringColor(event.category);
        this.style.backgroundColor = bgColor;
        this.style.color = getMostContrasting(bgColor, "#111111", "#ffffff");

        // event name
        this.nameElement = this.appendChild(ElementFactory.heading(expanded ? 1 : 5).html(RichText.parseLine(event.name)).class("name", "rich-text").make());

        // event start/end time
        let timespanText = isSameDay(event.starts_at, event.ends_at) ?
            `${event.starts_at.toLocaleTimeString(navigator.languages, {timeStyle:"short"})} - ${event.ends_at.toLocaleTimeString(navigator.languages, {timeStyle:"short"})}` :
            areFullDays(event.starts_at, event.ends_at) ?
                `${event.starts_at.toLocaleString(navigator.language, {day:"numeric", month:"short"})} t/m ${event.ends_at.toLocaleDateString(navigator.language, {day:"numeric", month:"short"})}` :
                `${event.starts_at.toLocaleString(navigator.language, {day:"numeric", month:"short"})} (${event.starts_at.toLocaleTimeString(navigator.language, {timeStyle:"short"})}) t/m ${event.ends_at.toLocaleDateString(navigator.language, {day:"numeric", month:"short"})} (${event.ends_at.toLocaleTimeString(navigator.language, {timeStyle:"short"})})`;
        this.timespanElement = this.appendChild(ElementFactory.p(timespanText).class("timespan", "subtitle", "italic").make());

        if (expanded) {
            this.descriptionElement = this.appendChild(RichText.parse(event.description));
            this.descriptionElement.classList.add("description");

            this.registerButton = this.appendChild(
                ElementFactory.button(() => showWarning("Not implemented yet."))
                    .class("register-button", "center-content", "main-axis-space-between")
                    .children(
                        ElementFactory.h2("Inschrijven"),
                        ElementFactory.h2("person_add").class("icon")
                    )
                    .make()
            );
        }
    }

    public copy(expanded?:boolean) {
        return new EventNote(this.event, expanded ?? this.expanded);
    }

}

customElements.define("event-note", EventNote);