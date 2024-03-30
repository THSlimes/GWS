import NumberUtil from "../../util/NumberUtil";
import Database, { Info, QueryFilter } from "./Database";

abstract class Paginator<I extends Info , QF extends QueryFilter<I>> {

    private readonly db:Database<I>;
    private readonly baseFilter:QF;
    private readonly pageSize:number;
    private readonly sortOrder:Paginator.Order;

    /**
     * Creates a new Paginator.
     * @param db database to query from
     * @param baseFilter QueryFilter to paginate subset of total data
     * @param pageSize number of infos per page
     * @param sortOrder way to order infos ("ascending" means low metric -> high metric, "descending" means high metric -> low metric)
     */
    constructor(db:Database<I>, baseFilter:QF, pageSize:number, sortOrder:Paginator.Order="descending") {
        this.db = db;
        this.baseFilter = baseFilter;
        this.pageSize = pageSize;
        this.sortOrder = sortOrder;
    }

    private numInfos?:number;
    private numPages?:number;

    /**
     * Determines the number of infos and pages.
     */
    public getSize():Promise<{numInfos:number, numPages:number}> {
        return new Promise((resolve, reject) => {
            if (this.numInfos && this.numPages) resolve({ numInfos: this.numInfos, numPages: this.numPages }); // use retrieved value
            else this.db.count(this.baseFilter) // get count from DB
                .then(num => {
                    resolve({
                        numInfos: this.numInfos = num,
                        numPages: this.numPages = Math.ceil(num / this.pageSize)
                    });
                })
                .catch(reject);
        });
    }

    /** Computes some metric which the infos are sorted by. (e.g. creation timestamp) */
    protected abstract getMetric(info:I):number;

    private readonly pageCache:Record<number,Paginator.PageInfo<I>> = {};

    private addToPageCache(pageIndex:number, infos:I[]):Paginator.PageInfo<I> {
        if (pageIndex in this.pageCache) throw new Error(`page index ${pageIndex} already in cache`);
        else {
            const sorted = infos.toSorted((a1, a2) => this.getMetric(a1) - this.getMetric(a2));
            if (this.sortOrder === "descending") sorted.reverse();

            const metrics = sorted.map(i => this.getMetric(i));
            const [min, max] = [Math.min(...metrics), Math.max(...metrics)];
            
            return this.pageCache[pageIndex] = {
                index: pageIndex,
                infos: sorted,
                range: { min, max }
            };
        }
    }

    protected abstract getFirstPageFilter(order:Paginator.Order):QF;
    protected abstract getLastPageFilter(order:Paginator.Order):QF;
    protected abstract getFilterBySupportPage(order:Paginator.Order, supportPage:Paginator.PageInfo<I>, pageIndex:number):QF;

    public getPage(pageIndex:number):Promise<Paginator.PageInfo<I>> {

        return new Promise((resolve, reject) => {
            if (pageIndex in this.pageCache) resolve(this.pageCache[pageIndex]); // use cached value
            else if (pageIndex < 0) reject(new RangeError(`page index out of range: ${pageIndex} (minimum index is 0)`)); // index too low
            else this.getSize()
                .then(counts => {
                    if (pageIndex >= counts.numPages) {
                        reject(new RangeError(`page index out of range: ${pageIndex} (maximum index is ${counts.numPages-1})`)); // index too high
                    }
                    else if (pageIndex === 0) { // is first page, get fromDB
                        this.db.get({...this.getFirstPageFilter(this.sortOrder), ...this.baseFilter, limit: this.pageSize})
                        .then(articles => resolve(this.addToPageCache(pageIndex, articles)))
                        .catch(reject);
                    }
                    else if (pageIndex === counts.numPages - 1) { // is last page, get from DB
                        const numArticlesInPage = (counts.numInfos % this.pageSize) || this.pageSize; // size of last page may differ
                        this.db.get({ ...this.getLastPageFilter(this.sortOrder), ...this.baseFilter, limit: numArticlesInPage })
                        .then(articles => resolve(this.addToPageCache(pageIndex, articles)))
                        .catch(reject);
                    }
                    else { // neither first nor last page, get from DB
                        const cachedPageIndices = Object.keys(this.pageCache).map(n => parseInt(n));
                        const closestCachedPageIndex = NumberUtil.closest(pageIndex, cachedPageIndices);
                        const supportPageIndex = closestCachedPageIndex < pageIndex ? pageIndex - 1 : pageIndex + 1;
                        
                        this.getPage(supportPageIndex)
                        .then(supportPage => {
                            const filter:QF = { ...this.getFilterBySupportPage(this.sortOrder, supportPage, pageIndex), ...this.baseFilter, limit: this.pageSize };
                                                        
                            this.db.get(filter)
                            .then(articles => resolve(this.addToPageCache(pageIndex, articles)))
                            .catch(reject);
                        })
                        .catch(reject);
                    }
                })
                .catch(reject);
        });
    }
}

namespace Paginator {
    export type Order = "ascending" | "descending";
    export namespace SortingOrder {
        export function oppositeOf(order:Order):Order {
            return order === "ascending" ? "descending" : "ascending";
        }
    }

    export interface PageInfo<I extends Info> {
        index: number,
        infos: I[],
        range: { min:number, max:number }
    }
}

export default Paginator;