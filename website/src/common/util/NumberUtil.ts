export default abstract class NumberUtil {

    /** Limits 'n' between 'lower' and 'upper' */
    public static clamp(n:number, lower=-Infinity, upper=Infinity) {
        return Math.max(lower, Math.min(upper, n));
    }
}