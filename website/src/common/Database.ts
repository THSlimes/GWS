import { Timestamp } from "@firebase/firestore";

/** Structure of an article stored in the database */
export type DBArticle = { id:string, heading:string, body:string, created_at:Timestamp, category:string };
export type ArticleQueryOptions = {
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
    abstract byId(id:string):Promise<DBArticle|undefined>;
    abstract recent(limit:number, before?:Date, options?:ArticleQueryOptions):Promise<DBArticle[]>;
    abstract byCategory(category:string, options?:ArticleQueryOptions):Promise<DBArticle[]>;
}

/**
 * A Database interacts with a data storage in a controlled way.
 */
export default interface Database {

    readonly articles:ArticleDatabase;

}