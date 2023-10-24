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

}

export type EventInfo = { id:string, name:string, description:string, starts_at:Date, ends_at:Date, category:string };
export type EventFilterOptions = QueryOptions & {
    before?:Date,
    after?:Date,
    category?:string
};

export abstract class EventDatabase {
    abstract get(limit:number, options?:Omit<EventFilterOptions,"limit">):Promise<EventInfo[]>;

    abstract count(options?:EventFilterOptions):Promise<number>;

    abstract getRange(before:Date, after:Date, options?:Omit<EventFilterOptions,"before"|"after">):Promise<EventInfo[]>;

    abstract getById(id:string):Promise<EventInfo|undefined>;

    abstract getByCategory(category:string, options?:Omit<EventFilterOptions,"category">):Promise<EventInfo[]>;
}