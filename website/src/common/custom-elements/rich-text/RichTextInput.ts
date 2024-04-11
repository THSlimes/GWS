import TextStyling from "./TextStyling";
import ArrayUtil from "../../util/ArrayUtil";
import ColorUtil from "../../util/ColorUtil";
import ElementUtil from "../../util/ElementUtil";
import { HasSections } from "../../util/UtilTypes";
import FunctionUtil from "../../util/FunctionUtil";
import NodeUtil from "../../util/NodeUtil";
import NumberUtil from "../../util/NumberUtil";
import FolderElement from "../FolderElement";
import RichTextSerializer from "./RichTextSerializer";
import MultisourceAttachment from "../MultisourceAttachment";
import { AttachmentOrigin } from "../../util/UtilTypes";
import MultisourceImage from "../MultisourceImage";
import Switch from "../Switch";
import ElementFactory from "../../html-element-factory/ElementFactory";
import IFrameContainer from "../IFrameContainer";
import Loading from "../../Loading";
import Responsive from "../../ui/Responsive";
import IdeaBox from "../IdeaBox";

/** [parent Node, "before child" index] tuple */
type InsertionPosition = [Node, number];

/**
 * Inserts nodes at a specific position.
 * @param position position to insert before
 * @param nodes nodes to insert
 */
function insertAt(position:InsertionPosition, ...nodes:Node[]):void {
    const [parent, ind] = position;
    if (ind <= 0) {
        for (const n of nodes) parent.insertBefore(n, parent.firstChild);
    }
    else if (ind >= parent.childNodes.length) {
        for (const n of nodes) parent.appendChild(n)
    }
    else for (const n of nodes) parent.insertBefore(n, parent.childNodes[ind]);
}

/**
 * A RichTextInput is a type of HTMLElement that allows for editing text to an advanced degree.
 */
class RichTextInput extends HTMLElement implements HasSections<"toolbar"|"body"> {

    /** Whether the RichTextInput is a smaller, compact verion. */
    public set isCompact(newVal:boolean) { this.toggleAttribute("compact", newVal); }
    public get isCompact() { return this.hasAttribute("compact"); }

    /** Current rich text contained in the input. */
    public get value():string { return RichTextSerializer.serialize(this.body); }
    public set value(newVal:string) {
        this.selectedElement = null;
        NodeUtil.empty(this.body); // remove children

        const newSections = RichTextSerializer.deserialize(newVal);

        for (const section of newSections) {
            if (section instanceof HTMLElement) this.insert(RichTextInput.inferSectionName(section), section, [this.body, Infinity]);
            else if (section.nodeType === Node.TEXT_NODE) this.insert("paragraph", ElementFactory.p(section.textContent!).make(), [this.body, Infinity]);
            else this.body.appendChild(section);
        }
        
    }

    /** Placeholder text to show when input is empty. */
    public get placeholder() { return this.style.getPropertyValue("--placeholder"); }
    public set placeholder(newPlc:string) { this.style.setProperty("--placeholder", `"${newPlc}"`); }

    /** Toolbar child element */
    public toolbar!:HTMLDivElement;
    /** Body child element */
    public body!:HTMLDivElement;

    private _selectedElement:HTMLElement|null = null;
    private set selectedElement(elem:HTMLElement|null) {
        const oldElem = this._selectedElement;
        oldElem?.removeAttribute("selected");

        this._selectedElement = elem;
        elem?.toggleAttribute("selected", true);
    }
    private get selectedElement() {
        if (!this.body.contains(this._selectedElement)) this.selectedElement = null;
        return this._selectedElement;
    }

    /** Position at which to insert new elements. */
    private get insertionPosition():InsertionPosition {
        if (this.selectedElement) {

            let targetChild:Node = this.selectedElement; // find child of target which is/contains the selected element
            while (targetChild.parentNode !== this.body) targetChild = targetChild.parentNode!;

            return [(this.body), NodeUtil.getChildIndex(this.body,targetChild) + 1];
        }
        return [this.body, Infinity];
    }

    /**
     * Inserts a new element into the body.
     * @param newElem element to insert
     * @param position position to insert at
     * @param focus whether to focus on `newElem` after insertion
     * @param deleteOnEmpty whether to delete the new element when backspace is pressed
     * while `newElem.textContent` is empty.
     */
    private insert(type:RichTextInput.SectionName, newElem:HTMLElement, position:InsertionPosition) {
        newElem.setAttribute("do-serialize", ""); // mark as element
        newElem.setAttribute("type", type); // mark type

        let insElem:HTMLElement;

        if (newElem instanceof HTMLAnchorElement) { // custom container for shortcuts
            insElem = ElementFactory.div(undefined, "specialized-container", "element-container", "flex-rows", "in-section-gap")
                .children(() => {
                    const out:HTMLElement[] = [newElem];

                    ElementFactory.input.url(newElem.getAttribute("href") ?? "")
                        .onValueChanged(url => newElem.href = url)
                        .placeholder("Koppeling...")
                        .onMake(self => out.push(self))
                        .make();

                    const openInNewTabSwitch = new Switch(newElem.target === "_blank");
                    openInNewTabSwitch.addEventListener("input", () => {
                        openInNewTabSwitch.value ? newElem.setAttribute("target", "_blank") : newElem.removeAttribute("target");
                    });
                    out.push(
                        ElementFactory.div(undefined, "flex-columns", "cross-axis-center", "in-section-gap")
                            .children(
                                ElementFactory.label("In nieuw tabblad openen?"),
                                openInNewTabSwitch
                            )
                            .make()
                    );

                    return out;
                })
                .make()
        }
        else if (newElem.tagName === "MULTISOURCE-ATTACHMENT" || newElem.tagName === "MULTISOURCE-IMAGE") { // custom container for attachments
            const castElem = newElem as MultisourceAttachment|MultisourceImage;
            insElem = ElementFactory.div(undefined, "specialized-container", "element-container", "flex-rows", "in-section-gap")
                .children(() => {
                    const out:HTMLElement[] = [newElem];

                    let originInput:HTMLSelectElement & { prevValue?:AttachmentOrigin, value:AttachmentOrigin };

                    // origin selector
                    ElementFactory.div(undefined, "origin-selector", "flex-columns", "cross-axis-center", "in-section-gap")
                        .children(
                            ElementFactory.label("Bron"),
                            originInput = ElementFactory.select<AttachmentOrigin>({
                                    "firebase-storage-public": "Firebase cloud-opslag (openbaar)",
                                    "firebase-storage-protected": "Firebase cloud-opslag (beveiligd)",
                                    "external": "Directe link"
                                })
                                .value(castElem.getAttribute("origin") as AttachmentOrigin)
                                .onValueChanged(v => {
                                    castElem.origin = v;
                                    pathInput.placeholder = v === "external" ? "Link naar bestand..." : "Bestandspad...";
                                })
                                .make()
                        )
                        .onMake(self => out.push(self))
                        .make();

                    // path input
                    const setSrcCallback = () => castElem.src = pathInput.value;
                    const pathInput = ElementFactory.input.text()
                        .class("src-input")
                        .placeholder("Bestandspad...")
                        .value(castElem.getAttribute("src") ?? "")
                        .on("input", () => {
                            FunctionUtil.setDelayedCallback(setSrcCallback, 500);
                        })
                        .onMake(self => out.push(self))
                        .make();

                    if (newElem.tagName === "MULTISOURCE-IMAGE") { // width selector for images
                        let widthIndicator:HTMLLabelElement;
                        ElementFactory.div(undefined, "width-selector", "flex-columns", "cross-axis-center", "in-section-gap")
                            .children(
                                widthIndicator = ElementFactory.label(`Breedte (${newElem.style.width || "100%"})`).make(),
                                ElementFactory.input.range(NumberUtil.parse(newElem.style.width.slice(0, -1), 100), 0, 100, 1)
                                    .onValueChanged(val => {
                                        newElem.style.width = `${val}%`;
                                        widthIndicator.textContent = `Breedte (${val}%)`;
                                    })
                            )
                            .onMake(self => out.push(self))
                            .make();
                    }
                    
                    return out;
                })
                .make();
        }
        else if (newElem.tagName === "IDEA-BOX") { // custom container for idea box
            newElem.style.pointerEvents = "none"; // simply remove interactions
            insElem = newElem;
        }
        else insElem = newElem; // all other elements

        insElem.style.flexGrow = '1';

        // put element into a container
        const container:HTMLDivElement = ElementFactory.div(undefined, "element-container", "flex-columns", "main-axis-space-between", "cross-axis-center",  "in-section-gap")
            .children(
                insElem,
                ElementFactory.div(undefined, "controls", "flex-columns", "in-section-gap")
                .children(
                    ElementFactory.iconButton("move_up", () => {
                            if (container.previousElementSibling) NodeUtil.swap(container, container.previousElementSibling)
                        }, "Naar boven"),
                    ElementFactory.iconButton("move_down", () => {
                            if (container.nextElementSibling) NodeUtil.swap(container, container.nextElementSibling)
                        }, "Naar beneden"),
                    ElementFactory.iconButton("remove", () => container.remove(), "Verwijderen")
                )
            )
            .make();
        
        insertAt(position, container);

        // section type specific code
        if (RichTextInput.ALL_TEXT.includes(type)) { // marking text element properties
            newElem.classList.add("text-input");
            newElem.setAttribute("contenteditable", "plaintext-only");
            newElem.setAttribute("supports-style-tags", "");

            newElem.addEventListener("keydown", ev => {
                if (!insElem.textContent && (ev as KeyboardEvent).key === "Backspace") container.remove();
            });
            newElem.focus();
        }

        if (type in RichTextInput.EXCLUDED_INSERTABLE_SUBSECTIONS) {
            newElem.setAttribute("insertion-target", "");

            // recursively insert children
            const children = NodeUtil.extractChildren(newElem);
            for (const child of children) {
                if (child instanceof HTMLElement) {
                    this.insert(RichTextInput.inferSectionName(child), child, [newElem, Infinity])
                }
                else newElem.appendChild(child);
            }

            newElem.prepend(this.makeSectionTypes(() => {
                if (this.selectedElement && newElem.contains(this.selectedElement)) {
                    let targetChild:Node = this.selectedElement; // find child of target which is/contains the selected element
                    while (targetChild.parentNode !== newElem) targetChild = targetChild.parentNode!;

                    return [newElem, NodeUtil.getChildIndex(newElem, targetChild) + 1];
                }
                else return [newElem, Infinity]; // append to newElem
            }, RichTextInput.EXCLUDED_INSERTABLE_SUBSECTIONS[type]));
        }

    }

    /** Determines whether a a stylable element (in the body) is currently selected. */
    private stylableElementSelected() {
        const selection = getSelection();
        if (selection && selection.rangeCount !== 0) {
            const range = selection.getRangeAt(0);
            
            return this.body.contains(range.commonAncestorContainer)
                && ElementUtil.queryAncestors(range.commonAncestorContainer, "[supports-style-tags]", true).length !== 0;
        }
        else return false;
    }

    /** Creates a new RichTextInput */
    constructor(value?:string) {
        super();

        this.initElement();
        if (value !== undefined) this.value = value;
    }

    /** Creates a button which toggles a style tag on/off. */
    private makeStyleTagToggle(tagName:TextStyling.StyleTagClass, icon:string, tooltip:string, shortcut?:RichTextInput.KeyboardShortcut, incompatible?:TextStyling.StyleTagClass) {

        const applyTag = () => {
            if (incompatible && TextStyling.isInStyleTag(incompatible)) TextStyling.applyStyleTag(this.body, incompatible);
            TextStyling.applyStyleTag(this.body, tagName);
        }

        const toggle = ElementFactory.iconButton(icon, (ev, toggle) => {
            if (!toggle.hasAttribute("disabled")) applyTag();
        }, tooltip)
            .attr("can-unselect")
            .attr("disabled")
            .onMake(toggle => {
                const checkAttrsListener = () => {
                    toggle.toggleAttribute("disabled", !this.stylableElementSelected() || !this.body.contains(document.activeElement));
                    toggle.toggleAttribute("selected", TextStyling.isInStyleTag(tagName) && this.body.contains(document.activeElement));
                };
                document.addEventListener("selectionchange", checkAttrsListener);
                document.addEventListener("focusout", checkAttrsListener);
            })
            .make();

        
        if (shortcut) { // add event listener to detect and perform keyboard shortcut
            this.addEventListener("keydown", ev => {
                const specialKeyPressed =
                    !shortcut[1] ||
                    (shortcut[1] === "alt" && ev.altKey) ||
                    (shortcut[1] === "ctrl" && ev.ctrlKey) ||
                    (shortcut[1] === "shift" && ev.shiftKey);

                if (specialKeyPressed && ev.key.toLowerCase() === shortcut[0].toLowerCase() && !toggle.hasAttribute("disabled")) {
                    ev.preventDefault();
                    applyTag();
                }
                
            });
        }

        return toggle;
    }

    /** Base colors for the color picker. */
    private static readonly PICKER_BASE_COLORS:ColorUtil.HexColor[] = ["#FF0000", "#FF8700", "#FFD300", "#DEFF0A", "#A1FF0A", "#0AFF99", "#0AEFFF", "#147DF5", "#580AFF", "#BE0AFF"];
    /** Brightness levels for color picker base colors. */
    private static readonly PICKER_SHADE_RATIOS:number[] = [.25, .5, .75];
    /** Makes a solid-colored button. */
    private makeColorBulb(color:ColorUtil.HexColor, onSelect:(c:ColorUtil.HexColor)=>void) {
        return ElementFactory.div()
            .class("color-bulb", "click-action", "center-content")
            .attr("value", color)
            .children(
                ElementFactory.p('⬤')
                    .class("color-bulb-indicator", "no-margin")
                    .style({"color": color})
            )
            .on("click", () => onSelect(color))
    }
    /** Makes a new color-picker menu. */
    private makeColorPicker(onSelect:(c:ColorUtil.HexColor)=>void, icon:string, tooltip:string, tagName:TextStyling.StyleTagClass) {
        return ElementFactory.folderElement("down", 250, true)
            .heading(ElementFactory.p(icon).class("icon").tooltip(tooltip))
            .class("color-picker", "category")
            .attr("disabled")
            .noFocus()
            .canSelect(false)
            .children(
                ElementFactory.div(undefined, "color-category", "flex-columns")
                    .children(
                        ...NumberUtil.range(RichTextInput.PICKER_BASE_COLORS.length-1, 0, 1, true)
                            .map(n => this.makeColorBulb(ColorUtil.mix("#000000", "#ffffff", n/(RichTextInput.PICKER_BASE_COLORS.length-1)), onSelect))

                    ),
                ElementFactory.div(undefined, "color-category", "flex-columns")
                    .children(...RichTextInput.PICKER_BASE_COLORS.map(c => this.makeColorBulb(c, onSelect))),
                ...RichTextInput.PICKER_SHADE_RATIOS.map(ratio =>
                    ElementFactory.div(undefined, "color-category", "flex-columns")
                        .children(
                            ...RichTextInput.PICKER_BASE_COLORS.map(c => this.makeColorBulb(ColorUtil.mix(c, "#ffffff", ratio), onSelect))
                        )
                ),
                ...RichTextInput.PICKER_SHADE_RATIOS.toReversed().map(ratio =>
                    ElementFactory.div(undefined, "color-category", "flex-columns")
                        .children(
                            ...RichTextInput.PICKER_BASE_COLORS.map(c => this.makeColorBulb(ColorUtil.mix(c, "#000000", ratio), onSelect))
                        )
                )
            )
            .onMake(picker => {
                const checkAttrs = () => {
                    const styleTagColor = TextStyling.getContainingStyleTag(tagName)?.getAttribute("value")?.toLowerCase();
                    Array.from(picker.getElementsByClassName("color-bulb")).forEach(bulb => {
                        const bulbColor = bulb.getAttribute("value");
                        bulb.toggleAttribute("selected", bulbColor === styleTagColor);
                        
                    });
                    picker.heading.style.color = styleTagColor ?? "#000000";

                    picker.toggleAttribute("disabled", !this.stylableElementSelected() || !this.body.contains(document.activeElement));
                }
                document.addEventListener("selectionchange", checkAttrs);
                document.addEventListener("focusout", checkAttrs);
            })
            .make();
    }

    initElement(): void {
        this.classList.add("boxed", "flex-rows", "cross-axis-center", "section-gap");

        let alignSelector:FolderElement;
        let alignOptions:HTMLElement[];

        this.toolbar = this.appendChild( // toolbar (styling options + section adding buttons)
            ElementFactory.div(undefined, "toolbar", "flex-columns", "main-axis-space-evenly", "section-gap")
                .canSelect(false)
                .children(
                    ElementFactory.div(undefined, "styling", "flex-columns", "in-section-gap") // styling options
                        .children(
                            this.makeStyleTagToggle("small", "text_decrease", "Kleiner (ctrl+<)", ['<', "ctrl"], "big"),
                            this.makeStyleTagToggle("big", "text_increase", "Groter (ctrl+>)", ['>', "ctrl"], "small"),
                            this.makeStyleTagToggle("bold", "format_bold", "Dikgedrukt (ctrl+b)", ['b', "ctrl"]),
                            this.makeStyleTagToggle("italic", "format_italic", "Cursief (ctrl+i)", ['i', "ctrl"]),
                            this.makeStyleTagToggle("underlined", "format_underlined", "Onderstreept (ctrl+u)", ['u', "ctrl"]),
                            this.makeStyleTagToggle("strikethrough", "format_strikethrough", "Doorgestreept (ctrl+s)", ['s', "ctrl"]),
                            this.makeColorPicker(c => TextStyling.applyStyleTag(this.body, "text-color", c), "format_color_text", "Tekstkleur", "text-color"),
                            this.makeColorPicker(c => TextStyling.applyStyleTag(this.body, "background-color", c), "format_ink_highlighter", "Markeringskleur", "background-color"),
                            alignSelector = ElementFactory.folderElement("down", 250)
                                .class("category")
                                .tooltip("Tekst uitlijnen")
                                .heading(ElementFactory.p("format_align_justify").class("icon"))
                                .children(
                                    ElementFactory.div(undefined, "flex-columns")
                                        .children(
                                            ...(alignOptions = [
                                                ElementFactory.iconButton("format_align_left", () => {}, "Links uitlijnen")
                                                    .attr("selected")
                                                    .attr("value", "align-left")
                                                    .make(),
                                                ElementFactory.iconButton("format_align_center", () => {}, "Centreren")
                                                    .attr("value", "align-center")
                                                    .make(),
                                                ElementFactory.iconButton("format_align_right", () => {}, "Rechts uitlijnen")
                                                    .attr("value", "align-right")
                                                    .make(),
                                                ElementFactory.iconButton("format_align_justify", () => {}, "Spreiden")
                                                    .attr("value", "align-justify")
                                                    .make()
                                            ])
                                        )
                                )
                                .onMake(container => {
                                    for (const opt of alignOptions) {
                                        opt.addEventListener("click", ev => {
                                            for (const otherOpt of alignOptions) otherOpt.toggleAttribute("selected", opt === otherOpt);
                                            alignSelector.heading.textContent = opt.textContent;
                                            
                                            if (this.selectedElement) {
                                                this.selectedElement.classList.remove(...alignOptions.map(otherOpt => otherOpt.getAttribute("value")!));
                                                this.selectedElement.classList.add(opt.getAttribute("value")!)
                                            }
                                        });
                                    }
                                })
                                .make()
                        ),
                    this.makeSectionTypes(() => this.insertionPosition) // section adding buttons
                )
                .make()
        );

        this.body = this.appendChild( // input body (where sections go)
            ElementFactory.div(undefined, "body", "rich-text", "flex-rows")
                .on("focusin", (ev) => {
                    let target = ev.target;

                    if (target instanceof HTMLElement) {
                        let elem:HTMLElement|null = target; // find element to select
                        while (!elem.hasAttribute("do-serialize")) {
                            const q:Element|null = elem.querySelector("[do-serialize]");
                            if (q instanceof HTMLElement) elem = q;
                            else if (elem.parentElement) elem = elem.parentElement;
                            else {
                                elem = null;
                                break;
                            }
                        }

                        this.selectedElement = elem;
                        
                        if (this.selectedElement) {
                            // match styling selectors to selected element
                            for (const sel of alignOptions) sel.removeAttribute("selected");
                            const selectedOpt = alignOptions.find(opt => this.selectedElement!.classList.contains(opt.getAttribute("value")!));
                            selectedOpt?.setAttribute("selected", "");
                            alignSelector.heading.textContent = selectedOpt?.textContent ?? "format_align_left";
                        }

                        }
                })
                .on("input", () => {
                    // remove empty spans
                    const spans = this.body.getElementsByTagName("span");
                    Array.from(spans).forEach(span => {
                        if (!span.textContent) span.remove();
                    });
                })
                .make()
        );

        document.addEventListener("focusin", ev => { // unselect selected element on focus outside of RichTextInput
            if (ev.target instanceof Node && !this.contains(ev.target)) this.selectedElement = null;
        });

        document.addEventListener("scroll", () => { // to move toolbar with scroll
            requestAnimationFrame(() => { // custom sticky scroll
                const tlbRect = this.toolbar.getBoundingClientRect();
                const thisRect = this.getBoundingClientRect();
                this.toolbar.style.top = Responsive.isSlimmerOrEq(Responsive.Viewport.DESKTOP_SLIM) ?
                    `clamp(var(--in-section-gap), calc(${-thisRect.top}px + 4rem), calc(${thisRect.height - tlbRect.height}px - var(--in-section-gap) / 2))` :
                    `clamp(var(--in-section-gap), ${-thisRect.top}px, calc(${thisRect.height - tlbRect.height}px - var(--in-section-gap) / 2))`;
            });
        });

        new ResizeObserver(() => requestAnimationFrame(() => { // handle shifting height of toolbar
            this.style.paddingTop = `calc(${this.toolbar.getBoundingClientRect().height}px + 2 * var(--in-section-gap))`;
        })).observe(document.body);
        
    }

    /**
     * Creates a menu to used to insert section types.
     * @param insPosCallback function to generate the insertion position
     * @param exclude section types to not make buttons for
     */
    private makeSectionTypes(insPosCallback:()=>InsertionPosition, exclude:RichTextInput.SectionName[]=[]):HTMLDivElement {
        return ElementFactory.div(undefined, "section-types", "flex-columns", "cross-axis-center", "in-section-gap", "no-bullet")
            .canSelect(false)
            .children(
                !exclude.includes("shortcut") && ElementFactory.iconButton("add_link", () => { // add new shortcut
                    this.insert(
                        "shortcut",
                        ElementFactory.a().class("align-justify").style({ fontSize: "16px" }).make(),
                        insPosCallback()
                    );
                    
                }, "Snelkoppeling toevoegen"),
                !exclude.includes("attachment") && ElementFactory.iconButton("attach_file_add", () => { // add new attachment
                    const newElem = new MultisourceAttachment();
                    newElem.classList.add("align-justify");
                    this.insert(
                        "attachment",
                        newElem,
                        insPosCallback()
                    );
                }, "Bijlage toevoegen"),
                !exclude.includes("image") && ElementFactory.iconButton("add_photo_alternate", () => { // add new image
                    const newElem = new MultisourceImage();
                    newElem.classList.add("align-center");
                    this.insert(
                        "image",
                        newElem,
                        insPosCallback()
                    );
                }, "Afbeelding toevoegen"),
                !ArrayUtil.includesAll(exclude, ...RichTextInput.ALL_HEADERS) && ElementFactory.folderElement()
                    .class("category")
                    .foldDir("down")
                    .closingDelay(250)
                    .heading(
                        folder => exclude.includes("title") ?
                            folder.contents.firstElementChild! :
                            ElementFactory.iconButton("title", () => { // add new title heading
                                this.insert(
                                    "title",
                                    ElementFactory.h1().class("title", "align-justify").style({ fontSize: "40px" }).make(),
                                    insPosCallback()
                                );
                            }, "Titel toevoegen")
                    )
                    .children(
                        !exclude.includes("h1") && ElementFactory.iconButton("format_h1", () => { // add new normal h1
                                this.insert(
                                    "h1",
                                    ElementFactory.h1().class("align-justify").style({ fontSize: "32px" }).make(),
                                    insPosCallback()
                                );
                            }, "Nieuwe kop 1"),
                        !exclude.includes("h2") && ElementFactory.iconButton("format_h2", () => { // add new normal h2
                            this.insert(
                                "h2",
                                ElementFactory.h2().class("align-justify").style({ fontSize: "24px" }).make(),
                                insPosCallback()
                            );
                        }, "Nieuwe kop 2"),
                        !exclude.includes("h3") && ElementFactory.iconButton("format_h3", () => { // add new normal h3
                            this.insert(
                                "h3",
                                ElementFactory.h3().class("align-justify").style({ fontSize: "18.5px" }).make(),
                                insPosCallback()
                            );
                        }, "Nieuwe kop 3")
                    )
                    .tooltip("Nieuwe kop/titel"),
                !exclude.includes("paragraph") && ElementFactory.iconButton("subject", () => { // add new paragraph
                        this.insert(
                            "paragraph",
                            ElementFactory.p().class("align-justify").style({ fontSize: "16px" }).make(),
                            insPosCallback()
                        );
                    }, "Nieuwe paragraaf"),
                !exclude.includes("list") && ElementFactory.iconButton("format_list_bulleted", () => { // add new unordered list
                        this.insert(
                            "list",
                            ElementFactory.ul().make(),
                            insPosCallback()
                        );
                    }, "Nieuwe lijst"),
                !exclude.includes("numbered-list") && ElementFactory.iconButton("format_list_numbered", () => { // add new ordered list
                        this.insert(
                            "numbered-list",
                            ElementFactory.ol().make(),
                            insPosCallback()
                        );
                    }, "Nieuwe genummerde lijst"),
                !ArrayUtil.includesAll(exclude, ...RichTextInput.ALL_WIDGETS) &&ElementFactory.folderElement("down", 250)
                    .class("category")
                    .heading(
                        ElementFactory.p("widgets")
                            .class("icon")
                            .tooltip("Widgets")
                    )
                    .children(
                        !exclude.includes("newspaper") && ElementFactory.iconButton("newspaper", () => { // add association newspaper
                            const newspaper = new IFrameContainer(RichTextInput.NEWSPAPER_SRC);
                            newspaper.classList.add("newspaper");
                            newspaper.classList.add("align-center");
                            this.insert("newspaper", newspaper, insPosCallback());
                        }, "Verenigingsblad toevoegen"),
                        !exclude.includes("idea-box") && ElementFactory.iconButton("emoji_objects", () => { // add idea box
                            const ideaBox = new IdeaBox;
                            ideaBox.classList.add("align-center");
                            this.insert("idea-box", ideaBox, insPosCallback());
                        }, "Ideeënbox toevoegen"),
                    )
            ).make();
    }

}

namespace RichTextInput {
    /** Union type of the possible names of a rich-text section. */
    export type SectionName = "shortcut" | "attachment" | "image" | "title" | "h1" | "h2" | "h3" | "paragraph" | "list" | "numbered-list" | "newspaper" | "idea-box";
    const richTextSectionNames:SectionName[] = ["shortcut", "attachment", "image", "title", "h1", "h2", "h3", "paragraph", "list", "numbered-list", "newspaper", "idea-box"];
    export function isRichTextSectionName(str:string):str is SectionName {
        return richTextSectionNames.some(rtsn => str === rtsn);
    }

    /** All RichTextSectionNames categorized as headers. */
    export const ALL_HEADERS:SectionName[] = ["title", "h1", "h2", "h3"];
    /** All RichTextSectionNames that have editable text. */
    export const ALL_TEXT:SectionName[] = [...ALL_HEADERS, "paragraph", "shortcut"];
    /** All RichTextSectionNames categorized as widgets. */
    export const ALL_WIDGETS:SectionName[] = ["newspaper", "idea-box"];
    export const NEWSPAPER_SRC = "https://www.bladnl.nl/bladen/tblaadje/pluginfull";
    
    /** SectionNames mapped to the section types that cannot be inserted in them. */
    export const EXCLUDED_INSERTABLE_SUBSECTIONS:{[k in SectionName]?: SectionName[]} = {
        list: ["list", "numbered-list"],
        "numbered-list": ["list", "numbered-list"]
    };
    
    /** Infers the SectionName of a serialized element. */
    export function inferSectionName(elem:Element):SectionName {
        if (elem.tagName === 'A') return "shortcut";
        else if (elem.tagName === "MULTISOURCE-ATTACHMENT") return "attachment";
        else if (elem.tagName === "MULTISOURCE-IMAGE") return "image";
        else if (elem instanceof HTMLHeadingElement) {
            if (elem.tagName === "H1") return elem.classList.contains("title") ? "title" : "h1";
            else if (elem.tagName === "H2") return "h2";
            else return "h3";
        }
        else if (elem instanceof HTMLParagraphElement) return "paragraph";
        else if (elem instanceof HTMLUListElement) return "list";
        else if (elem instanceof HTMLOListElement) return "numbered-list";
        else if (elem.tagName === "IFRAME-CONTAINER" && elem.classList.contains("newspaper")) return "newspaper";
        else if (elem.tagName === "IDEA-BOX") return "idea-box";
        else throw Error(`could not infer section type of ${elem.outerHTML}`);
    }

    type SpecialKey = "ctrl" | "shift" | "alt";
    export type KeyboardShortcut = [string] | [string, SpecialKey];
}

export default RichTextInput;

Loading.onDOMContentLoaded().then(() => customElements.define("rich-text-input", RichTextInput));