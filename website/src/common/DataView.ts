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
 */
export default abstract class DataView<T extends Record<string,any>> {

    private entries:T[]|null = null;
    public dataRetrieved():boolean { return this.entries !== null; }
    private _dataModified = false;
    protected get dataModified() { return this._dataModified; }

    private get length() {
        if (this.entries === null) throw new DataPendingError();
        return this.entries.length;
    }

    constructor(data:T[]|Promise<T[]>) {
        if (Array.isArray(data)) this.entries = data;
        else data.then(data => this.entries = data);

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

    public getValue<K extends keyof T>(index:number, key:K):T[K] {
        return this.get(index)[key];
    }
    
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

export class DatabaseDataView<I extends Info> extends DataView<I> {

    constructor(db:Database<I>, options:QueryFilter<I>={}) {
        super(db.get(options));
    }

    save(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    
}

class DataPendingError extends Error {

    constructor() {
        super("the requested data has not been retrieved yet");
    }

}