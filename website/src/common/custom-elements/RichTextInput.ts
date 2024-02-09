import TextStyling, { StyleTagClassName } from "../TextStyling";
import Attachments from "../firebase/storage/Attachments";
import ElementFactory from "../html-element-factory/ElementFactory";
import { showError } from "../ui/info-messages";
import ArrayUtil from "../util/ArrayUtil";
import ColorUtil from "../util/ColorUtil";
import ElementUtil, { HasSections } from "../util/ElementUtil";
import FunctionUtil from "../util/FunctionUtil";
import NodeUtil from "../util/NodeUtil";
import NumberUtil from "../util/NumberUtil";
import { HexColor } from "../util/StyleUtil";
import URLUtil, { FileType } from "../util/URLUtil";
import FolderElement from "./FolderElement";

/** [parent Node, "before child" index] tuple */
type InsertionPosition = [Node, number];

/**
 * Inserts nodes at a specific position.
 * @param position position to insert before
 * @param nodes nodes to insert
 */
function insertAt(position:InsertionPosition, ...nodes:Node[]):void {
    const [parent, ind] = position;
    if (ind <= 0) nodes.forEach(n => parent.insertBefore(n, parent.firstChild));
    else if (ind >= parent.childNodes.length) nodes.forEach(n => parent.appendChild(n));
    else nodes.forEach(n => parent.insertBefore(n, parent.childNodes[ind]));
}

/** Union type of the possible names of a rich-text section. */
type RichTextSection = "shortcut" | "attachment" | "image" | "title" | "h1" | "h2" | "h3" | "paragraph" | "list" | "numbered-list" | "event-calendar" | "event-note";
/** All RichTextSections categorized as headers. */
const ALL_HEADERS:RichTextSection[] = ["title", "h1", "h2", "h3"];
/** All RichTextSections categorized as widgets. */
const ALL_WIDGETS:RichTextSection[] = ["event-calendar", "event-note"];

/** Icon names associated with each FileType. */
const FILE_TYPE_ICONS:Record<FileType, string> = {
    image: "photo_library",
    application: "collections_bookmark",
    audio: "library_music",
    example: "quiz",
    font: "font_download",
    model: "deployed_code",
    text: "library_books",
    video: "video_library",
    unknown: "quiz",
    "compressed-folder": "folder_zip",
    pdf: "picture_as_pdf"
};



/**
 * A RichTextInput is a type of HTMLElement that allows for editing text to an advanced degree.
 */
export default class RichTextInput extends HTMLElement implements HasSections<"toolbar"|"body"> {

    /** Toolbar child element */
    public toolbar!:HTMLDivElement;
    /** Body child element */
    public body!:HTMLDivElement;

    private selectedElement:HTMLElement|null = null;

    /** Position at which to insert new elements. */
    private get insertionPosition():InsertionPosition {
        if (this.selectedElement) {
            return [
                this.selectedElement.parentNode!.parentNode!,
                NodeUtil.getChildIndex(this.selectedElement.parentNode!.parentNode!, this.selectedElement.parentNode!) + 1
            ];
        }
        return [this.body, this.body.childNodes.length];
    }

    /**
     * Inserts a new element into the body.
     * @param newElem element to insert
     * @param position position to insert at
     * @param focus whether to focus on `newElem` after insertion
     * @param deleteOnEmpty whether to delete the new element when backspace is pressed
     * while `newElem.textContent` is empty.
     */
    private insert(newElem:Element, position:InsertionPosition, focus=true, deleteOnEmpty=true) {

        newElem.setAttribute("do-serialize", ""); // mark as element

        let insElem:Element;
        
        if (newElem instanceof HTMLImageElement) { // custom container for images
            insElem = ElementFactory.div(undefined, "image-container", "flex-rows", "cross-axis-center", "in-section-gap")
                .children(() => {
                    newElem.src ||= location.origin + "/images/other/placeholder.svg";
                    const defaultSrc = newElem.src;

                    // create URL input element
                    const urlInput = ElementFactory.input.url()
                        .placeholder("Link naar afbeelding...")
                        .on("input", () => FunctionUtil.setDelayedCallback(urlInputCallback, 500))
                        .make();

                    const urlInputCallback = () => { // callback to run after urlInput input event
                        const url = urlInput.value;

                        URLUtil.getType(url)
                        .then(type => {
                            if (type === "image") {
                                newElem.src = url;
                                urlStatus.textContent = "";
                            }
                            else {
                                urlStatus.textContent = "Link is geen afbeeldingslink.";
                                newElem.src = defaultSrc;
                            }
                        })
                        .catch(() => {
                            urlStatus.textContent = "Link is ongeldig.";
                            newElem.src = defaultSrc;
                        });
                    }

                    // create URL status element
                    const urlStatus = ElementFactory.p()
                        .class("url-status", "no-margin")
                        .make();

                    // create image width selector
                    const widthSelector = ElementFactory.div(undefined, "width-selector", "flex-columns", "cross-axis-center", "in-section-gap")
                        .children(
                            ElementFactory.label("Breedte", "width"),
                            ElementFactory.input.range(100, 1, 100, 1)
                                .name("width")
                                .on("input", (ev, widthInput) => newElem.style.width = widthInput.value + "%")
                        );

                    return [newElem, urlInput, urlStatus, widthSelector];
                })
                .make();
        }
        else if (newElem instanceof HTMLAnchorElement && newElem.classList.contains("attachment")) { // custom container for attachments
            insElem = ElementFactory.div(undefined, "attachment-container", "flex-rows", "in-section-gap")
                .children(() => {
                    let sourceInput:HTMLSelectElement
                                & { prevValue?: "firebase-storage" | "external" }
                                & { value: "firebase-storage" | "external" };

                    const sourceSelector = ElementFactory.div(undefined, "source-selector", "flex-columns", "cross-axis-center", "in-section-gap")
                    .children(
                        ElementFactory.label("Bron"),
                        sourceInput = ElementFactory.select({ "firebase-storage": "Firebase cloud-opslag", "external": "Directe link" })
                            .onValueChanged(v => {
                                newElem.setAttribute("source", v);
                                getFileDetails();

                                switch (v) {
                                    case "firebase-storage":
                                        pathInput.placeholder = "Bestandspad...";
                                        break;
                                    case "external":
                                    default:
                                        pathInput.placeholder = "Link naar bestand...";
                                        break;
                                }
                            })
                            .make()
                    );

                    const pathInput = ElementFactory.input.text()
                        .class("link-input")
                        .placeholder("Bestandspad...")
                        .on("input", () => {
                            FunctionUtil.setDelayedCallback(getFileDetails, 500);
                            newElem.setAttribute("path", pathInput.value);
                        })
                        .make();
                    
                    const getFileDetails = () => { // callback to get attachment details
                        const detailPromise = sourceInput.value === "firebase-storage" ?
                            Attachments.getInfo(pathInput.value) :
                            URLUtil.getInfo(pathInput.value);
                        const fileNameLabel = newElem.getElementsByClassName("file-name")[0];
                        const fileSizeLabel = newElem.getElementsByClassName("file-size")[0];
                        const fileTypeIcon = newElem.getElementsByClassName("file-type-icon")[0];
                        const downloadIcon = newElem.getElementsByClassName("download-icon")[0];

                        detailPromise.then(details => {
                            newElem.classList.remove("error"); // mark as valid
                            fileNameLabel.textContent = details.name;
                            fileSizeLabel.textContent = details.size ? URLUtil.getFileSizeString(details.size) : "";
                            fileTypeIcon.textContent = FILE_TYPE_ICONS[details.fileType];
                            downloadIcon.textContent = "download";
                            downloadIcon.classList.add("click-action");

                            newElem.setAttribute("href", details.href);
                            newElem.setAttribute("download", "");
                        })
                        .catch(err => {
                            console.error(err);
                            newElem.classList.add("error"); // mark as invalid
                            fileNameLabel.textContent = "Kan bestand niet vinden";
                            fileSizeLabel.textContent = "";
                            fileTypeIcon.textContent = "error";
                            downloadIcon.textContent = "file_download_off";
                            downloadIcon.classList.remove("click-action");

                            newElem.removeAttribute("href");
                            newElem.removeAttribute("download");
                        });
                    };
                    
                    return [newElem, sourceSelector, pathInput];
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
                    RichTextInput.makeIconButton("move_up", () => {
                            if (container.previousElementSibling) NodeUtil.swap(container, container.previousElementSibling)
                        }, "Naar boven"),
                    RichTextInput.makeIconButton("move_down", () => {
                            if (container.nextElementSibling) NodeUtil.swap(container, container.nextElementSibling)
                        }, "Naar beneden"),
                    RichTextInput.makeIconButton("remove", () => container.remove(), "Verwijderen")
                )
            )
            .make();
        
        insertAt(position, container);

        if (deleteOnEmpty) insElem.addEventListener("keydown", ev => {
            if (!insElem.textContent && (ev as KeyboardEvent).key === "Backspace") container.remove();
        });
        if (insElem instanceof HTMLElement && focus) insElem.focus();

    }

    /** Determines whether a a stylable element (in the body) is currently selected. */
    private stylableElementSelected() {
        const selection = getSelection();
        if (selection && selection.rangeCount !== 0) {
            const range = selection.getRangeAt(0);
            console.log();
            
            return this.body.contains(range.commonAncestorContainer)
                && ElementUtil.queryAncestors(range.commonAncestorContainer, ".supports-style-tags", true).length !== 0;
        }
        else return false;
    }

    constructor() {
        super();

        this.initElement();
    }

    /** Creates a button based on an icon. */
    private static makeIconButton(icon:string, onClick:(ev:MouseEvent, button:HTMLParagraphElement)=>void, tooltip?:string) {
        return ElementFactory.p(icon)
            .class("icon", "click-action", "no-margin")
            .tooltip(tooltip ? tooltip : null)
            .noFocus()
            .on("click", onClick)
    }

    /** Creates a button which toggles a style tag on/off. */
    private makeStyleTagToggle(tagName:StyleTagClassName, icon:string, tooltip:string) {
        return RichTextInput.makeIconButton(icon, (ev, toggle) => {
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
                    .class("no-margin")
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
        this.classList.add("boxed", "flex-rows", "section-gap");

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
                                                RichTextInput.makeIconButton("format_align_left", () => {}, "Links uitlijnen")
                                                    .attr("selected")
                                                    .attr("value", "align-left")
                                                    .make(),
                                                RichTextInput.makeIconButton("format_align_center", () => {}, "Centreren")
                                                    .attr("value", "align-center")
                                                    .make(),
                                                RichTextInput.makeIconButton("format_align_right", () => {}, "Rechts uitlijnen")
                                                    .attr("value", "align-right")
                                                    .make(),
                                                RichTextInput.makeIconButton("format_align_justify", () => {}, "Spreiden")
                                                    .attr("value", "align-justify")
                                                    .make()
                                            ])
                                        )
                                )
                                .onMake(container => {
                                    alignOptions.forEach(opt => {
                                        opt.addEventListener("click", ev => {
                                            alignOptions.forEach(otherOpt => otherOpt.toggleAttribute("selected", opt === otherOpt));
                                            alignSelector.heading.textContent = opt.textContent;

                                            if (this.selectedElement) {
                                                this.selectedElement.classList.remove(...alignOptions.map(otherOpt => otherOpt.getAttribute("value")!));
                                                this.selectedElement.classList.add(opt.getAttribute("value")!)
                                            }
                                        });
                                    });
                                })
                                .make()
                        ),
                    this.makeSectionTypes(() => this.insertionPosition)
                )
                .make()
        );

        this.body = this.appendChild(
            ElementFactory.div(undefined, "body", "rich-text")
                .on("focusout", () => this.selectedElement = null)
                .on("focusin", (ev) => {
                    let target = ev.target;

                    if (target instanceof HTMLElement) {
                        
                        let elem:HTMLElement|null = target; // find element to select
                        while (!elem.hasAttribute("do-serialize")) {
                            const q:Element|null = elem.querySelector(".element");
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
                            fontSizeInput.value = getComputedStyle(this.selectedElement).fontSize.slice(0, -2);

                            alignOptions.forEach(sel => sel.removeAttribute("selected"));
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
    private makeSectionTypes(insPosCallback:()=>InsertionPosition, exclude:RichTextSection[]=[]):HTMLDivElement {
        return ElementFactory.div(undefined, "section-types", "flex-columns", "cross-axis-center", "in-section-gap", "no-bullet")
            .canSelect(false)
            .children(
                !exclude.includes("shortcut") && RichTextInput.makeIconButton("add_link", () => {}, "Snelkoppeling toevoegen"),
                !exclude.includes("attachment") && RichTextInput.makeIconButton("attachment", () => {
                    this.insert(
                        ElementFactory.a()
                            .openInNewTab(true)
                            .class("attachment", "flex-columns", "cross-axis-center", "in-section-gap")
                            .children(
                                ElementFactory.p("collections_bookmark")
                                    .class("icon", "file-type-icon")
                                    .attr("do-serialize"),
                                ElementFactory.div(undefined, "file-info", "flex-rows")
                                    .children(
                                        ElementFactory.p("Bestandsnaam")
                                            .class("file-name", "no-margin")
                                            .attr("do-serialize"),
                                        ElementFactory.p("Bestandsgrootte")
                                            .class("file-size", "no-margin")
                                            .attr("do-serialize"),
                                    ),
                                ElementFactory.p("download")
                                    .class("icon", "click-action", "download-icon")
                                    .attr("do-serialize")
                            )
                            .make(),
                        insPosCallback(), false, false
                    );
                }, "Bijlage toevoegen"),
                !exclude.includes("image") && RichTextInput.makeIconButton("add_photo_alternate", () => { // add new image
                    this.insert(ElementFactory.img().class("align-center").make(), insPosCallback(), true, false);
                }, "Afbeelding toevoegen"),
                !ArrayUtil.includesAll(exclude, ...ALL_HEADERS) && ElementFactory.folderElement()
                    .class("category")
                    .foldDir("down")
                    .closingDelay(250)
                    .heading(
                        folder => exclude.includes("title") ?
                            folder.contents.firstElementChild! :
                            RichTextInput.makeIconButton("title", () => { // add new title h1
                                this.insert(
                                    ElementFactory.h1()
                                        .class("title", "align-left", "text-input", "supports-style-tags")
                                        .attr("contenteditable", "plaintext-only")
                                        .make(),
                                    insPosCallback()
                                );
                            }, "Titel toevoegen")
                    )
                    .children(
                        !exclude.includes("h1") && RichTextInput.makeIconButton("format_h1", () => { // add new normal h1
                                this.insert(
                                    ElementFactory.h1()
                                        .class("align-left", "text-input", "supports-style-tags")
                                        .attr("contenteditable", "plaintext-only")
                                        .make(),
                                    insPosCallback()
                                );
                            }, "Nieuwe kop 1"),
                        !exclude.includes("h2") && RichTextInput.makeIconButton("format_h2", () => { // add new normal h2
                            this.insert(
                                ElementFactory.h2()
                                    .class("align-left", "text-input", "supports-style-tags")
                                    .attr("contenteditable", "plaintext-only")
                                    .make(),
                                insPosCallback()
                            );
                        }, "Nieuwe kop 2"),
                        !exclude.includes("h3") && RichTextInput.makeIconButton("format_h3", () => { // add new normal h3
                            this.insert(
                                ElementFactory.h3()
                                    .class("align-left", "text-input", "supports-style-tags")
                                    .attr("contenteditable", "plaintext-only")
                                    .make(),
                                insPosCallback()
                            );
                        }, "Nieuwe kop 3")
                    )
                    .tooltip("Nieuwe kop/titel"),
                !exclude.includes("paragraph") && RichTextInput.makeIconButton("subject", () => { // add new paragraph
                        this.insert(
                            ElementFactory.p()
                                .class("align-left", "text-input", "supports-style-tags")
                                .attr("contenteditable", "plaintext-only")
                                .make(),
                            insPosCallback()
                        );
                    }, "Nieuwe paragraaf"),
                !exclude.includes("list") && RichTextInput.makeIconButton("format_list_bulleted", () => {
                        this.insert(
                            ElementFactory.ul()
                                .children(
                                    ul => this.makeSectionTypes(() => {
                                        if (ul.contains(this.selectedElement)) return [ul, NodeUtil.getChildIndex(ul, this.selectedElement!.parentElement!) + 1];
                                        else return [ul, Infinity];
                                    }, ["list", "numbered-list"])
                                )
                                .make(),
                            insPosCallback()
                        );
                    }, "Nieuwe lijst"),
                !exclude.includes("numbered-list") && RichTextInput.makeIconButton("format_list_numbered", () => {
                        this.insert(
                            ElementFactory.ol()
                                .children(
                                    ol => this.makeSectionTypes(() => {
                                        if (ol.contains(this.selectedElement)) return [ol, NodeUtil.getChildIndex(ol, this.selectedElement!.parentElement!) + 1];
                                        else return [ol, Infinity];
                                    }, ["list", "numbered-list"])
                                )
                                .make(),
                            insPosCallback()
                        );
                    }, "Nieuwe genummerde lijst"),
                !ArrayUtil.includesAll(exclude, ...ALL_WIDGETS) &&ElementFactory.folderElement("down", 250)
                    .class("category")
                    .heading(
                        ElementFactory.p("widgets")
                            .class("icon")
                            .tooltip("Widgets")
                    )
                    .children(
                        !exclude.includes("event-calendar") && RichTextInput.makeIconButton("calendar_month", () => {
                            showError("Niet geïmplementeerd.");
                        }, "Activiteiten-kalender toevoegen"),
                        !exclude.includes("event-note") && RichTextInput.makeIconButton("sticky_note_2", () => {
                            showError("Niet geïmplementeerd.");
                        }, "Activiteit toevoegen")
                    )
            ).make();
    }

}

customElements.define("rich-text-input", RichTextInput);