/** Gives the array with overlapping entries between a and b. */
export function intersection<T>(a:T[], b:T[]) {
    return a.filter(e => b.includes(e));
}

/** Gives an array with all elements from a or b. */
export function union<T>(a:T[], b:T[], onlyUnique=false):T[] {
    return onlyUnique ? [...a, ...difference(b, a)] : [...a, ...b];
}

/** Gives an array with all elements from a which are not in b. */
export function difference<T>(a:T[], b:T[]) {
    return a.filter(e => !b.includes(e));
}

/** Gives an array of the elements which are either in a or b. */
export function symmetricDifference<T>(a:T[], b:T[]) {
    return [...difference(a, b), ...difference(b,a)];
}

/**
 * Sorts the given array in alphabetical order.
 * @param arr array of strings
 * @returns sorted array
 */
export function sortAlphabetically<T extends string>(arr:T[]):T[] {
    return arr.toSorted((a,b) => a.localeCompare(b));
}

/**
 * Counts how many array elements match the predicate.
 * @param arr array
 * @param predicate predicate to check some condition
 * @returns number of elements in ```arr``` that match ```predicate```
 */
export function count<T>(arr:T[], predicate:(value:T,index:number,obj:T[])=>boolean):number {
    let out = 0;
    for (let i = 0; i < arr.length; i ++) out += predicate(arr[i], i, arr) ? 1 : 0;
    return out;
}