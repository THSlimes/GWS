import Database, { Info, QueryFilter } from "../Database";

export class ArticleInfo extends Info {

    /** The Database from where the ArticleInfo was retrieved. */
    public readonly sourceDB:ArticleDatabase;

    public readonly heading:string;
    public readonly body:string;
    public readonly created_at:Date;
    public readonly category:string;
    public readonly show_on_homepage:boolean;
    public readonly only_for_members:boolean

    constructor(sourceDB:ArticleDatabase, id:string, heading:string, body:string, created_at:Date, category:string, show_on_homepage:boolean, only_for_members:boolean) {
        super(id);

        this.sourceDB = sourceDB;
        this.heading = heading;
        this.body = body;
        this.created_at = created_at;
        this.category = category;
        this.show_on_homepage = show_on_homepage;
        this.only_for_members = only_for_members;
    }

    public override satisfies(options:ArticleQueryFilter):boolean {
        if (!super.satisfies(options)) return false;
        else if (options.after && options.after >= this.created_at) return false;
        else if (options.before && options.before <= this.created_at) return false;
        else if (options.category && options.category !== this.category) return false;
        else if (options.forHomepage && !this.show_on_homepage) return false;
        else return true;
    }

    public override equals(other:ArticleInfo):boolean {
        return super.equals(other)
            && other.heading === this.heading
            && other.body === this.body
            && other.created_at.getTime() === this.created_at.getTime()
            && other.category === this.category
            && other.show_on_homepage === this.show_on_homepage
            && other.only_for_members === this.only_for_members;
    }

}

export type ArticleQueryFilter = QueryFilter<Info> & {
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
    /** Whether to only retrieve articles that are (not) for members only. */
    forMembers?: boolean;
};

export default abstract class ArticleDatabase extends Database<ArticleInfo> {

    abstract override get(options?:ArticleQueryFilter): Promise<ArticleInfo[]>;
    abstract override count(options?:ArticleQueryFilter): Promise<number>;
    abstract override doWrite(...records: ArticleInfo[]): Promise<number>;
    abstract override doDelete(...records: ArticleInfo[]): Promise<number>;

    /** Gets articles with the given category. */
    abstract getByCategory(category: string, options?: Omit<ArticleQueryFilter, "category">): Promise<ArticleInfo[]>;

    /** Retrieves the next posted article. */
    abstract getNext(article: ArticleInfo, options?: Omit<ArticleQueryFilter, "limit" | "before" | "after" | "sortByCreatedAt">): Promise<ArticleInfo | undefined>;

    /** Retrieves the previous posted article. */
    abstract getPrevious(article: ArticleInfo, options?: Omit<ArticleQueryFilter, "limit" | "before" | "after" | "sortByCreatedAt">): Promise<ArticleInfo | undefined>;

}
