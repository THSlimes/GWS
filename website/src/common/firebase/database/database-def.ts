import { Permission } from "./Permission";

export type QueryOptions = {
    /** Maximum number of retrieved records. */
    limit?:number,
    /** Specific ID of record to be retrieved. */
    id?:string,
    /** Specific ID excluded from retrieved records. */
    notId?:string
}

export type ArticleInfo = { id:string, heading:string, body:string, created_at:Date, category:string, show_on_homepage:boolean }
export type ArticleFilterOptions = QueryOptions & {
    /** Way of sorting by the creation timestamp. */
    sortByCreatedAt?:"ascending"|"descending",
    /** Latest possibly date (exclusive) of retrieved records. */
    before?:Date,
    /** Earliest possibly date (exclusive) of retrieved records. */
    after?:Date,
    /** Category of retrieved records. */
    category?:string,
    /** Whether to only retrieve articles to be shown on the homepage. */
    forHomepage?:boolean
};

export abstract class ArticleDatabase {
    /** Retrieves articles from the database. */
    abstract get(limit:number, options?:Omit<ArticleFilterOptions,"limit">):Promise<ArticleInfo[]>;

    /** Gets the amount of articles that match the filtering options. */
    abstract count(options?:ArticleFilterOptions):Promise<number>;

    /** Attempts to get a specific article using its ID. */
    abstract getById(id:string):Promise<ArticleInfo|undefined>;

    /** Gets articles with the given category. */
    abstract getByCategory(category:string, options?:Omit<ArticleFilterOptions,"category">):Promise<ArticleInfo[]>;

    /** Retrieves the next posted article. */
    abstract getNext(article:ArticleInfo, options?:Omit<ArticleFilterOptions,"limit"|"before"|"after"|"sortByCreatedAt">):Promise<ArticleInfo|undefined>;
    
    /** Retrieves the previous posted article. */
    abstract getPrevious(article:ArticleInfo, options?:Omit<ArticleFilterOptions,"limit"|"before"|"after"|"sortByCreatedAt">):Promise<ArticleInfo|undefined>;

}

export type UserInfo = { id:string, joined_at:Date, member_until:Date, first_name:string, family_name:string, permissions:Permission[] };
export type UserFilterOptions = QueryOptions & {
    joined_before?:Date,
    joined_after?:Date,
    is_member?:boolean,
    has_permission?: Permission
};

export abstract class UserDatabase {
    abstract get(limit:number, options?:Omit<UserFilterOptions,"limit">):Promise<UserInfo[]>;

    abstract count(options?:UserFilterOptions):Promise<number>;

    abstract getById(id:string):Promise<UserInfo|undefined>;
}