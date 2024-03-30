import ElementFactory from "../html-element-factory/ElementFactory";
import { HasSections } from "../util/UtilTypes";
import NodeUtil from "../util/NodeUtil";
import Loading from "../Loading";
import Paginator from "../firebase/database/Paginator";
import { Info, QueryFilter } from "../firebase/database/Database";

class InfoList<I extends Info> extends HTMLElement implements HasSections<InfoList.SectionName> {

    private readonly paginator:Paginator<I,QueryFilter<I>>;
    private currentPageIndex = 0;

    public currentPage!:HTMLDivElement;
    public pageNavigator!:HTMLDivElement;

    public firstPageButton!:HTMLInputElement;
    public previousPageButton!:HTMLInputElement;
    public nextPageButton!:HTMLInputElement;
    public lastPageButton!:HTMLInputElement;
    public pageNumber!:HTMLSpanElement;

    private readonly elementConstructor:(info:I)=>HTMLElement;

    constructor(paginator:Paginator<I,QueryFilter<I>>, constr:(info:I)=>HTMLElement) {
        super();

        this.paginator = paginator;
        this.elementConstructor = constr;
        
        this.initElement();
    }

    initElement():void {
        this.style.display = "flex";
        this.classList.add("flex-rows", "section-gap");

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
                }).class("icon").disabled(sizes.numInfos === 0).make(),
                this.previousPageButton = ElementFactory.input.button("navigate_before", () => {
                    this.loadPage(this.currentPageIndex = Math.max(0, this.currentPageIndex - 1), true);
                }).class("icon").disabled(sizes.numInfos === 0).make(),
                this.nextPageButton = ElementFactory.input.button("navigate_next", () => {
                    this.loadPage(this.currentPageIndex = Math.min(sizes.numPages - 1, this.currentPageIndex + 1), true);
                }).class("icon").disabled(sizes.numInfos === 0).make(),
                this.lastPageButton = ElementFactory.input.button("last_page", () => {
                    this.loadPage(this.currentPageIndex = sizes.numPages - 1, true);
                }).class("icon").disabled(sizes.numInfos === 0).make(),
            );

            if (sizes.numInfos > 0) this.loadPage(this.currentPageIndex);
        })
        .catch(console.error);
    }

    private loadPage(pageIndex:number, scrollToTop=false):Promise<void> {
        Loading.markLoadStart(this);

        return new Promise((resolve, reject) => {
            this.paginator.getPage(pageIndex)
            .then(info => {
                NodeUtil.empty(this.currentPage); // clear old articles
                this.currentPage.append(...info.infos.map(i => this.elementConstructor(i))); // add article elements

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

            Loading.markLoadEnd(this);
        });
    }

}

namespace InfoList {
    export type SectionName = "currentPage"|"pageNavigator"|"firstPageButton"|"previousPageButton"|"nextPageButton"|"lastPageButton"|"pageNumber";
}

export default InfoList;

Loading.onDOMContentLoaded()
.then(() => customElements.define("info-list", InfoList));