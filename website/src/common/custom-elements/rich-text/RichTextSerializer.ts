import NodeUtil from "../../util/NodeUtil";
import RichTextInput from "./RichTextInput";

const EVENT_LISTENER_ATTRIBUTE_NAMES = ["onfullscreenchange", "onfullscreenerror", "onabort", "onanimationcancel", "onanimationend", "onanimationiteration", "onanimationstart", "onauxclick", "onbeforeinput", "onbeforetoggle", "onblur", "oncancel", "oncanplay", "oncanplaythrough", "onchange", "onclick", "onclose", "oncompositionend", "oncompositionstart", "oncompositionupdate", "oncontextmenu", "oncopy", "oncuechange", "oncut", "ondblclick", "ondrag", "ondragend", "ondragenter", "ondragleave", "ondragover", "ondragstart", "ondrop", "ondurationchange", "onemptied", "onended", "onerror", "onfocus", "onfocusin", "onfocusout", "onformdata", "ongotpointercapture", "oninput", "oninvalid", "onkeydown", "onkeypress", "onkeyup", "onload", "onloadeddata", "onloadedmetadata", "onloadstart", "onlostpointercapture", "onmousedown", "onmouseenter", "onmouseleave", "onmousemove", "onmouseout", "onmouseover", "onmouseup", "onpaste", "onpause", "onplay", "onplaying", "onpointercancel", "onpointerdown", "onpointerenter", "onpointerleave", "onpointermove", "onpointerout", "onpointerover", "onpointerup", "onprogress", "onratechange", "onreset", "onresize", "onscroll", "onscrollend", "onsecuritypolicyviolation", "onseeked", "onseeking", "onselect", "onselectionchange", "onselectstart", "onslotchange", "onstalled", "onsubmit", "onsuspend", "ontimeupdate", "ontoggle", "ontouchcancel", "ontouchend", "ontouchmove", "ontouchstart", "ontransitioncancel", "ontransitionend", "ontransitionrun", "ontransitionstart", "onvolumechange", "onwaiting", "onwebkitanimationend", "onwebkitanimationiteration", "onwebkitanimationstart", "onwebkittransitionend", "onwheel"];

/**
 * The RichTextSerializer helper class helps with (de)serializing rich text.
 */
abstract class RichTextSerializer {

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

    /**
     * Serializes editable rich text
     * @param root most nested element which contains the editable sections (usually editor body)
     * @returns serialized rich text from `root`
     */
    public static serialize(root:ParentNode):string {
        let out = "";
        root.childNodes.forEach(childNode => {
            const finalized = this.finalize(childNode);
            
            for (const f of finalized) out += f instanceof Element ? f.outerHTML : f.textContent ?? "";
        });
        return out;
    }

    /** Clones a node and removes all children and attributes. */
    private static getStrippedClone(elem:HTMLElement):HTMLElement {
        const out = elem.cloneNode() as HTMLElement;
        // remove all attributes and child nodes
        while (out.attributes.length !== 0) out.removeAttribute(out.attributes[0].name);
        while (out.firstChild) out.firstChild.remove();
        
        ["left", "center", "right", "justify"].forEach(opt => { // universal alignment option
            if (elem.classList.contains(`align-${opt}`)) out.classList.add(`align-${opt}`);
        });
        
        return out;
    }

    /** Serializes an editable section node. */
    private static finalize(node:ChildNode):Node[] {
        
        if (node.nodeType === Node.TEXT_NODE) return [document.createTextNode(node.textContent ?? "")];
        else if (node instanceof HTMLElement) {
            if (node.hasAttribute("do-serialize")) {
                const type = node.getAttribute("type");
                const out = this.getStrippedClone(node);

                if (type && RichTextInput.isRichTextSectionName(type)) {
                    switch (type) {
                        case "attachment":
                        case "image":
                            out.setAttribute("origin", node.getAttribute("origin") ?? "firebase-storage-public");
                            out.setAttribute("src", node.getAttribute("src") ?? "");
                            out.style.width = node.style.width;
                            return [out];
                        case "title":
                            out.classList.add("title"); // mark as title
                        case "shortcut":
                            if (node.hasAttribute("href")) out.setAttribute("href", node.getAttribute("href")!);
                            if (node.getAttribute("target") === "_blank") out.setAttribute("target", "_blank");
                        case "h1":
                        case "h2":
                        case "h3":
                        case "paragraph":
                            // recursively clone children
                            node.childNodes.forEach(childNode => out.appendChild(childNode.cloneNode(true)));
                            NodeUtil.onEach(out, n => { // remove value attribute from style tags
                                if (n instanceof Element) n.removeAttribute("value");
                            });

                            if (node.style.fontSize) out.style.fontSize = node.style.fontSize;
                            
                            out.innerHTML = out.innerHTML.replaceAll('\n', "<br>");
                            return [out];
                        case "list":
                        case "numbered-list":
                            // append list elements
                            node.childNodes.forEach(childNode => out.append(...this.finalize(childNode)));
                            return [out];
                        case "newspaper":
                            out.setAttribute("src", node.getAttribute("src") ?? "");
                            out.classList.add("newspaper");
                            return [out];
                        case "idea-box":
                            return [out];
                    }

                    throw new RichTextSerializer.SerializationError(`no finalization implementation found for section type "${type}"`);
                    
                }
                else if (type === null) throw new RichTextSerializer.SerializationError("element was marked with do-serialize attribute, but no type was provided.");
                else throw new RichTextSerializer.SerializationError(`unrecognized section type "${type}".`);
            }
            else if (node.classList.contains("element-container")) return Array.from(node.childNodes)
                .filter(childNode => childNode instanceof Element && (childNode.hasAttribute("do-serialize") || childNode.classList.contains("element-container")))
                .flatMap(childNode => this.finalize(childNode));
            else return [];
        }
        else throw new RichTextSerializer.SerializationError("given node is not a text, nor an element.");

    }

    /**
     * Deserializes serialized rich text into Nodes.
     * @param value serialized rich text
     * @returns deserialized rich text
     */
    public static deserialize(value:string):Node[] {
        
        try {
            const parser = new DOMParser();
            
            const doc = parser.parseFromString(value, "text/html");
            NodeUtil.onEach(doc, n => {
                if (n instanceof Element) {
                    if (n.tagName === "SCRIPT") n.remove(); // remove all script tags
                    else if (n instanceof HTMLAnchorElement) n.addEventListener("click", () => {
                        if (n.href && !n.hasAttribute("download")) {
                            if (n.target === "_blank") open(n.href);
                            else location.href = n.href;
                        }
                    });
                    EVENT_LISTENER_ATTRIBUTE_NAMES.forEach(evListenerAttrName => n.removeAttribute(evListenerAttrName)); // remove event listeners
                    Array.from(n.attributes).forEach(attr => { // remove javascript protocol attributes
                        if (attr.value.toLowerCase().includes("javascript:")) n.removeAttribute(attr.name);
                    });
                }
            });
            
            return Array.from(doc.body.childNodes);
        }
        catch (e) {
            throw new RichTextSerializer.DeserializationError(e instanceof Error ? e.message : "unknown cause");
        }
    }

}

namespace RichTextSerializer {
    /** Error class to throw when rich text serialization fails. */
    export class SerializationError extends Error {

        constructor(cause:string) {
            super(`failed to serialize: ${cause}`);
        }

    }

    /** Error class to throw when rich text deserialization fails. */
    export class DeserializationError extends Error {

        constructor(cause:string) {
            super(`failed to deserialize: ${cause}`);
        }

    }
}

export default RichTextSerializer;