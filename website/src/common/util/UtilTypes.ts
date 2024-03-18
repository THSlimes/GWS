export type Class<T> = new (...args:any[]) => T;

export type Opt<T> = T | undefined;
/** Amount of detail present in an EventNote element. */

export enum DetailLevel {
    LOW,
    MEDIUM,
    HIGH,
    FULL
}
export namespace DetailLevel {
    export function toString(lod:DetailLevel):string {
        switch(lod) {
            case DetailLevel.LOW: return "low";
            case DetailLevel.MEDIUM: return "medium";
            case DetailLevel.HIGH: return "high";
            case DetailLevel.FULL: return "full";
        }
    }

    export function fromString(str:string):DetailLevel {
        switch (str) {
            case "low": return DetailLevel.LOW;
            case "medium": return DetailLevel.MEDIUM;
            case "high": return DetailLevel.HIGH;
            case "full": return DetailLevel.FULL;
            default: throw new Error(`unknown DetailLevel "${str}".`);
        }
    }
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

export type AttachmentOrigin = "firebase-storage-public" | "firebase-storage-protected" | "external";
export namespace AttachmentOrigin {
    export function checkType(str: string): str is AttachmentOrigin {
        return str === "firebase-storage-public"
            || str === "firebase-storage-private"
            || str === "external";
    }
}