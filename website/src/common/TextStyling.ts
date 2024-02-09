import { HexColor, StyleMap } from "./util/StyleUtil";
import ElementFactory from "./html-element-factory/ElementFactory";
import ElementUtil from "./util/ElementUtil";
import NodeUtil from "./util/NodeUtil";

interface StyleTagNameValueMap {
    "bold": null,
    "italic": null,
    "underlined": null,
    "strikethrough": null,
    "text-color": HexColor,
    "background-color": HexColor
}
export type StyleTagClassName = keyof StyleTagNameValueMap;

const STYLE_TAG_CLASS_NAMES:StyleTagClassName[] = ["bold", "italic", "underlined", "strikethrough", "text-color", "background-color"];
const DEFAULT_TAG_CLASS_NAME_VALUES:StyleTagNameValueMap = {
    "bold": null,
    "italic": null,
    "underlined": null,
    "strikethrough": null,
    "text-color": "#000000",
    "background-color": "#000000"
};

export default abstract class TextStyling {

    /**
     * Determines whether the current selection in fully encompassed by a certain style tag.
     * @param tagClass class-name of the style tag
     * @param value value associated with the style tag (e.g. its color for when `tagclass` is `"color"`)
     * @returns true if the current selection is totally within the given style tag
     */
    public static isInStyleTag<TCN extends StyleTagClassName>(tagClass:TCN, value?:StyleTagNameValueMap[TCN]):boolean {
        const selection = getSelection();
        
        if (selection && selection.rangeCount !== 0) {
            const range = selection.getRangeAt(0);
            const commonAncestor = range.commonAncestorContainer;

            return ElementUtil.queryAncestors(commonAncestor, `.${tagClass}`, true)
                .filter(anc => value === undefined || anc.getAttribute("value") === value)
                .length !== 0;
        }
        else return false;
    }

    private static makeTempTextNode(containingElement:Element, onLegitimize=()=>{}, onRemove=()=>{}):Text {
        const out = ElementFactory.text('​');

        const legitimizeListener = () => {
            const nodeIsEmpty = out.textContent!.replace('​', "").length === 0;
            if (!nodeIsEmpty) { // has some other text
                const ind = out.textContent!.indexOf('​');
                if (ind !== -1) out.replaceData(ind, 1, "");

                onLegitimize();

                // remove listeners
                containingElement.removeEventListener("keyup", removalListener);
                containingElement.removeEventListener("focusout", removalListener);
                containingElement.removeEventListener("input", legitimizeListener);
            }
        }
        containingElement.addEventListener("input", legitimizeListener);

        const removalListener = (ev:Event) => {
            if (!ev.defaultPrevented) {
                const replacementIsEmpty = (out.textContent ?? "").replace('​', "").length === 0;
                const newSelection = getSelection();
                const isSelected = newSelection !== null && newSelection.rangeCount !== 0 && newSelection.getRangeAt(0).commonAncestorContainer.contains(out);

                if (replacementIsEmpty && (!(ev instanceof KeyboardEvent) || !isSelected)) {
                    out.remove();
                    onRemove();

                    // remove listeners
                    containingElement.removeEventListener("keyup", removalListener);
                    containingElement.removeEventListener("focusout", removalListener);
                    containingElement.removeEventListener("input", legitimizeListener);
                }
            }
        }
        containingElement.addEventListener("keyup", removalListener);
        containingElement.addEventListener("focusout", removalListener);

        return out;
    }

    private static getStyleMap<TCN extends StyleTagClassName>(tagClass:TCN, value=DEFAULT_TAG_CLASS_NAME_VALUES[tagClass]):StyleMap {
        switch (tagClass) {
            case "bold":
            case "italic":
            case "underlined":
            case "strikethrough":
            default:
                return {};
            case "text-color":
                return { "color": value! };
            case "background-color":
                return { "backgroundColor": value! };
        }
    }

    public static applyStyleTag<TCN extends StyleTagClassName>(containingElement:Element, tagClass:TCN, value=DEFAULT_TAG_CLASS_NAME_VALUES[tagClass]):boolean {

        let reapplyAfterwards = false;
        NodeUtil.deepReplaceAll(containingElement, '​', "");

        const selection = getSelection();
        if (selection && selection.rangeCount !== 0) {
            const range = selection.getRangeAt(0);
            const isCollapsed = range.collapsed;
            const commonAncestor = range.commonAncestorContainer;
            const tagElem = ElementUtil.queryAncestors(commonAncestor, `.${tagClass}`, true)[0];
            const isInTag = tagElem !== undefined;
            reapplyAfterwards = isInTag && tagElem.getAttribute("value") !== value;
            
            let contents = Array.from(range.extractContents().childNodes);

            const excludeFromTagCombination:Element[] = [];
            
            if (isInTag) { // extract from tag

                // check whether tag can simply be removed
                if (ElementUtil.isChain(tagElem)) { // tag is empty after extraction
                    contents.toReversed().forEach(c => range.insertNode(c));
                    tagElem.replaceWith(...Array.from(tagElem.childNodes));
                }
                else {
                    const chainEnd = ElementUtil.getChainEnd(tagElem);
                    
                    const temp = document.createElement("div"); // make temporary node to be replaced later
                    range.insertNode(temp); // force apart text nodes
                    
                    const remainTaggedNodes = Array.from(chainEnd.childNodes); // nodes which should still be styled according to the original tag
                    
                    tagElem.replaceWith(...Array.from(tagElem.childNodes)); // remove original tag
                    remainTaggedNodes.forEach(remainTaggedNode => { // put nodes in copy of original tag
                        const newTag = tagElem.cloneNode() as Element;
                        if (isCollapsed && temp.previousSibling === remainTaggedNode) {
                            excludeFromTagCombination.push(newTag);
                            NodeUtil.swap(remainTaggedNode, newTag);
                            newTag.appendChild(remainTaggedNode);
                            
                            const textNode = newTag.parentElement!.insertBefore(
                                this.makeTempTextNode(containingElement),
                                newTag.nextSibling
                            );
                            range.selectNode(textNode);
                            range.collapse();
                        }
                        else {
                            NodeUtil.swap(remainTaggedNode, newTag);
                            newTag.appendChild(remainTaggedNode);
                        }
                    });

                    temp.parentElement?.replaceWith(...contents); // fill in selection contents

                }
            }
            else { // add new tag
                const replacement = ElementFactory.span()
                    .class(tagClass)
                    .attr("value", value)
                    .style(this.getStyleMap(tagClass, value))
                    .children(...contents)
                    .make();

                range.insertNode(replacement);

                if (contents.length === 0) { // start typing in tag
                    
                    const textNode = replacement.appendChild(
                        this.makeTempTextNode(containingElement, () => {}, () => {
                            replacement.remove();
                            containingElement.normalize();
                        })
                    );

                    range.selectNode(textNode);
                    range.collapse();
                }
                else range.selectNodeContents(replacement); // made selected text tagged
                
            }

            contents = contents.flatMap(n => NodeUtil.getLeafNodes(n));

            // resolve self-ancestor issues
            for (const className of STYLE_TAG_CLASS_NAMES) {
                const elements = Array.from(containingElement.getElementsByClassName(className));
                elements.forEach(elem => {
                    if (ElementUtil.queryAncestors(elem, `.${className}`).length !== 0) {
                        // has ancestor with class name and value
                        elem.replaceWith(...Array.from(elem.childNodes));
                    }
                });
            }

            // combine adjacent style tags
            let selectionAnchor, selectedNodes;
            if (isCollapsed) {
                selectionAnchor = document.createElement("div");
                selectedNodes = Array.from(range.extractContents().childNodes);
                range.insertNode(selectionAnchor);
            }
            for (const className of STYLE_TAG_CLASS_NAMES) {
                const elements = Array.from(containingElement.getElementsByClassName(className));
                elements.forEach(elem => {
                    if (!excludeFromTagCombination.includes(elem)) {
                        let nextSibling = elem.nextSibling; // find next non-empty-text node
                        while (nextSibling !== null && (nextSibling.nodeType === Node.TEXT_NODE && nextSibling.textContent!.length === 0)) {
                            nextSibling = nextSibling.nextSibling;
                        }
                        
                        if (nextSibling instanceof Element && nextSibling.classList.contains(className) &&
                            nextSibling.getAttribute("value") === elem.getAttribute("value")) {
                            // combine
                            nextSibling.prepend(...Array.from(elem.childNodes));
                            elem.remove();
                        }
                    }
                });
            }
            if (isCollapsed) {
                range.setStartAfter(selectionAnchor!);
                range.setEndAfter(selectionAnchor!);
                selectionAnchor!.replaceWith(...selectedNodes!);
            }

            // remove empty spans
            const spans = containingElement.getElementsByTagName("span");
            Array.from(spans).forEach(span => {
                if (!span.textContent) span.remove();
            });
            
            // select contents again
            if (contents.length !== 0) {
                console.log(contents);
                
                range.setStartBefore(contents[0]);
                range.setEndAfter(contents.at(-1)!);
            }
            
            // combine adjacent text nodes
            containingElement.normalize();
            NodeUtil.onEach(containingElement, node => {
                if (node.nodeType === Node.TEXT_NODE && node.textContent!.length > 1) {
                    const textNode = node as Text;
                    const ind = textNode.textContent!.indexOf('​');
                    if (ind !== -1) textNode.deleteData(ind, 1);
                }
            });
        }

        return reapplyAfterwards ? this.applyStyleTag(containingElement, tagClass, value) : this.isInStyleTag(tagClass, value);
    }

}