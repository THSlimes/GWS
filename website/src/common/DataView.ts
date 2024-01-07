import Database, { Info, QueryFilter } from "./firebase/database/Database";

function valuesEqual(a:any, b:any):boolean {
    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
    else return a === b;
}

function deepCopy<T>(arg:T):T {
    if (typeof arg === "object") {
        if (Array.isArray(arg)) return [...arg].map(deepCopy) as T; // is array
        else if (arg instanceof Date) return new Date(arg) as T;
        else { // some other object
            const out:any = {};
            for (const k in arg) out[k] = deepCopy(arg[k]);
            return out;
        }
    }
    else return arg; // copy primitive by value
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
    public onDataReady():Promise<void> {
        return new Promise((resolve,reject) => {
            if (this.entries === null) this.dataPromise!
                .then(() => resolve())
                .catch(reject);
            else resolve();
        });
    }

    private _dataModified = false;
    protected get dataModified() { return this._dataModified; }
    private _onDataModified:VoidFunction = () => {};
    public set onDataModified(newHandler:VoidFunction) { this._onDataModified = newHandler; }

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
            data
            .then(data => {
                this.entries = data;
                console.log("GOT DATA!");
                
            })
            .catch(console.error);
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
        return deepCopy(this.get(index));
    }

    /**
     * Iterates over copies of all entries.
     */
    *[Symbol.iterator]() {
        for (let i = 0; i < this.length; i ++) {
            yield this.getCopy(i);
        }
    }

    public map<U>(callbackfn:(value:T, index:number, array:T[]) => U):U[] {
        const arr = [...this];
        return arr.map(callbackfn);
    }

    public forEach(callbackfn:(value:T, index:number, array:T[]) => void) {
        const arr = [...this];
        return arr.forEach(callbackfn);
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
            if (this._onDataModified) this._onDataModified();
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
    /** Whether the data is currently being delayed. */
    private dataDelayed:boolean;
    private readonly getDelayedData:VoidFunction;

    public override onDataReady(): Promise<void> {
        if (this.dataDelayed) { // trigger data-requesting promise
            this.getDelayedData();
            this.dataDelayed = false;
        }
        
        return super.onDataReady();
    }

    /**
     * Creates a new DatabaseDataView.
     * @param db database to query data from
     * @param filter options used to request specific subset of data
     * @param delayData whether to delay the data-requesting promise until the ```dataReady()``` method is called
     */
    constructor(db:Database<I>, filter:QueryFilter<I>={}, delayData=false) {
        let getDelayedData:VoidFunction = () => { throw new Error("getDelayedData called before initialized"); };
        super(new Promise((resolve,reject) => {
            if (delayData) getDelayedData = () => db.get(filter).then(resolve).catch(reject); // requested after delay
            else db.get(filter).then(resolve).catch(reject); // request now
        }));

        this.db = db;
        this.dataDelayed = delayData;
        this.getDelayedData = getDelayedData;

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