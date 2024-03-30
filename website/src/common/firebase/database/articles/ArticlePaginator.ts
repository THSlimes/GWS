import Paginator from "../Paginator";
import ArticleDatabase, { ArticleInfo, ArticleQueryFilter } from "./ArticleDatabase";

export default class ArticlePaginator extends Paginator<ArticleInfo,ArticleQueryFilter> {

    constructor(db:ArticleDatabase, baseFilter:ArticleQueryFilter, pageSize:number) {
        super(db, baseFilter, pageSize, "descending");
    }

    protected override getMetric(info:ArticleInfo):number { return info.created_at.getTime() }

    protected override getFirstPageFilter(order:Paginator.Order):ArticleQueryFilter {
        return { sortByCreatedAt: order };
    }

    protected override getLastPageFilter(order:Paginator.Order):ArticleQueryFilter {
        return { sortByCreatedAt: Paginator.SortingOrder.oppositeOf(order) };
    }

    protected override getFilterBySupportPage(order: Paginator.Order, supportPage: Paginator.PageInfo<ArticleInfo>, pageIndex: number): ArticleQueryFilter {
        return (supportPage.index < pageIndex) !== (order === "descending") ?
            { after: new Date(supportPage.range.max), sortByCreatedAt: "ascending"} :
            { before: new Date(supportPage.range.min), sortByCreatedAt: "descending" };
    }

}