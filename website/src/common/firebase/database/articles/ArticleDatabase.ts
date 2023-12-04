import QueryOptions from "../QueryOptions";

export type ArticleFilterOptions = QueryOptions & {
    /** Way of sorting by the creation timestamp. */
    sortByCreatedAt?: "ascending" | "descending";
    /** Latest possibly date (exclusive) of retrieved records. */
    before?: Date;
    /** Earliest possibly date (exclusive) of retrieved records. */
    after?: Date;
    /** Category of retrieved records. */
    category?: string;
    /** Whether to only retrieve articles to be shown on the homepage. */
    forHomepage?: boolean;
};

export class ArticleInfo {

    public readonly id:string;
    public readonly heading:string;
    public readonly body:string;
    public readonly created_at:Date;
    public readonly category:string;
    public readonly show_on_homepage:boolean;

    constructor(id:string, heading:string, body:string, created_at:Date, category:string, show_on_homepage:boolean) {
        this.id = id;
        this.heading = heading;
        this.body = body;
        this.created_at = created_at;
        this.category = category;
        this.show_on_homepage = show_on_homepage;
    }

    public satisfies(options:ArticleFilterOptions):boolean {
        if (options.after && options.after >= this.created_at) return false;
        else if (options.before && options.before <= this.created_at) return false;
        else if (options.category && options.category !== this.category) return false;
        else if (options.forHomepage && !this.show_on_homepage) return false;
        else if (options.id && options.id !== this.id) return false;
        else if (options.limit === 0) return false;
        else if (options.notId && options.notId === this.id) return false;
        else return true;
    }

}

export default abstract class ArticleDatabase {
    /** Retrieves articles from the database. */
    abstract get(limit: number, options?: Omit<ArticleFilterOptions, "limit">): Promise<ArticleInfo[]>;

    /** Gets the amount of articles that match the filtering options. */
    abstract count(options?: ArticleFilterOptions): Promise<number>;

    /** Attempts to get a specific article using its ID. */
    abstract getById(id: string): Promise<ArticleInfo | undefined>;

    /** Gets articles with the given category. */
    abstract getByCategory(category: string, options?: Omit<ArticleFilterOptions, "category">): Promise<ArticleInfo[]>;

    /** Retrieves the next posted article. */
    abstract getNext(article: ArticleInfo, options?: Omit<ArticleFilterOptions, "limit" | "before" | "after" | "sortByCreatedAt">): Promise<ArticleInfo | undefined>;

    /** Retrieves the previous posted article. */
    abstract getPrevious(article: ArticleInfo, options?: Omit<ArticleFilterOptions, "limit" | "before" | "after" | "sortByCreatedAt">): Promise<ArticleInfo | undefined>;

}
