export default abstract class ElementUtil {

    public static whenInsertedIn<N extends Node>(node:N, ancestor:Node):Promise<N> {
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

    /**
     * Gives the index of a child of a node.
     * @param parent parent node
     * @param child child to determine index of
     * @returns index of `child` in `parent` (-1 if `child` is not a child of `parent`)
     */
    public static getChildIndex(parent:Node, child:Node):number {
        let [node, i] = [parent.firstChild, 0];

        while (node !== null) {
            if (node === child) return i;
            else [node, i] = [node.nextSibling, i+1];
        }

        return -1;
    }

    /**
     * Gets an Element attribute as a number.
     * @param elem element with attribute
     * @param attrName name of attribute
     * @param allowNaN whether to allow NaN as a valid value
     * @returns attribute as a number (null if not present or result is NaN and ```!allowNaN```)
     */
    public static getAttrAsNumber(elem:Element, attrName:string, allowNaN=false):number|null {
        const out = elem.hasAttribute(attrName) ? Number.parseFloat(elem.getAttribute(attrName)!) : null;
        return out === null || (!allowNaN && isNaN(out)) ? null : out;
    }

    /**
     * Gets an Element attribute as a certain type.
     * @param elem element with attribute
     * @param attrName name of attribute
     * @param checker function that makes sure value is actually correct type
     * (if undefined, the value is always assumed to be the correct type)
     * @returns attribute as type T
     */
    public static getAttrAs<T extends string>(elem:Element, attrName:string, checker?:((val:string)=>val is T)|((v:string)=>boolean)):T|null {
        if (!elem.hasAttribute(attrName)) return null;
        
        const v = elem.getAttribute(attrName)!;
        if (checker) return checker(v) ? v as T : null;
        else return v as T;
    }
    
    public static isAtScrollTop(elem:Element, tolerance=1) {
        return elem.scrollTop <= tolerance;
    }
    
    public static isAtScrollBottom(elem:Element, tolerance=1) {
        return elem.scrollHeight - elem.scrollTop - elem.clientHeight <= tolerance;
    }

}

/**
 * Type to be implemented by custom element types which have distinct sections.
 * @param S union type of section names
 */
export type HasSections<S extends string> = {
    [k in S]: HTMLElement|null;
} & { initElement():void };