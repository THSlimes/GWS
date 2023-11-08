import ElementFactory from "../html-element-factory/ElementFactory";
import { EventInfo } from "../firebase/database/database-def";
import { getMostContrasting, getStringColor } from "../util/ColorUtil";
import RichText from "../ui/RichText";
import { areFullDays, isSameDay, spanInDays } from "../util/DateUtil";

export class EventNote extends HTMLElement {

    private readonly event: EventInfo;

    private readonly nameElement: HTMLHeadingElement;
    private readonly timespanElement: HTMLParagraphElement;

    constructor(event: EventInfo, expanded=false) {
        super();

        this.event = event;

        // initializing element
        if (expanded) this.setAttribute("expanded", "");

        const bgColor = event.color ?? getStringColor(event.category);
        this.style.backgroundColor = bgColor;
        this.style.color = getMostContrasting(bgColor, "#111111", "#ffffff");

        // event name
        this.nameElement = this.appendChild(ElementFactory.h5().html(RichText.parseLine(event.name)).class("name", "rich-text").make());

        // event start/end time
        console.log(event.starts_at, event.ends_at);
        console.log(spanInDays(event.starts_at, event.ends_at), isSameDay(event.starts_at, event.ends_at));
        
        let timespanText = isSameDay(event.starts_at, event.ends_at) ?
            `${event.starts_at.toLocaleTimeString(navigator.languages, {timeStyle:"short"})} - ${event.ends_at.toLocaleTimeString(navigator.languages, {timeStyle:"short"})}` :
            areFullDays(event.starts_at, event.ends_at) ?
                `${event.starts_at.toLocaleString(navigator.language, {day:"numeric", month:"short"})} t/m ${event.ends_at.toLocaleDateString(navigator.language, {day:"numeric", month:"short"})}` :
                `${event.starts_at.toLocaleString(navigator.language, {day:"numeric", month:"short"})} (${event.starts_at.toLocaleTimeString(navigator.language, {timeStyle:"short"})}) t/m ${event.ends_at.toLocaleDateString(navigator.language, {day:"numeric", month:"short"})} (${event.ends_at.toLocaleTimeString(navigator.language, {timeStyle:"short"})})`;
        this.timespanElement = this.appendChild(ElementFactory.p(timespanText).class("timespan", "subtitle", "italic").make());
    }

}

customElements.define("event-note", EventNote);