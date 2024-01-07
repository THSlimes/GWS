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