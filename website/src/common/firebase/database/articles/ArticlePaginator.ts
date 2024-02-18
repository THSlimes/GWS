import DateUtil from "../../../util/DateUtil";
import NumberUtil from "../../../util/NumberUtil";
import ArticleDatabase, { ArticleInfo, ArticleQueryFilter } from "./ArticleDatabase";

type SortingOrder = "ascending" | "descending";
function opposite(order:SortingOrder):SortingOrder {
    return order === "ascending" ? "descending" : "ascending";
}

type NonTimedArticleQueryFilter = Omit<ArticleQueryFilter, "sortByCreatedAt"|"before"|"after"|"limit">;

interface PageInfo {
    index: number,
    articles: ArticleInfo[],
    range: { min:Date, max:Date }
}

export default class ArticlePaginator {

    private readonly db:ArticleDatabase;
    private readonly pageSize:number;
    private readonly baseFilter:NonTimedArticleQueryFilter;
    private sortOrder:SortingOrder;

    constructor(db:ArticleDatabase, pageSize:number, baseFilter:NonTimedArticleQueryFilter, sortOrder:SortingOrder="descending") {
        this.db = db;
        this.pageSize = Math.floor(pageSize);
        this.baseFilter = baseFilter;
        this.sortOrder = sortOrder;
    }

    private numArticles?:number;
    private numPages?:number;

    /**
     * Determines the number of articles and pages.
     */
    public getSize():Promise<{numArticles:number, numPages:number}> {
        return new Promise((resolve, reject) => {
            if (this.numArticles && this.numPages) resolve({ numArticles: this.numArticles, numPages: this.numPages }); // use retrieved value
            else this.db.count(this.baseFilter) // get count from DB
                .then(num => {
                    resolve({
                        numArticles: this.numArticles = num,
                        numPages: this.numPages = Math.ceil(num / this.pageSize)
                    });
                })
                .catch(reject);
        });
    }



    private readonly pageCache:Record<number,PageInfo> = {};

    private addToPageCache(pageIndex:number, articles:ArticleInfo[]):PageInfo {
        if (pageIndex in this.pageCache) throw new Error(`page index ${pageIndex} already in cache`);
        else {
            const sorted = articles.toSorted((a1, a2) => a1.created_at.getTime() - a2.created_at.getTime());
            if (this.sortOrder === "descending") sorted.reverse();

            const [min, max] = [DateUtil.Timestamps.earliest(...sorted.map(a => a.created_at)), DateUtil.Timestamps.latest(...sorted.map(a => a.created_at))];
            
            return this.pageCache[pageIndex] = {
                index: pageIndex,
                articles: sorted,
                range: { min, max }
            };
        }
    }

    public getPage(pageIndex:number):Promise<PageInfo> {

        return new Promise((resolve, reject) => {
            if (pageIndex in this.pageCache) resolve(this.pageCache[pageIndex]); // use cached value
            else if (pageIndex < 0) reject(new RangeError(`page index out of range: ${pageIndex} (minimum index is 0)`)); // index too low
            else this.getSize()
                .then(counts => {
                    if (pageIndex >= counts.numPages) {
                        reject(new RangeError(`page index out of range: ${pageIndex} (maximum index is ${counts.numPages-1})`)); // index too high
                    }
                    else if (pageIndex === 0) { // is first page, get fromDB
                        this.db.get({ ...this.baseFilter, sortByCreatedAt: this.sortOrder, limit: this.pageSize})
                        .then(articles => resolve(this.addToPageCache(pageIndex, articles)))
                        .catch(reject);
                    }
                    else if (pageIndex === counts.numPages - 1) { // is last page, get from DB
                        const numArticlesInPage = (counts.numArticles % this.pageSize) || this.pageSize; // size of last page may differ
                        const queryFilter:ArticleQueryFilter = { ...this.baseFilter, sortByCreatedAt: opposite(this.sortOrder), limit: numArticlesInPage };
                        this.db.get(queryFilter)
                        .then(articles => resolve(this.addToPageCache(pageIndex, articles)))
                        .catch(reject);
                    }
                    else { // neither first nor last page, get from DB                        
                        const cachedPageIndices = Object.keys(this.pageCache).map(n => parseInt(n));
                        const closestCachedPageIndex = NumberUtil.closest(pageIndex, cachedPageIndices);
                        const supportPageIndex = closestCachedPageIndex < pageIndex ? pageIndex - 1 : pageIndex + 1;
                        
                        this.getPage(supportPageIndex)
                        .then(supportPage => {
                            const filter:ArticleQueryFilter = (supportPage.index < pageIndex) !== (this.sortOrder === "descending") ?
                                { ...this.baseFilter, after: supportPage.range.max, sortByCreatedAt: "ascending", limit: this.pageSize } :
                                { ...this.baseFilter, before: supportPage.range.min, sortByCreatedAt: "descending", limit: this.pageSize };
                                                        
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