import NodeUtil from "../../util/NodeUtil";
import { isRichTextSectionName } from "./RichTextInput";

export default abstract class RichTextSerializer {

    private static ESCAPE_CONFIG:Record<string,string> = {
        '<': "&lt;",
        '>': "&gt;",
        '"': "&quot;",
        '=': "&#61;"
    };

    public static escape(str:string):string {
        for (const c in this.ESCAPE_CONFIG) str = str.replaceAll(c, this.ESCAPE_CONFIG[c]);
        return str;
    }

    public static unescape(str:string):string {
        for (const c in this.ESCAPE_CONFIG) str = str.replaceAll(this.ESCAPE_CONFIG[c], c);
        return str;
    }

    public static serialize(root:ParentNode):string {
        let out = "";
        root.childNodes.forEach(childNode => {
            const finalized = this.finalize(childNode);
            
            for (const f of finalized) out += f instanceof Element ? f.outerHTML : f.textContent ?? "";
        });
        return out;
    }

    private static finalize(node:ChildNode):Node[] {
        
        if (node.nodeType === Node.TEXT_NODE) return [document.createTextNode(node.textContent ?? "")];
        else if (node instanceof HTMLElement) {
            if (node.hasAttribute("do-serialize")) {
                const type = node.getAttribute("type");
                if (type && isRichTextSectionName(type)) {

                    const out = node.cloneNode() as HTMLElement;
                    // remove all attributes and child nodes
                    while (out.attributes.length !== 0) out.removeAttribute(out.attributes[0].name);
                    while (out.firstChild) out.firstChild.remove();
                    
                    ["left", "center", "right", "justify"].forEach(opt => { // universal alignment option
                        if (node.classList.contains(`align-${opt}`)) out.classList.add(`align-${opt}`);
                    });

                    switch (type) {
                        case "shortcut":
                            break;
                        case "attachment":
                        case "image":
                            out.setAttribute("src", node.getAttribute("src") ?? "firebase-storage-public");
                            out.setAttribute("href", node.getAttribute("href") ?? "");
                            out.style.width = node.style.width;
                            return [out];
                        case "title":
                            out.classList.add("title"); // mark as title
                        case "h1":
                        case "h2":
                        case "h3":
                        case "paragraph":
                            // recursively clone children
                            node.childNodes.forEach(childNode => out.appendChild(childNode.cloneNode(true)));
                            NodeUtil.onEach(out, n => { // remove value attribute from style tags
                                if (n instanceof Element) n.removeAttribute("value");
                            });
                            
                            return [out];
                        case "list":
                        case "numbered-list":
                            // append list elements
                            node.childNodes.forEach(childNode => out.append(...this.finalize(childNode)));
                            return [out];
                        case "event-calendar":
                            break;
                        case "event-note":
                            break;
                    }

                    throw new SerializationError(`no finalization implementation found for section type "${type}"`);
                    
                }
                else if (type === null) throw new SerializationError("element was marked with do-serialize attribute, but no type was provided.");
                else throw new SerializationError(`unrecognized section type "${type}".`);
            }
            else if (node.classList.contains("element-container")) return Array.from(node.childNodes)
                .filter(childNode => childNode instanceof Element && (childNode.hasAttribute("do-serialize") || childNode.classList.contains("element-container")))
                .flatMap(childNode => this.finalize(childNode));
            else return [];
        }
        else throw new SerializationError("given node is not a text, nor an element.");

    }

    public static deserialize(value:string):Node[] {
        throw new Error();
    }

}



class SerializationError extends Error {

    constructor(cause:string) {
        super(`failed to serialize: ${cause}`);
    }

    

}