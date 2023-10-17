import { Timestamp } from "@firebase/firestore";

export type ArticleInfo = { id:string, heading:string, body:string, created_at:Date, category:string }
export type ArticleFilterOptions = {
    /** Maximum number of retrieved records. */
    limit?:number,
    /** Way of sorting by the creation timestamp. */
    createdAtSort?:"ascending"|"descending",
    /** Latest possibly date (exclusive) of retrieved records. */
    before?:Date,
    /** Earliest possibly date (exclusive) of retrieved records. */
    after?:Date,
    /** Category of retrieved records. */
    category?:string,
    /** Specific ID of record to be retrieved. */
    id?:string,
    /** Specific ID excluded from retrieved records. */
    notId?:string
};

export abstract class ArticleDatabase {
    abstract byId(id:string):Promise<ArticleInfo|undefined>;
    abstract recent(limit:number, options?:ArticleFilterOptions):Promise<ArticleInfo[]>;
    abstract byCategory(category:string, options?:ArticleFilterOptions):Promise<ArticleInfo[]>;
}

/**
 * A Database interacts with a data storage in a controlled way.
 */
export default interface Database {

    readonly articles:ArticleDatabase;

}