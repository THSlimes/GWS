export default abstract class ObjectUtil {

    public static sizeOf(obj:object):number {
        let out = 0;
        for (const k in obj) out++;
        return out;
    }

    public static keys<K extends string>(obj:Record<K,any>):K[] {
        return Object.keys(obj) as K[];
    }

    public static values<V extends any>(obj:Record<any,V>):V[] {
        return Object.values(obj) as V[];
    }

    public static deepCopy<T>(arg: T): T {
        if (typeof arg === "object") {
            if (Array.isArray(arg)) return [...arg].map(e => this.deepCopy(e)) as T; // is array
            else if (arg instanceof Date) return new Date(arg) as T;
            else { // some other object
                const out: any = {};
                for (const k in arg) out[k] = this.deepCopy(arg[k]);
                return out;
            }
        }
        else return arg; // copy primitive by value
    }
    
    public static deepFreeze(obj:object) {
        // look foor object-properties and deepfreeze those too
        for (const k of Object.keys(obj)) {
            const v:any = obj[k as keyof object];
            if (typeof v === "object") this.deepFreeze(v);
        }
    
        Object.freeze(obj);
    }

    public static deepEquals(a:any, b:any):boolean {
        if (a === b) return true; // shortcut

        if ((typeof a) !== (typeof b)) return false; // not same type
        else if (typeof a === "object" && typeof b === "object") { // both are objects
            if ((a === null) || (b === null)) return false; // one is null, other is not
            else if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((e,i) => this.deepEquals(e, b[i])); // array equality
            else if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime(); // Date equality
            else { // check key-value pairs
                return Object.keys(a).every(k => k in b && this.deepEquals(a[k], b[k]))
                    && Object.keys(b).every(k => k in a && this.deepEquals(b[k], a[k]));
            }
        }
        else return a === b; // by-value check
    }
    
    public static mapToObject<T extends string, U>(arr:T[], callbackfn:(value:T, index:number, array:T[]) => U):Record<T,U> {
        const out:Record<T,U> = {} as Record<T,U>;
        arr.forEach((e,i,a) => out[e] = callbackfn(e,i,a));
        return out;
    }

    public static mapToArray<K extends string|number|symbol, V, O>(obj:Record<K,V>, callbackfn:(key:K, value:V, obj:Record<K,V>)=>O):O[] {
        const out:O[] = [];
        for (const k in obj) out.push(callbackfn(k, obj[k], obj));
        return out;
    }

    public static some<K extends string|number|symbol, V>(obj:Record<K,V>, callbackfn:(key:K, value:V, obj:Record<K,V>)=>boolean):boolean {
        for (const key in obj) {
            const k = key as K;
            const v = obj[k] as V;
            if (callbackfn(k, v, obj)) return true;
        }

        return false;
    }

    public static every<K extends string|number|symbol, V>(obj:Record<K,V>, callbackfn:(key:K, value:V, obj:Record<K,V>)=>boolean):boolean {
        for (const key in obj) {
            const k = key as K;
            const v = obj[k] as V;
            if (!callbackfn(k, v, obj)) return false;
        }

        return true;
    }

    public static forEach<K extends string|number|symbol, V>(obj:Record<K,V>, callbackfn:(key:K, value:V, index:number, obj:Record<K,V>)=>void):void {
        let i = 0;
        for (const k in obj) {
            callbackfn(k, obj[k], i, obj);
            i++;
        }
    }

}