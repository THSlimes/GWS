import RichText from "../RichText";
import { ArticleInfo } from "../database-def";
import ElementFactory from "../html-element-factory/ElementFactory";

/**
 * A SmartArticle is a custom type of article. It provides a consistent way
 * to display textual articles.
 */
export default class SmartArticle extends HTMLElement {

    private static DEFAULT_PREVIEW_CUTOFF = 50;

    private readonly heading:HTMLAnchorElement;
    private readonly body:HTMLDivElement;

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
        
        this.heading = this.appendChild(
            ElementFactory.a(linkToFull)
                .children(
                    ElementFactory.heading(isPreview ? 2 : 1).class("heading").html(RichText.parseLine(heading))
                )
                .make()
        );
        this.body = this.appendChild(
            RichText.parse(body, isPreview ? {
                maxWords:SmartArticle.DEFAULT_PREVIEW_CUTOFF,
                cutoffMarker:" ",
                skipLineBreaks:true,
                disallowedTags: ["img"]
            } : undefined)
        );
        this.body.classList.add("body");

        if (isPreview) {
            this.setAttribute("is-preview", "");
            if (linkToFull) {
                const readMoreParent = this.body.lastChild instanceof Text || this.body.lastChild === null ? this.body : this.body.lastChild;
                readMoreParent.appendChild(
                ElementFactory.a(linkToFull, "lees verder »")
                    .openInNewTab(true)
                    .class("read-more")
                    .make()
                );
            }
        }
        else {
            this.appendChild(
                ElementFactory.p(`Geplaatst op ${createdAt.toLocaleDateString(navigator.languages, {dateStyle:"medium"})}`)
                    .class("created-at", "italic")
                    .children(
                        ElementFactory.span(` (${createdAt.toLocaleTimeString(navigator.languages, {timeStyle:"short"})})`)
                            .class("subtitle")
                    )
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