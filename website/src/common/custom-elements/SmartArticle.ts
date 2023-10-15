import Markdown from "../Markdown";
import ElementFactory from "../html-element-factory/HTMLElementFactory";

export default class SmartArticle extends HTMLElement {

    private readonly heading:HTMLHeadingElement;
    private readonly body:HTMLDivElement;

    constructor(heading:string, body:string, isPreview=true, linkToFull?:string) {
        super();
        this.style.display = "block";
        
        this.heading = this.appendChild(
            ElementFactory.heading(isPreview ? 2 : 1)
                .class("heading", "markdown")
                .html(Markdown.parseLine(heading))
                .make()
        );
        this.body = this.appendChild(Markdown.parse(body, isPreview ? {maxWords:30, cutoffMarker:" "} : {}));
        this.body.classList.add("body");

        if (isPreview) {
            this.setAttribute("is-preview", "");
            if (linkToFull) this.body.lastChild!.appendChild(
                ElementFactory.a()
                    .class("read-more")
                    .href(linkToFull)
                    .text("lees verder »")
                    .make()
            );
        }
    }

}

customElements.define("smart-article", SmartArticle, {extends: "article"});