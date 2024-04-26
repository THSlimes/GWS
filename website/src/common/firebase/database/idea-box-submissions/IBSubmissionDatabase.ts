import ObjectUtil from "../../../util/ObjectUtil";
import Database, { Info, QueryFilter } from "../Database";
import { UserInfo } from "../users/UserDatabase";

export class IBSubmissionInfo extends Info {

    public readonly author:IBSubmissionInfo.Author;
    public readonly created_at:Date;
    public readonly subject:string;
    public readonly body:string;

    constructor(id:string, author:IBSubmissionInfo.Author, created_at:Date, subject:string, body:string) {
        super(id, []);

        this.author = author;
        this.created_at = created_at;
        this.subject = subject;
        this.body = body;
    }

    public override copy():IBSubmissionInfo {
        return new IBSubmissionInfo(this.id, typeof this.author === "string" ? this.author : {...this.author}, new Date(this.created_at), this.subject, this.body);
    }

    public override satisfies(options:IBSubmissionQueryFilter): boolean {
        return super.satisfies(options)
            && (options.before !== undefined && this.created_at < options.before)
            && (options.after !== undefined && options.after < this.created_at)
            && (options.isAnonymous !== true || this.author === "anonymous")
            && (options.isAnonymous !== false || this.author !== "anonymous");
    }

    public override equals(other:IBSubmissionInfo): boolean {
        return super.equals(other)
            && ObjectUtil.deepEquals(other.author, this.author)
            && other.body === this.body
            && other.created_at.getTime() === this.created_at.getTime()
            && other.subject === this.subject;
    }

}

export namespace IBSubmissionInfo {
    export type Author = { id:string, name:string } | "anonymous";
}

export type IBSubmissionQueryFilter = QueryFilter & {
    /** Way of sorting by the creation timestamp. */
    sortByCreatedAt?:"ascending" | "descending";
    /** Latest possibly date (exclusive) of retrieved records. */
    before?:Date;
    /** Earliest possibly date (exclusive) of retrieved records. */
    after?:Date;
    /** Whether the submission is anonymous. */
    isAnonymous?:boolean;
}

export default abstract class IBSubmissionDatabase extends Database<IBSubmissionInfo> {

    abstract override get(options?:IBSubmissionQueryFilter): Promise<IBSubmissionInfo[]>;
    abstract override count(options?:IBSubmissionQueryFilter): Promise<number>;
    protected abstract override doWrite(...records: IBSubmissionInfo[]): Promise<number>;
    protected abstract override doDelete(...records: IBSubmissionInfo[]): Promise<number>;

}