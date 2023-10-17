import Markdown from "../Markdown";
import { ArticleInfo } from "../Database";
import ElementFactory from "../html-element-factory/HTMLElementFactory";

/**
 * A SmartArticle is a custom type of article. It provides a consistent way
 * to display textual articles.
 */
export default class SmartArticle extends HTMLElement {

    private static DEFAULT_PREVIEW_CUTOFF = 40;

    private readonly heading:HTMLHeadingElement;
    private readonly body:HTMLDivElement;

    private readonly createdAt:Date;

    /**
     * Creates a new SmartArticle.
     * @param heading heading/title of the article (markdown)
     * @param body body/main text of the article (markdown)
     * @param isPreview whether the article is shown as a non-full version
     * @param linkToFull URL to the full version of the article (ignored if not a preview)
     */
    constructor(heading:string, body:string, createdAt:Date, isPreview=true, linkToFull?:string) {
        super();
        this.style.display = "block";
        // this.classList.add("boxed");
        
        this.heading = this.appendChild(
            ElementFactory.heading(isPreview ? 2 : 1)
                .class("heading", "markdown")
                .html(Markdown.parseLine(heading))
                .make()
        );
        this.body = this.appendChild(Markdown.parse(body, isPreview ? {maxWords:SmartArticle.DEFAULT_PREVIEW_CUTOFF, cutoffMarker:" "} : {}));
        this.body.classList.add("body");
        this.createdAt = createdAt;

        if (isPreview) {
            this.setAttribute("is-preview", "");
            if (linkToFull) this.body.lastChild!.appendChild(
                ElementFactory.a(linkToFull, "lees verder »")
                    .class("read-more")
                    .make()
            );
        }
    }

    public static fromInfo(article:ArticleInfo, isPreview:boolean=true) {                
        return new SmartArticle(
            article.heading,
            article.body,
            article.created_at,
            isPreview,
            isPreview ? `/article.html?id=${article.id}` : undefined
        );
    }

}

customElements.define("smart-article", SmartArticle, {extends: "article"});