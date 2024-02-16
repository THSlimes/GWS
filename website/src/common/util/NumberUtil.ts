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

    /**
     * Determines the options that is closest to the `anchor`.
     * (where between two number `a` and `b` is defined as `|a-b|`)
     * @param anchor number to compute distance to
     * @param options options to pick from
     * @returns element of `options` which is closest to `anchor`
     */
    public static closest<N extends number>(anchor:number, options:N[]):N {
        if (options.length === 0) throw new Error(`parameter "options" must contain at least one element`);

        let minDist = Math.abs(anchor - options[0]);
        let minOption:N = options[0];
        
        for (let i = 1; i < options.length; i ++) {
            const dist = Math.abs(anchor - options[i]);
            if (dist < minDist) [minDist, minOption] = [dist, options[i]];
        }

        return minOption;
    }

}