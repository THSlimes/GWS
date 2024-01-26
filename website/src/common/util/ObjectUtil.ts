export default abstract class ObjectUtil {

    public static deepCopy<T>(arg: T): T {
        if (typeof arg === "object") {
            if (Array.isArray(arg)) return [...arg].map(this.deepCopy) as T; // is array
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
    
    public static mapToObject<T extends string, U>(arr:T[], callbackfn: (value:T, index:number, array:T[]) => U):Record<T,U> {
        const out:Record<T,U> = {} as Record<T,U>;
        arr.forEach((e,i,a) => out[e] = callbackfn(e,i,a));
        return out;
    }

}