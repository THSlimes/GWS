export type QueryOptions = {
    /** Maximum number of retrieved records. */
    limit?:number,
    /** Specific ID of record to be retrieved. */
    id?:string,
    /** Specific ID excluded from retrieved records. */
    notId?:string,
    startAt?:number,
    startAfter?:number,
    endAt?:number,
    endBefore?:number
}

export type ArticleInfo = { index:number, id:string, heading:string, body:string, created_at:Date, category:string }
export type ArticleFilterOptions = QueryOptions & {
    /** Way of sorting by the creation timestamp. */
    sortByIndex?:"ascending"|"descending",
    /** Latest possibly date (exclusive) of retrieved records. */
    before?:Date,
    /** Earliest possibly date (exclusive) of retrieved records. */
    after?:Date,
    /** Category of retrieved records. */
    category?:string
};

export abstract class ArticleDatabase {
    /** Attempts to get a specific article using its ID. */
    abstract getById(id:string):Promise<ArticleInfo|undefined>;
    /** Gets the most recent articles. */
    abstract getRecent(limit:number, options?:ArticleFilterOptions):Promise<ArticleInfo[]>;
    /** Retrieves the number of articles posted before the given date. */
    abstract getNumBefore(before:Date, options?:ArticleFilterOptions):Promise<number>;
    /** Retrieves the number of articles posted after the given date. */
    abstract getNumAfter(after:Date, options?:ArticleFilterOptions):Promise<number>;
    /** Gets articles with the given category. */
    abstract getByCategory(category:string, options?:ArticleFilterOptions):Promise<ArticleInfo[]>;
}

/**
 * A Database interacts with a data storage in a controlled way.
 */
export default interface Database {

    readonly articles:ArticleDatabase;

}