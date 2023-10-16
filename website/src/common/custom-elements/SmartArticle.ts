import Markdown from "../Markdown";
import ElementFactory from "../html-element-factory/HTMLElementFactory";

/**
 * A SmartArticle is a custom type of article. It provides a consistent way
 * to display textual articles.
 */
export default class SmartArticle extends HTMLElement {

    private static DEFAULT_PREVIEW_CUTOFF = 30;

    private readonly heading:HTMLHeadingElement;
    private readonly body:HTMLDivElement;

    /**
     * Creates a new SmartArticle.
     * @param heading heading/title of the article (markdown)
     * @param body body/main text of the article (markdown)
     * @param isPreview whether the article is shown as a non-full version
     * @param linkToFull URL to the full version of the article (ignored if not a preview)
     */
    constructor(heading:string, body:string, isPreview=true, linkToFull?:string) {
        super();
        this.style.display = "block";
        
        this.heading = this.appendChild(
            ElementFactory.heading(isPreview ? 2 : 1)
                .class("heading", "markdown")
                .html(Markdown.parseLine(heading))
                .make()
        );
        this.body = this.appendChild(Markdown.parse(body, isPreview ? {maxWords:SmartArticle.DEFAULT_PREVIEW_CUTOFF, cutoffMarker:" "} : {}));
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