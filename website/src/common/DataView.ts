import Database, { Info, QueryFilter } from "./firebase/database/Database";

function valuesEqual(a:any, b:any):boolean {
    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
    else return a === b;
}

function copy<T extends Record<string, any>>(obj:T):T {
    const out:any = {};
    for (const k in obj) {
        const v = obj[k] as any;
        out[k] = v instanceof Date ? new Date(v) : v;
    }
    
    return out as T;
}

/**
 * A DataView allows for easy editing of collections of data.
 * @param T type of a data entry
 */
export default abstract class DataView<T extends Record<string,any>> {

    private entries:T[]|null = null;
    /** Promise used to retrieve data upon constructor call. */
    private readonly dataPromise?:Promise<T[]>;
    /** Promise which resolves when the data is ready to be used. */
    public dataReady():Promise<void> {
        return new Promise((resolve,reject) => {
            if (this.entries === null) this.dataPromise!
                .then(() => resolve())
                .catch(reject);
            else resolve();
        });
    }

    private _dataModified = false;
    protected get dataModified() { return this._dataModified; }

    private get length() {
        if (this.entries === null) throw new DataPendingError();
        return this.entries.length;
    }

    /**
     * Creates a new DataView.
     * @param data either the data itself, or a promise which resolves with the data
     */
    constructor(data:T[]|Promise<T[]>) {
        if (Array.isArray(data)) this.entries = data;
        else {
            this.dataPromise = data;
            data.then(data => this.entries = data);
        }

        // wrap save function
        const oldSave = this.save;
        this.save = function() {
            if (this.dataModified) return oldSave();
            else return new Promise((resolve,reject) => resolve());
        }
    }

    private get(index:number):T {
        if (this.entries === null) throw new DataPendingError();
        else if (index < 0 || index >= this.length) throw new RangeError(`index ${index} is out of range for length ${this.length}`);
        else return this.entries[index];
    }

    /**
     * Retrieves a copy of the entry at the given index.
     * @param index index of entry
     * @returns entry at index 'index'
     */
    public getCopy(index:number) {
        return copy(this.get(index));
    }

    /**
     * Iterates over copies of all entries.
     */
    *[Symbol.iterator]() {
        for (let i = 0; i < this.length; i ++) {
            yield this.getCopy(i);
        }
    }

    /**
     * Gets the value of an entry.
     * @param index index of the entry
     * @param key key of the value in the entry
     * @returns the value associate with 'key' in the entry at index 'index'
     */
    public getValue<K extends keyof T>(index:number, key:K):T[K] {
        return this.get(index)[key];
    }
    
    /**
     * Sets the value of an entry.
     * @param index index of the entry
     * @param key key of the value in the entry
     * @param newVal new value to be associated with the key
     * @returns whether the value was changed
     */
    public setValue<K extends keyof T>(index:number, key:K, newVal:T[K]):boolean {
        const entry = this.get(index);
        if (valuesEqual(entry[key], newVal)) return false;
        else {
            entry[key] = newVal;
            this._dataModified = true;
            return true;
        }
    }

    abstract save():Promise<void>;

}

/**
 * A DatabaseDataView is a type of DataView which allows easy editing
 * of (a subset of) values in a database.
 * @param I type of data in the database
 */
export class DatabaseDataView<I extends Info> extends DataView<I> {

    private readonly db:Database<I>;

    constructor(db:Database<I>, options:QueryFilter<I>={}) {
        super(db.get(options));

        this.db = db;
    }

    save(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    
}

/** A type of Error to be thrown when data is still being retrieved. */
class DataPendingError extends Error {

    constructor() {
        super("the requested data has not been retrieved yet");
    }

}