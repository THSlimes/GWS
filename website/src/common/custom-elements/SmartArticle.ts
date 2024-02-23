import getErrorMessage from "../firebase/authentication/error-messages";
import { checkPermissions, onPermissionCheck } from "../firebase/authentication/permission-based-redirect";
import Permission from "../firebase/database/Permission";
import ArticleDatabase, { ArticleInfo } from "../firebase/database/articles/ArticleDatabase";
import ElementFactory from "../html-element-factory/ElementFactory";
import { showError, showMessage, showSuccess, showWarning } from "../ui/info-messages";
import DateUtil from "../util/DateUtil";
import { HasSections } from "../util/UtilTypes";
import NodeUtil from "../util/NodeUtil";
import Switch from "./Switch";
import RichTextInput from "./rich-text/RichTextInput";
import RichTextSerializer from "./rich-text/RichTextSerializer";

export type ArticleLOD = "full" | "medium" | "low";

/**
 * A SmartArticle is a custom type of article. It provides a consistent way
 * to display textual articles.
 */
export default class SmartArticle extends HTMLElement implements HasSections<"heading"|"body"|"readMore"|"postDate"|"quickActions"> {

    protected static CAN_DELETE = false;
    protected static CAN_UPDATE = false;

    static {
        onPermissionCheck([Permission.DELETE_ARTICLES, Permission.UPDATE_ARTICLES], (_, res) => {
            this.CAN_DELETE = res.DELETE_ARTICLES;
            this.CAN_UPDATE = res.UPDATE_ARTICLES;
        }, true, true);
    }

    private static LOD_CUTOFFS:Record<ArticleLOD, number> = {
        "full": Infinity,
        "medium": 50,
        "low": 30
    };
    private static LOD_HIDDEN_ELEMENT_TYPES:Record<ArticleLOD, string[]> = {
        full: [],
        medium: ["IMG", "MULTISOURCE-IMAGE", "MULTISOURCE-ATTACHMENT", "UL", "OL"],
        low: ["H1", "H2", "H3", "H4", "H5", "H6", "IMG", "MULTISOURCE-IMAGE", "MULTISOURCE-ATTACHMENT", "UL", "OL"]
    };

    protected readonly article:ArticleInfo;
    public readonly lod:ArticleLOD;

    public heading!:HTMLElement;
    public body!:HTMLElement;
    public readMore!:HTMLElement;
    public postDate!:HTMLElement;

    public quickActions!:HTMLDivElement;

    constructor(articleInfo:ArticleInfo, lod:ArticleLOD="medium") {
        super();

        this.article = articleInfo;
        this.lod = lod;

        this.initElement();
    }

    initElement(): void {
        this.style.display = "flex";
        this.setAttribute("lod", this.lod);


        // heading element
        this.heading = ElementFactory.a(this.lod !== "full" ? SmartArticle.getLinkTo(this.article) : undefined)
            .class("heading")
            .children(ElementFactory.h1(this.article.heading))
            .make();


        // body element
        this.body = ElementFactory.div(undefined, "body", "rich-text", "flex-rows", "in-section-gap")
            .children(...RichTextSerializer.deserialize(this.article.body))
            .make();

        NodeUtil.onEach(this.body, node => { // hide disallowed element types
            if (node instanceof Element) node.toggleAttribute("hidden", SmartArticle.LOD_HIDDEN_ELEMENT_TYPES[this.lod].includes(node.tagName));
        });
        if (NodeUtil.limitWords(this.body, SmartArticle.LOD_CUTOFFS[this.lod]) <= 0) this.body.textContent += '…'; // limit word count


        // post-date element
        this.postDate = ElementFactory.p("Geplaatst op " + DateUtil.DATE_FORMATS.DAY_AND_TIME.SHORT(this.article.created_at))
            .class("post-date", "no-margin")
            .make();

        
        // link to full article
        this.readMore = this.lod === "low" ?
            this.readMore = ElementFactory.a(SmartArticle.getLinkTo(this.article), "article_shortcut")
                .tooltip("Naar bericht gaan")
                .class("read-more", "icon")
                .make() :
            ElementFactory.a(SmartArticle.getLinkTo(this.article), "Lees verder »")
                .class("read-more")
                .make()

        
        // quick-actions
        this.quickActions = ElementFactory.div(undefined, "quick-actions", "flex-columns", "cross-axis-center")
            .children(
                this.lod === "low" && this.readMore,
                SmartArticle.CAN_UPDATE && ElementFactory.p("edit_square")
                    .id("edit-button")
                    .class("icon", "click-action")
                    .tooltip("Bericht bewerken")
                    .on("click", (ev, self) => {
                        if (this.lod === "full") { // only allow editing in full LOD
                            // upgrade to editable version
                            this.replaceWith(new EditableSmartArticle(this.article, this.lod));
                        }
                        else location.href = SmartArticle.getLinkTo(this.article, true);
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
            .make();


        // adding sections to element
        if (this.lod === "low") {
            this.classList.add("flex-columns", "in-section-gap", "main-axis-space-between", "cross-axis-center");
            this.append(
                ElementFactory.div(undefined, "flex-rows", "in-section-gap")
                    .children(
                        this.heading,
                        this.body,
                        this.postDate
                    )
                    .make(),
                this.quickActions
            );
        }
        else {
            this.classList.add("flex-rows", this.lod === "full" ? "section-gap" : "in-section-gap");
            this.append(
                this.heading,
                this.body,
                this.readMore,
                this.postDate,
                this.quickActions
            );
        }
    }

    public static getLinkTo(article:ArticleInfo|string, editMode=false):string {
        if (article instanceof ArticleInfo) article = article.id;

        let out = `${location.origin}/article.html?id=${article}`;
        if (editMode) out += "&mode=edit";

        return out;
    }

}

window.addEventListener("DOMContentLoaded", () => customElements.define("smart-article", SmartArticle, {extends: "article"}));

export class EditableSmartArticle extends SmartArticle implements HasSections<"category"|"showOnHomepage"|"onlyForMembers"|"saveButton"> {
    
    public heading!:HTMLInputElement;
    public body!:RichTextInput;
    public category!:HTMLInputElement;
    public showOnHomepage!:Switch;
    public onlyForMembers!:Switch;
    public saveButton!:HTMLParagraphElement;

    private readonly saveAsNew:boolean;
    public onSave:(newArticle:ArticleInfo)=>void = () => {};

    constructor(articleInfo:ArticleInfo, lod:ArticleLOD, saveAsNew=false) {
        super(articleInfo, lod);

        if (this.saveAsNew = saveAsNew) {
            this.saveButton.textContent = "post_add";
            this.saveButton.title = "Bericht plaatsen";
        }
    }

    initElement(): void {
        this.style.display = "flex";
        this.classList.add("flex-rows", "section-gap");
        this.setAttribute("lod", this.lod);
        
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
                .placeholder("Tekst")
                .compact(true)
                .make()
        );

        this.quickActions = this.appendChild( // quick-actions
            ElementFactory.div(undefined, "quick-actions", "flex-columns", "cross-axis-center")
                .children(
                    this.saveButton = ElementFactory.p("save_as")
                        .id("save-changes-button")
                        .class("icon", "click-action")
                        .tooltip("Wijzigingen opslaan")
                        .on("click", (ev, self) => {
                            if (!this.heading.value.trim()) showError("Koptitel is leeg.");
                            else {

                            }
                            const heading = this.heading.value.trim();
                            const idPromise = this.saveAsNew ?
                                EditableSmartArticle.findFreeId(this.article.sourceDB, heading) :
                                new Promise<string>(resolve => resolve(this.article.id));

                            idPromise.then(id => {
                                const newArticle = new ArticleInfo(
                                    this.article.sourceDB,
                                    id,
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
                                    this.onSave(newArticle);
                                    this.replaceWith(new SmartArticle(newArticle, this.lod));
                                })
                                .catch(err => showError(getErrorMessage(err)));

                            })
                            .catch(err => showMessage(getErrorMessage(err)));
                        })
                        .make(),
                    ElementFactory.p("backspace")
                        .id("cancel-edit-button")
                        .class("icon", "click-action")
                        .tooltip("Wijzigingen annuleren")
                        .on("click", () => {
                            this.replaceWith(new SmartArticle(this.article, this.lod));
                        })
                )
                .make()
        );

    }

    private static readonly ALPHANUMERIC_REGEX = /[a-zA-Z0-9]/;
    private static findFreeId(db:ArticleDatabase, heading:string):Promise<string> {

        const words:string[] = [];
        let word = "";
        for (let i = 0; i < heading.length; i ++) {
            const c = heading[i];

            if (this.ALPHANUMERIC_REGEX.test(c)) word += c;
            else {
                if (word.length) words.push(word);
                word = "";
            }
        }
        if (word.length) words.push(word);

        const base = words.join('-');

        /** Iterates over number articles with the same id to find a free one. */
        function findN(base:string, n=0):Promise<string> {
            return new Promise((resolve, reject) => {
                const id = base + (n ? `-${n}` : "");
                db.getById(id)
                .then(res => {
                    if (res) findN(base, n + 1) // id already exists, try next n
                        .then(resolve)
                        .catch(reject);
                    else resolve(id);
                })
                .catch(reject);
            });
        }

        return findN(base);
    }

}

window.addEventListener("DOMContentLoaded", () => customElements.define("editable-smart-article", EditableSmartArticle));
