import getErrorMessage from "../firebase/authentication/error-messages";
import { onPermissionCheck } from "../firebase/authentication/permission-based-redirect";
import Permissions from "../firebase/database/Permissions";
import ArticleDatabase, { ArticleInfo } from "../firebase/database/articles/ArticleDatabase";
import ElementFactory from "../html-element-factory/ElementFactory";
import DateUtil from "../util/DateUtil";
import { DetailLevel, HasSections } from "../util/UtilTypes";
import NodeUtil from "../util/NodeUtil";
import Switch from "./Switch";
import RichTextInput from "./rich-text/RichTextInput";
import RichTextSerializer from "./rich-text/RichTextSerializer";
import UserFeedback from "../ui/UserFeedback";
import Loading from "../Loading";

/**
 * A SmartArticle is a custom type of article. It provides a consistent way
 * to display textual articles.
 */
export default class SmartArticle extends HTMLElement implements HasSections<"heading" | "body" | "readMore" | "postDate" | "quickActions"> {

    protected static CAN_DELETE = false;
    protected static CAN_UPDATE = false;

    static {
        onPermissionCheck([Permissions.Permission.DELETE_ARTICLES, Permissions.Permission.UPDATE_ARTICLES], (_, res) => {
            this.CAN_DELETE = res.DELETE_ARTICLES;
            this.CAN_UPDATE = res.UPDATE_ARTICLES;
        }, true, true);
    }

    private static LOD_CUTOFFS: Record<DetailLevel, number> = {
        [DetailLevel.FULL]: Infinity,
        [DetailLevel.HIGH]: 100,
        [DetailLevel.MEDIUM]: 50,
        [DetailLevel.LOW]: 30
    };
    private static LOD_HIDDEN_ELEMENT_TYPES: Record<DetailLevel, string[]> = {
        [DetailLevel.FULL]: [],
        [DetailLevel.HIGH]: [],
        [DetailLevel.MEDIUM]: ["IMG", "MULTISOURCE-IMAGE", "MULTISOURCE-ATTACHMENT", "UL", "OL"],
        [DetailLevel.LOW]: ["H1", "H2", "H3", "H4", "H5", "H6", "IMG", "MULTISOURCE-IMAGE", "MULTISOURCE-ATTACHMENT", "UL", "OL"]
    };

    protected readonly article: ArticleInfo;
    public readonly lod: DetailLevel;

    public heading!: HTMLElement;
    public body!: HTMLElement;
    public readMore!: HTMLElement;
    public postDate!: HTMLElement;

    public quickActions!: HTMLDivElement;

    constructor(articleInfo: ArticleInfo, lod = DetailLevel.MEDIUM) {
        super();

        this.article = articleInfo;
        this.lod = lod;

        this.initElement();
    }

    initElement(): void {
        this.style.display = "flex";
        this.style.position = "relative";
        this.setAttribute("lod", DetailLevel.toString(this.lod));

        // heading element
        this.heading = ElementFactory.a(this.lod !== DetailLevel.FULL ? SmartArticle.getLinkTo(this.article) : undefined)
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
        this.readMore = this.lod === DetailLevel.LOW ?
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
                this.lod === DetailLevel.LOW && this.readMore,
                SmartArticle.CAN_UPDATE && ElementFactory.p("edit_square")
                    .id("edit-button")
                    .class("icon", "click-action")
                    .tooltip("Bericht bewerken")
                    .on("click", (ev, self) => {
                        if (this.lod === DetailLevel.FULL) {
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
                                    UserFeedback.success("Bericht succesvol verwijderd.");
                                    if (location.pathname.startsWith("/artikel")) location.href = '/'; // go to homepage
                                    else location.reload();
                                })
                                .catch(err => UserFeedback.error(getErrorMessage(err)));
                        }
                        else {
                            self.textContent = "delete_forever";
                            self.title = "Definitief verwijderen";
                            self.setAttribute("awaiting-confirmation", "");
                            self.classList.add("pulsate-in");

                            UserFeedback.warning("Zeker weten? Een bericht verwijderen kan niet worden teruggedraaid!", 5000);
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
                            .then(() => UserFeedback.success("Link gekopieerd!"))
                            .catch(() => UserFeedback.error("Kan link niet kopiëren, probeer het later opnieuw."));
                    })
            )
            .style({
                position: "absolute",
                right: "var(--in-section-gap)",
                top: "var(--in-section-gap)"
            })
            .make();


        // adding sections to element
        if (this.lod === DetailLevel.LOW) {
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
            this.classList.add("flex-rows", this.lod === DetailLevel.FULL ? "min-section-gap" : "in-section-gap");
            this.append(
                this.heading,
                this.body,
                this.readMore,
                this.postDate,
                this.quickActions
            );
        }
    }

    public static getLinkTo(article: ArticleInfo | string, editMode = false): string {
        if (article instanceof ArticleInfo) article = article.id;

        let out = `${location.origin}/artikel.html?id=${article}`;
        if (editMode) out += "&mode=edit";

        return out;
    }

}

Loading.onDOMContentLoaded().then(() => customElements.define("smart-article", SmartArticle, { extends: "article" }));



export class EditableSmartArticle extends SmartArticle implements HasSections<"category" | "showOnHomepage" | "onlyForMembers" | "saveButton"> {

    public override heading!: HTMLInputElement;
    public override body!: RichTextInput;
    public category!: HTMLInputElement;
    public showOnHomepage!: Switch;
    public onlyForMembers!: Switch;
    public saveButton!: HTMLParagraphElement;

    protected get data(): EditableSmartArticle.PartialArticleInfo {
        return {
            heading: this.heading.value.trim(),
            body: this.body.value,
            created_at: this.article.created_at,
            category: this.category.value.trim(),
            show_on_homepage: this.showOnHomepage.value,
            only_for_members: this.onlyForMembers.value
        };
    }

    private readonly saveAsNew: boolean;
    public onSave: (newArticle: ArticleInfo) => void = () => { };

    constructor(articleInfo: ArticleInfo, lod: DetailLevel, saveAsNew = false) {
        super(articleInfo, lod);

        if (this.saveAsNew = saveAsNew) {
            this.saveButton.textContent = "post_add";
            this.saveButton.title = "Bericht plaatsen";
        }

        window.addEventListener("beforeunload", ev => {
            if (document.body.contains(this) && !ev.defaultPrevented && !EditableSmartArticle.PartialArticleInfo.equals(this.data, this.article)) {
                ev.preventDefault();
            }
        });
    }

    override initElement(): void {
        this.style.display = "flex";
        this.classList.add("flex-rows", "min-section-gap");
        this.setAttribute("lod", DetailLevel.toString(this.lod));

        this.heading = this.appendChild(
            ElementFactory.input.text(this.article.heading)
                .placeholder("Koptitel")
                .class("heading")
                .make()
        );

        this.append(
            ElementFactory.div(undefined, "category-and-switches", "flex-columns", "main-axis-space-evenly", "cross-axis-center", "in-section-gap")
                .children(
                    this.category = ElementFactory.input.text(this.article.category)
                        .placeholder("Categorie")
                        .class("category")
                        .make(),
                    ElementFactory.div(undefined, "show-on-homepage", "flex-columns", "main-axis-space-between", "cross-axis-center", "in-section-gap")
                        .children(
                            ElementFactory.label("Zichtbaar op homepagina?"),
                            this.showOnHomepage = new Switch(this.article.show_on_homepage)
                        ),

                    ElementFactory.div(undefined, "only-for-members", "flex-columns", "main-axis-space-between", "cross-axis-center", "in-section-gap")
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
                            const data = this.data;
                            if (!data.heading) UserFeedback.error("Koptitel is leeg.");
                            else {
                                const heading = this.heading.value.trim();
                                const idPromise = this.saveAsNew ?
                                    EditableSmartArticle.findFreeId(this.article.sourceDB, heading) :
                                    Promise.resolve(this.article.id);

                                idPromise.then(id => {
                                    const newArticle = new ArticleInfo(
                                        this.article.sourceDB,
                                        id,
                                        data.heading,
                                        data.body,
                                        data.created_at,
                                        data.category,
                                        data.show_on_homepage,
                                        data.only_for_members
                                    );

                                    this.article.sourceDB.write(newArticle)
                                        .then(() => {
                                            UserFeedback.success("Wijzigingen opgeslagen!");
                                            this.replaceWith(new SmartArticle(newArticle, this.lod));
                                            this.onSave(newArticle);
                                        })
                                        .catch(err => UserFeedback.error(getErrorMessage(err)));

                                })
                                    .catch(err => UserFeedback.error(getErrorMessage(err)));
                            }
                        })
                        .make(),
                    ElementFactory.p("backspace")
                        .class("cancel-edit-button", "icon", "click-action")
                        .tooltip("Wijzigingen annuleren")
                        .on("click", () => {
                            this.replaceWith(new SmartArticle(this.article, this.lod));
                        })
                )
                .style({
                    position: "absolute",
                    right: "var(--in-section-gap)",
                    top: "var(--in-section-gap)"
                })
                .make()
        );

    }

    private static readonly ALPHANUMERIC_REGEX = /[a-zA-Z0-9]/;
    private static findFreeId(db: ArticleDatabase, heading: string): Promise<string> {

        const words: string[] = [];
        let word = "";
        for (let i = 0; i < heading.length; i++) {
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
        function findN(base: string, n = 0): Promise<string> {
            const id = base + (n ? `-${n}` : "");
            return db.getById(id)
                .then(res => res ? findN(base, n + 1) : id);
        }

        return findN(base);
    }

}

export namespace EditableSmartArticle {
    export interface PartialArticleInfo {
        heading: string,
        body: string,
        created_at: Date,
        category: string,
        show_on_homepage: boolean,
        only_for_members: boolean
    }

    export namespace PartialArticleInfo {
        export function equals(partial: PartialArticleInfo, full: ArticleInfo): boolean {
            return partial.heading === full.heading
                && partial.body === full.body
                && partial.created_at.getTime() === full.created_at.getTime()
                && partial.category === full.category
                && partial.only_for_members === full.only_for_members
                && partial.show_on_homepage === full.show_on_homepage;
        }
    }
}

Loading.onDOMContentLoaded().then(() => customElements.define("editable-smart-article", EditableSmartArticle));