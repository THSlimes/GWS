import TextStyling, { StyleTagClassName } from "./TextStyling";
import { showError } from "../../ui/info-messages";
import ArrayUtil from "../../util/ArrayUtil";
import ColorUtil from "../../util/ColorUtil";
import ElementUtil from "../../util/ElementUtil";
import { HasSections } from "../../util/UtilTypes";
import FunctionUtil from "../../util/FunctionUtil";
import NodeUtil from "../../util/NodeUtil";
import NumberUtil from "../../util/NumberUtil";
import { HexColor } from "../../util/StyleUtil";
import FolderElement from "../FolderElement";
import RichTextSerializer from "./RichTextSerializer";
import MultisourceAttachment, { AttachmentOrigin } from "../MultisourceAttachment";
import MultisourceImage from "../MultisourceImage";
import Switch from "../Switch";
import ElementFactory from "../../html-element-factory/ElementFactory";

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

/** Union type of the possible names of a rich-text section. */
export type RichTextSectionName = "shortcut" | "attachment" | "image" | "title" | "h1" | "h2" | "h3" | "paragraph" | "list" | "numbered-list" | "event-calendar" | "event-note";
const richTextSectionNames:RichTextSectionName[] = ["shortcut", "attachment", "image", "title", "h1", "h2", "h3", "paragraph", "list", "numbered-list", "event-calendar", "event-note"];
export function isRichTextSectionName(str:string):str is RichTextSectionName {
    return richTextSectionNames.some(rtsn => str === rtsn);
}

/** All RichTextSectionNames categorized as headers. */
const HEADER_SECTION_NAMES:RichTextSectionName[] = ["title", "h1", "h2", "h3"];
/** All RichTextSectionNames that have editable text. */
const TEXT_SECTION_NAMES:RichTextSectionName[] = [...HEADER_SECTION_NAMES, "paragraph", "shortcut"];
/** All RichTextSectionNames categorized as widgets. */
const WIDGET_SECTION_NAMES:RichTextSectionName[] = ["event-calendar", "event-note"];

const EXCLUDED_INSERTABLE_SUBSECTIONS:{[k in RichTextSectionName]?: RichTextSectionName[]} = {
    list: ["list", "numbered-list"],
    "numbered-list": ["list", "numbered-list"]
};

function inferSectionName(elem:Element):RichTextSectionName {
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
    else throw Error(`could not infer section type of ${elem.outerHTML}`);
}


/**
 * A RichTextInput is a type of HTMLElement that allows for editing text to an advanced degree.
 */
export default class RichTextInput extends HTMLElement implements HasSections<"toolbar"|"body"> {

    public set isCompact(newVal:boolean) {
        this.toggleAttribute("compact", newVal);
    }
    public get isCompact() { return this.hasAttribute("compact"); }

    public get value():string {
        return RichTextSerializer.serialize(this.body);
    }
    public set value(newVal:string) {
        this.selectedElement = null;
        NodeUtil.empty(this.body); // remove children

        const newSections = RichTextSerializer.deserialize(newVal);
        for (const section of newSections) {
            if (section instanceof HTMLElement) this.insert(inferSectionName(section), section, [this.body, Infinity]);
            else if (section.nodeType === Node.TEXT_NODE) this.insert("paragraph", ElementFactory.p(section.textContent!).make(), [this.body, Infinity]);
            else this.body.appendChild(section);
        }
    }

    public get placeholder() { return this.style.getPropertyValue("--placeholder"); }
    public set placeholder(newPlc:string) { this.style.setProperty("--placeholder", `"${newPlc}"`); }

    /** Toolbar child element */
    public toolbar!:HTMLDivElement;
    /** Body child element */
    public body!:HTMLDivElement;

    private readonly unselectCallback = () => this.selectedElement = null;
    private _selectedElement:HTMLElement|null = null;
    private set selectedElement(elem:HTMLElement|null) {
        const oldElem = this._selectedElement;
        if (oldElem) oldElem.removeEventListener("blur", this.unselectCallback);

        this._selectedElement = elem;
        if (elem) elem.addEventListener("blur", this.unselectCallback);
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
    private insert(type:RichTextSectionName, newElem:HTMLElement, position:InsertionPosition) {

        newElem.setAttribute("do-serialize", ""); // mark as element
        newElem.setAttribute("type", type); // mark type

        let insElem:Element;

        if (newElem instanceof HTMLAnchorElement) { // custom container for shortcuts
            insElem = ElementFactory.div(undefined, "specialized-container", "element-container", "flex-rows", "in-section-gap")
                .children(() => {
                    const out:HTMLElement[] = [newElem];

                    ElementFactory.input.url()
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
                                .value(castElem.origin)
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
                        .value(castElem.src ?? "")
                        .on("input", () => {
                            FunctionUtil.setDelayedCallback(setSrcCallback, 500);
                        })
                        .onMake(self => out.push(self))
                        .make();

                    if (newElem.tagName === "MULTISOURCE-IMAGE") { // width selector for images
                        ElementFactory.div(undefined, "width-selector", "flex-columns", "cross-axis-center", "in-section-gap")
                            .children(
                                ElementFactory.label("Breedte"),
                                ElementFactory.input.range(NumberUtil.parse(newElem.style.width.slice(0, -1), 100), 0, 100, 1)
                                    .onValueChanged(val => newElem.style.width = `${val}%`)
                            )
                            .onMake(self => out.push(self))
                            .make();
                    }
                    
                    return out;
                })
                .make();
        }
        else insElem = newElem; // all other elements

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
        if (TEXT_SECTION_NAMES.includes(type)) { // marking text element properties
            newElem.classList.add("text-input");
            newElem.setAttribute("contenteditable", "plaintext-only");
            newElem.setAttribute("supports-style-tags", "");

            newElem.addEventListener("keydown", ev => {
                if (!insElem.textContent && (ev as KeyboardEvent).key === "Backspace") container.remove();
            });
            newElem.focus();
        }

        if (type in EXCLUDED_INSERTABLE_SUBSECTIONS) {
            newElem.setAttribute("insertion-target", "");

            // recursively insert children
            const children = NodeUtil.extractChildren(newElem);
            for (const child of children) {
                if (child instanceof HTMLElement) {
                    this.insert(inferSectionName(child), child, [newElem, Infinity])
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
            }, EXCLUDED_INSERTABLE_SUBSECTIONS[type]));
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

    constructor(value?:string) {
        super();

        this.initElement();
        if (value !== undefined) this.value = value;
    }

    /** Creates a button which toggles a style tag on/off. */
    private makeStyleTagToggle(tagName:StyleTagClassName, icon:string, tooltip:string) {
        return ElementFactory.iconButton(icon, (ev, toggle) => {
            if (!toggle.hasAttribute("disabled")) TextStyling.applyStyleTag(this.body, tagName);
        }, tooltip)
            .attr("can-unselect")
            .attr("disabled")
            .onMake(toggle => {
                const checkAttrsListener = () => {
                    toggle.toggleAttribute("disabled", !this.stylableElementSelected() || !this.body.contains(document.activeElement));
                    toggle.toggleAttribute("selected", TextStyling.isInStyleTag(tagName));
                };
                document.addEventListener("selectionchange", checkAttrsListener);
                document.addEventListener("focusout", checkAttrsListener);
            });
    }

    private static readonly PICKER_BASE_COLORS:HexColor[] = ["#FF0000", "#FF8700", "#FFD300", "#DEFF0A", "#A1FF0A", "#0AFF99", "#0AEFFF", "#147DF5", "#580AFF", "#BE0AFF"];
    private static readonly PICKER_SHADE_RATIOS:number[] = [.25, .5, .75];
    /** Makes a solid-colored button. */
    private makeColorBulb(color:HexColor, onSelect:(c:HexColor)=>void) {
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
    private makeColorPicker(onSelect:(c:HexColor)=>void, icon:string, tooltip:string, tagName:StyleTagClassName) {
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

        let fontSizeInput:HTMLInputElement;
        let alignSelector:FolderElement;
        let alignOptions:HTMLElement[];

        this.toolbar = this.appendChild(
            ElementFactory.div(undefined, "toolbar", "flex-columns", "main-axis-space-evenly", "section-gap")
                .canSelect(false)
                .children(
                    ElementFactory.div(undefined, "styling", "flex-columns", "in-section-gap")
                        .children(
                            ElementFactory.folderElement("down", 250, true)
                                .class("font-size-selector")
                                .heading(
                                    ElementFactory.p("format_size")
                                        .class("icon")
                                        .tooltip("Tekstgrootte")
                                )
                                .children(
                                    fontSizeInput = ElementFactory.input.number(12)
                                        .step(.1)
                                        .onMake(fontSizeInput => {
                                            let selectedElementCopy:HTMLElement|null;
                                            function refocus() { // re-focusses on the previously focussed element
                                                if (selectedElementCopy) {
                                                    selectedElementCopy.focus();
                                                    selectedElementCopy.classList.remove("fake-focussed");
                                                }
                                            }

                                            fontSizeInput.addEventListener("mousedown", ev => {
                                                selectedElementCopy = this.selectedElement;
                                                selectedElementCopy?.classList.add("fake-focussed");
                                            });
                                            fontSizeInput.addEventListener("input", ev => {
                                                fontSizeInput.valueAsNumber = NumberUtil.clamp(fontSizeInput.valueAsNumber, 1, 72);

                                                if (selectedElementCopy) {
                                                    selectedElementCopy.style.fontSize = fontSizeInput.valueAsNumber + "px";
                                                    if (!(ev instanceof InputEvent)) refocus();
                                                }
                                            });
                                            fontSizeInput.addEventListener("focusout", () => {
                                                fontSizeInput.valueAsNumber = NumberUtil.clamp(fontSizeInput.valueAsNumber, 1, 72, true);
                                                refocus();
                                            });
                                        })
                                        .make()
                                ),
                            this.makeStyleTagToggle("bold", "format_bold", "Dikgedrukt"),
                            this.makeStyleTagToggle("italic", "format_italic", "Cursief"),
                            this.makeStyleTagToggle("underlined", "format_underlined", "Onderstreept"),
                            this.makeStyleTagToggle("strikethrough", "format_strikethrough", "Doorgestreept"),
                            this.makeColorPicker(c => TextStyling.applyStyleTag(this.body, "text-color", c), "format_color_text", "Tekstkleur", "text-color"),
                            this.makeColorPicker(c => TextStyling.applyStyleTag(this.body, "background-color", c), "format_ink_highlighter", "Markeringskleur", "background-color"),
                            alignSelector = ElementFactory.folderElement("down", 250)
                                .class("category")
                                .tooltip("Tekst uitlijnen")
                                .heading(
                                    ElementFactory.p("format_align_left").class("icon")
                                )
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
                    this.makeSectionTypes(() => this.insertionPosition)
                )
                .make()
        );

        this.body = this.appendChild(
            ElementFactory.div(undefined, "body", "rich-text")
                .on("blur", () => this.selectedElement = null)
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
                            fontSizeInput.value = this.selectedElement.style.fontSize ?
                                this.selectedElement.style.fontSize.slice(-2, -1) :
                                "14";

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
        
    }

    /**
     * Creates a menu to used to insert section types.
     * @param insPosCallback function to generate the insertion position
     * @param exclude section types to not make buttons for
     */
    private makeSectionTypes(insPosCallback:()=>InsertionPosition, exclude:RichTextSectionName[]=[]):HTMLDivElement {
        return ElementFactory.div(undefined, "section-types", "flex-columns", "cross-axis-center", "in-section-gap", "no-bullet")
            .canSelect(false)
            .children(
                !exclude.includes("shortcut") && ElementFactory.iconButton("add_link", () => { // add new shortcut
                    this.insert(
                        "shortcut",
                        ElementFactory.a().class("align-left").style({ fontSize: "16px" }).make(),
                        insPosCallback()
                    );
                    
                }, "Snelkoppeling toevoegen"),
                !exclude.includes("attachment") && ElementFactory.iconButton("attach_file_add", () => {
                    const newElem = new MultisourceAttachment();
                    newElem.classList.add("align-left");
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
                !ArrayUtil.includesAll(exclude, ...HEADER_SECTION_NAMES) && ElementFactory.folderElement()
                    .class("category")
                    .foldDir("down")
                    .closingDelay(250)
                    .heading(
                        folder => exclude.includes("title") ?
                            folder.contents.firstElementChild! :
                            ElementFactory.iconButton("title", () => { // add new title h1
                                this.insert(
                                    "title",
                                    ElementFactory.h1().class("title", "align-left").style({ fontSize: "40px" }).make(),
                                    insPosCallback()
                                );
                            }, "Titel toevoegen")
                    )
                    .children(
                        !exclude.includes("h1") && ElementFactory.iconButton("format_h1", () => { // add new normal h1
                                this.insert(
                                    "h1",
                                    ElementFactory.h1().class("align-left").style({ fontSize: "32px" }).make(),
                                    insPosCallback()
                                );
                            }, "Nieuwe kop 1"),
                        !exclude.includes("h2") && ElementFactory.iconButton("format_h2", () => { // add new normal h2
                            this.insert(
                                "h2",
                                ElementFactory.h2().class("align-left").style({ fontSize: "24px" }).make(),
                                insPosCallback()
                            );
                        }, "Nieuwe kop 2"),
                        !exclude.includes("h3") && ElementFactory.iconButton("format_h3", () => { // add new normal h3
                            this.insert(
                                "h3",
                                ElementFactory.h3().class("align-left").style({ fontSize: "18.5px" }).make(),
                                insPosCallback()
                            );
                        }, "Nieuwe kop 3")
                    )
                    .tooltip("Nieuwe kop/titel"),
                !exclude.includes("paragraph") && ElementFactory.iconButton("subject", () => { // add new paragraph
                        this.insert(
                            "paragraph",
                            ElementFactory.p().class("align-left").style({ fontSize: "16px" }).make(),
                            insPosCallback()
                        );
                    }, "Nieuwe paragraaf"),
                !exclude.includes("list") && ElementFactory.iconButton("format_list_bulleted", () => {
                        this.insert(
                            "list",
                            ElementFactory.ul().make(),
                            insPosCallback()
                        );
                    }, "Nieuwe lijst"),
                !exclude.includes("numbered-list") && ElementFactory.iconButton("format_list_numbered", () => {
                        this.insert(
                            "numbered-list",
                            ElementFactory.ol().make(),
                            insPosCallback()
                        );
                    }, "Nieuwe genummerde lijst"),
                !ArrayUtil.includesAll(exclude, ...WIDGET_SECTION_NAMES) &&ElementFactory.folderElement("down", 250)
                    .class("category")
                    .heading(
                        ElementFactory.p("widgets")
                            .class("icon")
                            .tooltip("Widgets")
                    )
                    .children(
                        !exclude.includes("event-calendar") && ElementFactory.iconButton("calendar_month", () => {
                            showError("Niet geïmplementeerd.");
                        }, "Activiteiten-kalender toevoegen"),
                        !exclude.includes("event-note") && ElementFactory.iconButton("sticky_note_2", () => {
                            showError("Niet geïmplementeerd.");
                        }, "Activiteit toevoegen")
                    )
            ).make();
    }

}

window.addEventListener("DOMContentLoaded", () => customElements.define("rich-text-input", RichTextInput));