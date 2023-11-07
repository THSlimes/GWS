import ElementFactory from "../html-element-factory/ElementFactory";
import { EventInfo } from "../firebase/database/database-def";
import { getMostContrasting, getStringColor } from "../util/ColorUtil";
import RichText from "../ui/RichText";


export class EventNote extends HTMLElement {

    private readonly event: EventInfo;

    private readonly nameElement: HTMLHeadingElement;

    constructor(event: EventInfo) {
        super();

        this.event = event;

        // initializing element
        const bgColor = event.color ?? getStringColor(event.category);
        this.style.backgroundColor = bgColor;

        this.nameElement = this.appendChild(ElementFactory.h5().html(RichText.parseLine(event.name)).class("name", "rich-text").make());
        this.nameElement.style.color = getMostContrasting(bgColor, "#111111", "#ffffff");
    }

}

customElements.define("event-note", EventNote);