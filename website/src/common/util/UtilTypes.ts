export type Class<T> = new (...args:any[]) => T;

export type Opt<T> = T | undefined;
/** Amount of detail present in an EventNote element. */

export enum DetailLevel {
    LOW,
    MEDIUM,
    HIGH,
    FULL
}

/**
 * Type to be implemented by custom element types which have distinct sections.
 * @param S union type of section names
 */

export type HasSections<S extends string = never> = {
    [k in S]: HTMLElement | null;
} & {
    /** Method which initializes the element. */
    initElement(): void;
};

export type ElementOf<A extends any[]> = A extends (infer E)[] ? E : never;