export function whenInsertedIn<N extends Node>(node:N, ancestor:Node):Promise<N> {
    return new Promise((resolve, reject) => {
        if (ancestor.contains(node)) resolve(node); // already a child
        else { // set up observer
            const obs = new MutationObserver(mutations => {
                for (const m of mutations) {
                    if (m.target === node) {
                        resolve(node);
                        obs.disconnect(); // cleanup
                    }
                }
            });
            obs.observe(ancestor, { childList:true, subtree:true })
        }
    });
}

export function isAtScrollTop(elem:Element, tolerance=1) {
    return elem.scrollTop <= tolerance;
}

export function isAtScrollBottom(elem:Element, tolerance=1) {
    return elem.scrollHeight - elem.scrollTop - elem.clientHeight <= tolerance;
}

/**
 * Type to be implemented by custom element types which have distinct sections.
 * @param S union type of section names
 */
export type HasSections<S extends string> = {
    readonly [k in S]: HTMLElement|null;
};