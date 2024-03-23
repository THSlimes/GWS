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

    public equals(other:Info) {
        return other.id === this.id;
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

    /** Method to be implemented by subclass. */
    protected abstract doWrite(...records:I[]):Promise<number>
    private readonly writeHandlers:((...newRecords:I[])=>void)[] = [];
    public set onWrite(newHandler:(...newRecords:I[])=>void) {
        this.writeHandlers.push(newHandler);
    }

    /**
     * Writes the given records to the database. (if a record with a given ID
     * already exists, it is updated, otherwise it is created)
     * @param records data to write
     * @returns Promise that resolves with the number of edited records
     */
    public write(...records:I[]):Promise<number> {
        return new Promise((resolve,reject) => {
            this.doWrite(...records)
            .then(count => {
                resolve(count);
                this.writeHandlers.forEach(h => h(...records));
            })
            .catch(reject);
        });
    }
    
    /** Method to be implemented by subclass. */
    protected abstract doDelete(...records:I[]):Promise<number>
    private readonly deleteHandlers:((...newRecords:I[])=>void)[] = [];
    public set onDelete(newHandler:(...newRecords:I[])=>void) {
        this.deleteHandlers.push(newHandler);
    }

    /**
     * Deletes records from the datebase.
     * @param ids IDs of records to be deleted
     * @returns Promise that resolves with the number of deleted records
     */
    public delete(...records:I[]):Promise<number> {
        return new Promise((resolve,reject) => {
            this.doDelete(...records)
            .then(count => {
                resolve(count);
                this.deleteHandlers.forEach(h => h(...records));
            })
            .catch(reject);
        });
    }

}