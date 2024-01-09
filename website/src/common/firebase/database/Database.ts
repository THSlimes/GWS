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

    /**
     * Retrieves the record with the given ID 'id'.
     * @param id ID of the record to be retrieved
     * @returns Promise that resolves with the data record (or undefined if no
     * record with the given ID exists)
     */
    public abstract getById(id:string):Promise<I|undefined>;

    /**
     * Retrieves all records matching the given filter.
     * @param options query filter
     * @returns Promise that resolves with the requested records
     */
    public abstract get(options?:QueryFilter<I>):Promise<I[]>;
    
    /**
     * Counts how many records match the given filter.
     * @param options query filter
     * @returns Promise that resolves with the number of matching records
     */
    public abstract count(options?:QueryFilter<I>):Promise<number>;

    /**
     * Writes the given records to the database. (if a record with a given ID
     * already exists, it is updated, otherwise it is created)
     * @param records data to write
     * @returns Promise that resolves with the number of edited records
     */
    public abstract write(...records:I[]):Promise<number>;

}
