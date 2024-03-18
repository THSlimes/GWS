import ElementFactory from "../../html-element-factory/ElementFactory";
import ColorUtil from "../../util/ColorUtil";
import ElementUtil from "../../util/ElementUtil";
import NodeUtil from "../../util/NodeUtil";
import StyleUtil from "../../util/StyleUtil";

abstract class TextStyling {

    /**
     * Determines whether the current selection in fully encompassed by a certain style tag.
     * @param tagClass class-name of the style tag
     * @param value value associated with the style tag (e.g. its color for when `tagclass` is `"color"`)
     * @returns true if the current selection is totally within the given style tag
     */
    public static isInStyleTag<TCN extends TextStyling.StyleTagClass>(tagClass:TCN, value?:TextStyling.StyleTagValueMap[TCN]):boolean {
        return this.getContainingStyleTag(tagClass, value) !== null;
    }

    public static getContainingStyleTag<TCN extends TextStyling.StyleTagClass>(tagClass:TCN, value?:TextStyling.StyleTagValueMap[TCN]):Element|null {
        const selection = getSelection();

        if (selection && selection.rangeCount !== 0) {
            const range = selection.getRangeAt(0);
            const tagElements = ElementUtil.queryAncestors(range.commonAncestorContainer, `.${tagClass}`, true)
                .filter(tagElem => value === undefined || tagElem.getAttribute("value") === value);
            return tagElements[0] ?? null;
        }
        else return null
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

    private static getStyleMap<TCN extends TextStyling.StyleTagClass>(tagClass:TCN, value=TextStyling.DEFAULT_VALUES_BY_CLASS[tagClass]):StyleUtil.StyleMap {
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

    public static applyStyleTag<TCN extends TextStyling.StyleTagClass>(containingElement:Element, tagClass:TCN, value=TextStyling.DEFAULT_VALUES_BY_CLASS[tagClass]):boolean {

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
            for (const className of TextStyling.STYLE_TAG_CLASSES) {
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
            for (const className of TextStyling.STYLE_TAG_CLASSES) {
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

namespace TextStyling {

    export interface StyleTagValueMap {
        "bold": null,
        "italic": null,
        "underlined": null,
        "strikethrough": null,
        "text-color": ColorUtil.HexColor,
        "background-color": ColorUtil.HexColor
    }
    export type StyleTagClass = keyof StyleTagValueMap;

    export const STYLE_TAG_CLASSES:StyleTagClass[] = ["bold", "italic", "underlined", "strikethrough", "text-color", "background-color"];
    export const DEFAULT_VALUES_BY_CLASS:StyleTagValueMap = {
        "bold": null,
        "italic": null,
        "underlined": null,
        "strikethrough": null,
        "text-color": "#000000",
        "background-color": "#000000"
    };

}

export default TextStyling;