export default abstract class NodeUtil {

    public static isEmpty(node:Node):boolean {
        return Array.from(node.childNodes).every(childNode => childNode.nodeType === Node.TEXT_NODE && childNode.textContent!.length === 0);
    }

    public static empty<N extends Node>(node:N):N {
        while (node.firstChild) node.removeChild(node.firstChild);
        return node;
    }

    public static extractChildren(node:Node):ChildNode[] {
        const out:ChildNode[] = [];
        while (node.firstChild) out.push(node.removeChild(node.firstChild));

        return out;
    }
    
    public static swap(a:ChildNode, b:ChildNode) {
        const [aRep, bRep] = [document.createTextNode(""), document.createTextNode("")];

        a.replaceWith(aRep);
        b.replaceWith(bRep);

        aRep.replaceWith(b);
        bRep.replaceWith(a);
    }

    public static getLeafNodes(node:ChildNode):ChildNode[] {
        if (node.childNodes.length === 0) return [node]; // is leaf node
        else { // is not leaf node
            const out:ChildNode[] = [];
            node.childNodes.forEach(childNode => out.push(...this.getLeafNodes(childNode)));
            return out;
        }
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

    public static onEach(root:Node, callback:(node:Node)=>void) {
        root.childNodes.forEach(childNode => this.onEach(childNode, callback));

        callback(root);
    }

    public static deepReplaceAll(node:Node, search:string, replacement:string) {
        if (node.nodeType === Node.TEXT_NODE) {
            const textNode = node as Text;
            const ind = textNode.textContent!.indexOf(search);
            if (ind !== -1) textNode.replaceData(ind, search.length, replacement)
        }
        else node.childNodes.forEach(childNode => this.deepReplaceAll(childNode, search, replacement));
    }
    
}