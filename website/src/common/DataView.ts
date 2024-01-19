import Database, { Info, QueryFilter } from "./firebase/database/Database";
import { deepCopy } from "./util/ObjectUtil";

function valuesEqual(a:any, b:any):boolean {
    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
    else return a === b;
}

/**
 * A DataView allows for easy editing of collections of data.
 * @param T type of a data entry
 */
abstract class DataView<T extends Record<string,any>> {

    private entries:DataView.Entry<T>[]|null = null;
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

    protected get modifiedEntries() { return this.filter(e => e.isModified); }
    protected get dataModified() { return this.some(e => e.isModified); }
    private _onDataModified:VoidFunction[] = [];
    /** A handler to be called EACH TIME a data entry is modified. */
    public set onDataModified(newHandler:VoidFunction) { this._onDataModified.push(newHandler); }

    private _onSave:VoidFunction[] = [];
    public set onSave(newHandler:VoidFunction) { this._onSave.push(newHandler); }

    private get length() {
        if (this.entries === null) throw new DataPendingError();
        return this.entries.length;
    }

    /**
     * Creates a new DataView.
     * @param data either the data itself, or a promise which resolves with the data
     */
    constructor(data:T[]|Promise<T[]>) {
        if (Array.isArray(data)) this.entries = data.map((v,i) => new DataView.Entry(this, i, v, () => this._onDataModified.forEach(h => h())));
        else {
            this.dataPromise = data;
            data
            .then(data => this.entries = data.map((v,i) => new DataView.Entry(this, i, v, () => this._onDataModified.forEach(h => h()))))
            .catch(console.error);
        }

        // wrap save function
        const oldSave = this.save;
        this.save = function() {
            const out = this.dataModified ? oldSave.bind(this)() : new Promise<void>((resolve,reject) => resolve());
            out.then(() => this._onSave.forEach(h => h())); // call onSave handlers

            return out;
        }
    }

    public get(index:number):DataView.Entry<T> {
        if (this.entries === null) throw new DataPendingError();
        else if (index < 0 || index >= this.length) throw new RangeError(`index ${index} is out of range for length ${this.length}`);
        else return this.entries[index];
    }

    /**
     * Iterates over copies of all entries.
     */
    *[Symbol.iterator]() {
        for (let i = 0; i < this.length; i ++) {
            yield this.get(i);
        }
    }

    public map<U>(callbackfn:(value:DataView.Entry<T>, index:number, array:DataView.Entry<T>[]) => U):U[] {
        const arr = [...this];
        return arr.map(callbackfn);
    }

    public filter(callbackfn:(value:DataView.Entry<T>, index:number, array:DataView.Entry<T>[]) => boolean):DataView.Entry<T>[] {
        const arr = [...this];
        return arr.filter(callbackfn);
    }

    public some(callbackfn:(value:DataView.Entry<T>, index:number, array:DataView.Entry<T>[]) => boolean):boolean {
        const arr = [...this];
        return arr.some(callbackfn);
    }

    public forEach(callbackfn:(value:DataView.Entry<T>, index:number, array:DataView.Entry<T>[]) => void) {
        const arr = [...this];
        return arr.forEach(callbackfn);
    }

    /**
     * Attempts to save all modified entries. The returned promise resolving indicates a
     * successful save, while rejecting means something went wrong.
     *
     * Only after a successful save will the data be marked as unmodified.
     */
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
        const modifiedEntries = this.modifiedEntries;
        return new Promise((resolve,reject) => {
            this.db.write(...modifiedEntries.map(e => e.copy()))
            .then(() => resolve())
            .catch(reject);
        });
    }
    
}

namespace DataView {
    
    export class Entry<T extends Record<string,any>> {
    
        private readonly _index:number;
        public get index() { return this._index; }
        private readonly data:T;
        public copy() { return deepCopy(this.data); }
    
        private modifiedKeys:Set<keyof T> = new Set();
        public get isModified() { return this.modifiedKeys.size !== 0; }
        private readonly onModified:VoidFunction;

        protected save() { this.modifiedKeys.clear(); }
    
        constructor(source:DataView<T>, index:number, data:T, onModified=()=>{}) {
            source.onSave = () => this.save;

            this._index = index;
            this.data = data;
            this.onModified = onModified;
        }
    
        public get<K extends keyof T>(key:K) {
            return deepCopy(this.data[key]);
        }
    
        public set<K extends keyof T>(key:K, newValue:T[K]):boolean {
            if (!valuesEqual(this.data[key], newValue)) {
                this.data[key] = deepCopy(newValue);
                this.modifiedKeys.add(key);
                this.onModified();
    
                return true;
            }
            else return false;
        }
    }

}
export default DataView;

/** A type of Error to be thrown when data is still being retrieved. */
class DataPendingError extends Error {

    constructor() {
        super("the requested data has not been retrieved yet");
    }

}