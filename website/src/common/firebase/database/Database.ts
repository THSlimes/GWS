export abstract class Info {

    public readonly id:string;

    constructor(id:string) {
        this.id = id;
    }

    public satisfies(options:QueryFilter<Info>) {
        if (options.id && this.id !== options.id) return false;
        else if (options.notId && this.id === options.notId) return false;
        else if (options.limit === 0) return false;
        else return true;
    }

}

export type QueryFilter<I extends Info = Info> = {
    /** Maximum number of retrieved records. */
    limit?: number;
    /** Specific ID of record to be retrieved. */
    id?: string;
    /** Specific ID excluded from retrieved records. */
    notId?: string;
};

export default abstract class Database<I extends Info> {

    public abstract getById(id:string):Promise<I|undefined>;

    public abstract get(options?:QueryFilter<I>):Promise<I[]>;

    public abstract count(options?:QueryFilter<I>):Promise<number>;

}
