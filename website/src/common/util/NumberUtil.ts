/** Limits 'n' between 'lower' and 'upper' */
export function clamp(n:number, lower=-Infinity, upper=Infinity) {
    return Math.max(lower, Math.min(upper, n));
}