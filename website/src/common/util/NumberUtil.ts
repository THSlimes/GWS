export default abstract class NumberUtil {

    /** Limits 'n' between 'lower' and 'upper' */
    public static clamp(n:number, lower=-Infinity, upper=Infinity, resolveNaN=false) {
        return resolveNaN && isNaN(n) ? lower : Math.max(lower, Math.min(upper, n));
    }

    public static isBetween(n:number, lower=-Infinity, upper=Infinity, inclusive=true):boolean {
        return inclusive ?
            lower <= n && n <= upper :
            lower < n && n < upper;
    }

    /** Determines whether `asString` represents a number. */
    public static isNumber(asString:string):boolean {
        return !isNaN(Number.parseFloat(asString));
    }

    /** Determines whether `asString` represents an integer. */
    public static isInt(asString:string):boolean {
        return !isNaN(Number.parseInt(asString)) && (Number.parseInt(asString) === Number.parseFloat(asString));
    }

    public static parse(asString:string, NaNDefault:number=0):number {
        const out = Number.parseFloat(asString);
        return isNaN(out) ? NaNDefault : out;
    }

    public static range(from:number, to:number, step=1, includeTo=false):number[] {
        const out:number[] = [];

        step = Math.abs(step);

        if (from < to) {
            if (includeTo) for (let i = from; i <= to; i += step) out.push(i);
            else for (let i = from; i < to; i += step) out.push(i);
        }
        else {
            if (includeTo) for (let i = from; i >= to; i -= step) out.push(i);
            else for (let i = from; i > to; i -= step) out.push(i);
        }


        return out;
    }

}