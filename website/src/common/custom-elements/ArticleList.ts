import ArticlePaginator from "../firebase/database/articles/ArticlePaginator";
import { FirestoreArticleDatabase } from "../firebase/database/articles/FirestoreArticleDatabase";
import ElementFactory from "../html-element-factory/ElementFactory";
import ElementUtil from "../util/ElementUtil";
import { HasSections } from "../util/UtilTypes";
import NodeUtil from "../util/NodeUtil";
import SmartArticle, { ArticleLOD } from "./SmartArticle";

type ArticleListSection = "currentPage"|"pageNavigator"|"firstPageButton"|"previousPageButton"|"nextPageButton"|"lastPageButton"|"pageNumber";
export default class ArticleList extends HTMLElement implements HasSections<ArticleListSection> {

    private readonly paginator:ArticlePaginator;
    private currentPageIndex = 0;

    private _lod:ArticleLOD;
    public get lod() { return this._lod; }

    public currentPage!:HTMLDivElement;
    public pageNavigator!:HTMLDivElement;

    public firstPageButton!:HTMLInputElement;
    public previousPageButton!:HTMLInputElement;
    public nextPageButton!:HTMLInputElement;
    public lastPageButton!:HTMLInputElement;
    public pageNumber!:HTMLSpanElement;

    constructor(paginator?:ArticlePaginator, lod?:ArticleLOD) {
        super();

        this.paginator = paginator ?? new ArticlePaginator(
            new FirestoreArticleDatabase(),
            ElementUtil.getAttrAsNumber(this, "page-size", false) ?? 5,
            { forHomepage: true, forMembers: false }
        );

        this._lod = lod ?? ElementUtil.getAttrAs<ArticleLOD>(this, "lod", val => ["full","medium","low"].includes(val)) ?? "medium";
        
        this.initElement();
    }

    initElement(): void {
        this.style.display = "flex";
        this.classList.add("flex-rows", "section-gap");
        this.setAttribute("lod", this.lod);

        this.currentPage = this.appendChild(
            ElementFactory.div(undefined, "current-page", "flex-rows", "section-gap")
                .make()
        );

        this.pageNavigator = this.appendChild(
            ElementFactory.div(undefined, "page-navigator", "flex-columns", "cross-axis-center", "in-section-gap")
                .children(
                    ElementFactory.p()
                        .class("flex-columns", "cross-axis-center", "in-section-gap", "no-margin")
                        .children(
                            ElementFactory.span("Pagina"),
                            this.pageNumber = ElementFactory.span("1 / ?").make()
                        )
                )
                .make()
        );

        this.paginator.getSize()
        .then(sizes => {
            this.pageNavigator.prepend(
                this.firstPageButton = ElementFactory.input.button("first_page", () => {
                    this.loadPage(this.currentPageIndex = 0, true);
                }).class("icon").make(),
                this.previousPageButton = ElementFactory.input.button("navigate_before", () => {
                    this.loadPage(this.currentPageIndex = Math.max(0, this.currentPageIndex - 1), true);
                }).class("icon").make(),
                this.nextPageButton = ElementFactory.input.button("navigate_next", () => {
                    this.loadPage(this.currentPageIndex = Math.min(sizes.numPages - 1, this.currentPageIndex + 1), true);
                }).class("icon").make(),
                this.lastPageButton = ElementFactory.input.button("last_page", () => {
                    this.loadPage(this.currentPageIndex = sizes.numPages - 1, true);
                }).class("icon").make(),
            );

            this.loadPage(this.currentPageIndex);
        })
        .catch(console.error);
    }

    private loadPage(pageIndex:number, scrollToTop=false):Promise<void> {
        NodeUtil.empty(this.currentPage); // clear old articles
        
        return new Promise((resolve, reject) => {
            this.paginator.getPage(pageIndex)
            .then(info => {
                this.currentPage.append(...info.articles.map(a => new SmartArticle(a, this.lod))); // add article elements

                this.paginator.getSize()
                .then(sizes => {
                    this.pageNumber.textContent = `${pageIndex + 1}/${sizes.numPages}`;

                    if (scrollToTop) window.scrollBy({ top: this.currentPage.getBoundingClientRect().top, behavior: "smooth" });
                    this.firstPageButton.disabled = this.previousPageButton.disabled = pageIndex === 0;
                    this.lastPageButton.disabled = this.nextPageButton.disabled = pageIndex === sizes.numPages - 1;
                })
                .catch(console.error);
            })
            .catch(reject);
        });
    }

}

window.addEventListener("DOMContentLoaded", () => customElements.define("article-list", ArticleList));