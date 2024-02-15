import getErrorMessage from "../firebase/authentication/error-messages";
import { checkPermissions } from "../firebase/authentication/permission-based-redirect";
import Permission from "../firebase/database/Permission";
import ArticleDatabase, { ArticleInfo } from "../firebase/database/articles/ArticleDatabase";
import ElementFactory from "../html-element-factory/ElementFactory";
import { showError, showSuccess, showWarning } from "../ui/info-messages";
import DateUtil from "../util/DateUtil";
import { HasSections } from "../util/ElementUtil";
import NodeUtil from "../util/NodeUtil";
import Switch from "./Switch";
import RichTextInput from "./rich-text/RichTextInput";
import RichTextSerializer from "./rich-text/RichTextSerializer";

/**
 * A SmartArticle is a custom type of article. It provides a consistent way
 * to display textual articles.
 */
export default class SmartArticle extends HTMLElement implements HasSections<"heading"|"body"|"readMore"|"postDate"|"quickActions"> {

    protected static CAN_DELETE = false;
    protected static CAN_EDIT = false;

    static {
        checkPermissions(Permission.DELETE_ARTICLES, canDelete => this.CAN_DELETE = canDelete, true, true);
        checkPermissions(Permission.UPDATE_ARTICLES, canDelete => this.CAN_EDIT = canDelete, true, true);
    }

    private static DEFAULT_PREVIEW_CUTOFF = 50;
    private static PREVIEW_HIDDEN_ELEMENT_TYPES:string[] = ["IMG", "MULTISOURCE-IMAGE", "MULTISOURCE-ATTACHMENT", "UL", "OL"];

    protected readonly article:ArticleInfo;
    protected readonly isPreview:boolean;

    public heading!:HTMLElement;
    public body!:HTMLElement;
    public readMore:HTMLElement|null = null;
    public postDate!:HTMLElement;

    public quickActions!:HTMLDivElement;

    constructor(articleInfo:ArticleInfo, isPreview=false) {
        super();

        this.article = articleInfo;
        this.isPreview = isPreview;

        this.initElement();
    }

    initElement(): void {
        this.style.display = "flex";
        this.classList.add("flex-rows", "section-gap");

        this.heading = this.appendChild( // heading element
            ElementFactory.a(this.isPreview ? SmartArticle.getLinkTo(this.article) : undefined)
                .class("heading")
                .children(ElementFactory.h1(this.article.heading))
                .make()
        );

        this.body = this.appendChild( // body element
            ElementFactory.div(undefined, "body", "rich-text", "flex-rows", "in-section-gap")
                .children(...RichTextSerializer.deserialize(this.article.body))
                .make()
        );

        this.postDate = this.appendChild( // post-date element
            ElementFactory.p("Geplaatst op " + DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT(this.article.created_at))
                .class("post-date", "no-margin")
                .make()
        );

        if (this.isPreview) {
            this.setAttribute("preview", "");

            NodeUtil.onEach(this.body, node => { // hide disallowed element types
                if (node instanceof Element) node.toggleAttribute("hidden", SmartArticle.PREVIEW_HIDDEN_ELEMENT_TYPES.includes(node.tagName));
            });

            if (NodeUtil.limitWords(this.body, SmartArticle.DEFAULT_PREVIEW_CUTOFF) <= 0) this.body.textContent += '…';

            this.readMore = ElementFactory.a(SmartArticle.getLinkTo(this.article), "Lees verder »").class("read-more").make();
            this.body.after(this.readMore);
        }
        else {
            this.quickActions = this.appendChild( // quick-actions menu
            ElementFactory.div(undefined, "quick-actions")
                .children(
                    SmartArticle.CAN_EDIT && ElementFactory.p("edit_square")
                        .id("edit-button")
                        .class("icon", "click-action")
                        .tooltip("Activiteit bewerken")
                        .on("click", (ev, self) => {
                            // upgrade to editable version
                            this.replaceWith(new EditableSmartArticle(this.article, this.isPreview));
                        }),
                    SmartArticle.CAN_DELETE && ElementFactory.p("delete")
                        .id("delete-button")
                        .class("icon", "click-action")
                        .tooltip("Bericht verwijderen")
                        .on("click", (ev, self) => {
                            if (self.hasAttribute("awaiting-confirmation")) {
                                this.article.sourceDB.delete(this.article)
                                .then(() => {
                                    showSuccess("Bericht succesvol verwijderd.");
                                    location.href = '/'; // go to homepage
                                })
                                .catch(err => showError(getErrorMessage(err)));
                            }
                            else {
                                self.textContent = "delete_forever";
                                self.title = "Definitief verwijderen";
                                self.setAttribute("awaiting-confirmation", "");
                                self.classList.add("pulsate-in");

                                showWarning("Zeker weten? Een bericht verwijderen kan niet worden teruggedraaid!", 5000);
                                setTimeout(() => {
                                    self.textContent = "delete";
                                    self.title = "Bericht verwijderen";
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
                            const url = SmartArticle.getLinkTo(this.article);
                            if (navigator.canShare({ url, title: `GWS Bericht - ${this.article.heading}` })) {
                                navigator.share({ url, title: `GWS Bericht - ${this.article.heading}` });
                            }
                            else navigator.clipboard.writeText(url)
                                .then(() => showSuccess("Link gekopieerd!"))
                                .catch(() => showError("Kan link niet kopiëren, probeer het later opnieuw."));
                        })
                )
                .make()
            );
        }
    }

    private static getLinkTo(article:ArticleInfo|string):string {
        if (article instanceof ArticleInfo) article = article.id;
        
        return `${location.origin}/article.html?id=${article}`;
    }

}

customElements.define("smart-article", SmartArticle, {extends: "article"});

export class EditableSmartArticle extends SmartArticle implements HasSections<"category"|"showOnHomepage"|"onlyForMembers"> {
    
    public heading!:HTMLInputElement;
    public body!:RichTextInput;
    public category!:HTMLInputElement;
    public showOnHomepage!:Switch;
    public onlyForMembers!:Switch;

    initElement(): void {
        this.style.display = "flex";
        this.classList.add("flex-rows", "section-gap");
        
        this.heading = this.appendChild(
            ElementFactory.input.text(this.article.heading)
                .placeholder("Koptitel")
                .class("heading")
                .make()
        );

        this.append(
            ElementFactory.div(undefined, "flex-columns", "main-axis-space-evenly", "cross-axis-center", "in-section-gap")
                .children(
                    this.category = ElementFactory.input.text(this.article.category)
                        .placeholder("Categorie")
                        .class("category")
                        .make(),
                    ElementFactory.div(undefined, "flex-columns", "main-axis-space-between", "cross-axis-center", "in-section-gap")
                        .children(
                            ElementFactory.label("Zichtbaar op homepagina?"),
                            this.showOnHomepage = new Switch(this.article.show_on_homepage)
                        ),
                        
                    ElementFactory.div(undefined, "flex-columns", "main-axis-space-between", "cross-axis-center", "in-section-gap")
                        .children(
                            ElementFactory.label("Alleen te lezen door leden?"),
                            this.onlyForMembers = new Switch(this.article.only_for_members)
                        )
                )
                .make()
        );

        this.body = this.appendChild(
            ElementFactory.input.richText(this.article.body)
                .compact(true)
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

                            if (!this.heading.value.trim()) showError("Koptitel is leeg.");
                            else { // all valid, save to DB
                                const newArticle = new ArticleInfo(
                                    this.article.sourceDB,
                                    this.article.id,
                                    this.heading.value.trim(),
                                    this.body.value,
                                    this.article.created_at,
                                    this.category.value.trim(),
                                    this.showOnHomepage.value,
                                    this.onlyForMembers.value
                                );

                                this.article.sourceDB.write(newArticle)
                                .then(() => {
                                    showSuccess("Wijzigingen opgeslagen!");
                                    this.replaceWith(new SmartArticle(newArticle, this.isPreview));
                                })
                                .catch(err => showError(getErrorMessage(err)));
                            }
                        }),
                    ElementFactory.p("backspace")
                        .id("cancel-edit-button")
                        .class("icon", "click-action")
                        .tooltip("Wijzigingen annuleren")
                        .on("click", () => {
                            this.replaceWith(new SmartArticle(this.article, this.isPreview));
                        })
                )
                .make()
        );

    }

}

customElements.define("editable-smart-article", EditableSmartArticle);
