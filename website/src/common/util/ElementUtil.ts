import NodeUtil from "./NodeUtil";

export default abstract class ElementUtil {

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

    public static queryAncestors(node:Node|null, selector:string, includeNode=false):Element[] {
        if (node === null) return [];
        else {
            const out:Element[] = [];
            if (includeNode && node instanceof Element && node.matches(selector)) out.push(node);

            let n:Node|null = node.parentNode;
            while (n !== null) {
                if (n instanceof Element && n.matches(selector)) out.push(n);
                n = n.parentNode;
            }

            return out;
        }
    }

    public static isChain(elem:Element):boolean {
        if (NodeUtil.isEmpty(elem)) return true; // end of chain
        else if (elem.childElementCount === 1) return this.isChain(elem.firstElementChild!); // link in chain
        else return false; // > 1 child elements, not a chain
    }

    public static getChainEnd(elem:Element):Element {
        if (NodeUtil.isEmpty(elem)) return elem; // end of chain, empty
        else if (elem.childElementCount === 1) return this.getChainEnd(elem.firstElementChild!); // link in chain, look further down
        else return elem; // chain stops prematurely, return end
    }
    
    public static isAtScrollTop(elem:Element, tolerance=1) {
        return elem.scrollTop <= tolerance;
    }
    
    public static isAtScrollBottom(elem:Element, tolerance=1) {
        return elem.scrollHeight - elem.scrollTop - elem.clientHeight <= tolerance;
    }

    public static isReplacedElement(e:HTMLElement) {
        return e instanceof HTMLIFrameElement
            || e instanceof HTMLVideoElement
            || e instanceof HTMLEmbedElement
            || e instanceof HTMLImageElement;
    }

}