import DateUtil from "../../../util/DateUtil";
import NumberUtil from "../../../util/NumberUtil";
import Paginator from "../Paginator";
import IBSubmissionDatabase, { IBSubmissionInfo, IBSubmissionQueryFilter } from "./IBSubmissionDatabase";

export default class IBSubmissionPaginator extends Paginator<IBSubmissionInfo,IBSubmissionQueryFilter> {

    constructor(db:IBSubmissionDatabase, baseFilter:IBSubmissionQueryFilter, pageSize:number) {
        super(db, baseFilter, pageSize, "descending");
    }

    protected override getMetric(info:IBSubmissionInfo):number { return info.created_at.getTime() }

    protected override getFirstPageFilter(order:Paginator.Order):IBSubmissionQueryFilter {
        return { sortByCreatedAt: order };
    }

    protected override getLastPageFilter(order:Paginator.Order):IBSubmissionQueryFilter {
        return { sortByCreatedAt: Paginator.SortingOrder.oppositeOf(order) };
    }

    protected override getFilterBySupportPage(order: Paginator.Order, supportPage: Paginator.PageInfo<IBSubmissionInfo>, pageIndex: number):IBSubmissionQueryFilter {
        return (supportPage.index < pageIndex) !== (order === "descending") ?
            { after: new Date(supportPage.range.max), sortByCreatedAt: "ascending"} :
            { before: new Date(supportPage.range.min), sortByCreatedAt: "descending" };
    }


}