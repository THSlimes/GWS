
/**
 * The ArrayUtil helper-class provides some standard method to manipulate and process arrays.
 */
export default abstract class ArrayUtil {

    /** Gives the array with overlapping entries between a and b. */
    public static intersection<T>(a:T[], b:T[]) {
        return a.filter(e => b.includes(e));
    }
    
    /** Gives an array with all elements from a or b. */
    public static union<T>(a:T[], b:T[], onlyUnique=false):T[] {
        return onlyUnique ? [...a, ...this.difference(b, a)] : [...a, ...b];
    }
    
    /** Gives an array with all elements from a which are not in b. */
    public static difference<T>(a:T[], b:T[]) {
        return a.filter(e => !b.includes(e));
    }
    
    /** Gives an array of the elements which are either in a or b. */
    public static symmetricDifference<T>(a:T[], b:T[]) {
        return [...this.difference(a, b), ...this.difference(b,a)];
    }
    
    /**
     * Sorts the given array in alphabetical order.
     * @param arr array of strings
     * @returns sorted array
     */
    public static sortAlphabetically<T extends string>(arr:T[]):T[] {
        return arr.toSorted((a,b) => a.localeCompare(b));
    }

    public static remove<T>(arr:T[], elem:T, removeAll=false):boolean {
        let out = false;

        if (removeAll) {
            let ind = arr.indexOf(elem);
            while (ind !== -1) {
                arr.splice(ind, 1);
                ind = arr.indexOf(elem);
                out = true;
            }
        }
        else {
            let ind = arr.indexOf(elem);
            if (ind !== -1) {
                arr.splice(ind, 1);
                ind = arr.indexOf(elem);
                out = true;
            }
        }

        return out;
    }

    public static uniqueElements<T>(arr:T[]):T[] {
        const out = [...arr];

        for (let i = 0; i < out.length; i ++) {
            const e = out[i];
            for (let j = i+1; j < out.length; j ++) {
                while (j < out.length && out[j] === e) out.splice(j, 1);
            }
        }

        return out;
    }
    
    /**
     * Counts how many array elements match the predicate.
     * @param arr array
     * @param predicate predicate to check some condition
     * @returns number of elements in ```arr``` that match ```predicate```
     */
    public static count<T>(arr:T[], predicate:(value:T,index:number,obj:T[])=>boolean):number {
        let out = 0;
        for (let i = 0; i < arr.length; i ++) out += predicate(arr[i], i, arr) ? 1 : 0;
        return out;
    }

    public static includesAll<T>(arr:T[], ...searchElements:T[]) {
        return searchElements.every(e => arr.includes(e));
    }

}