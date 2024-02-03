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

}