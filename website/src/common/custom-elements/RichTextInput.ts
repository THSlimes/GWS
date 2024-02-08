import TextStyling from "../TextStyling";
import Attachments from "../firebase/storage/Attachments";
import ElementFactory from "../html-element-factory/ElementFactory";
import ArrayUtil from "../util/ArrayUtil";
import ColorUtil, { Color } from "../util/ColorUtil";
import ElementUtil, { HasSections } from "../util/ElementUtil";
import FunctionUtil from "../util/FunctionUtil";
import NodeUtil from "../util/NodeUtil";
import NumberUtil from "../util/NumberUtil";
import URLUtil, { FileType } from "../util/URLUtil";
import FolderElement from "./FolderElement";

/** [parent Node, "before child" index] */
type InsertionPosition = [Node, number];

function insertAt(position:InsertionPosition, ...nodes:Node[]):void {
    const [parent, ind] = position;
    if (ind <= 0) nodes.forEach(n => parent.insertBefore(n, parent.firstChild));
    else if (ind >= parent.childNodes.length) nodes.forEach(n => parent.appendChild(n));
    else nodes.forEach(n => parent.insertBefore(n, parent.childNodes[ind]));
}

type RichTextSection = "shortcut" | "attachment" | "image" | "title" | "h1" | "h2" | "h3" | "paragraph" | "list" | "numbered-list" | "event-calendar" | "event-note";
const ALL_HEADERS:RichTextSection[] = ["title", "h1", "h2", "h3"];
const ALL_WIDGETS:RichTextSection[] = ["event-calendar", "event-note"];

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

const FILE_SIZE_UNITS = ['B', "kB", "MB", "GB", "TB", "PB", "YB"];
function getFileSizeString(numBytes:number):string {
    let unitInd = 0;
    let numUnits = numBytes;
    while (numUnits >= 1000) [unitInd, numUnits] = [unitInd + 1, numUnits / 1000];

    return numUnits.toFixed(1) + FILE_SIZE_UNITS[unitInd];
}

export default class RichTextInput extends HTMLElement implements HasSections<"toolbar"|"body"> {

    public toolbar!:HTMLDivElement;
    public body!:HTMLDivElement;

    private selectedElement:HTMLElement|null = null;

    private get insertionPosition():InsertionPosition {
        if (this.selectedElement) {
            return [
                this.selectedElement.parentNode!.parentNode!,
                NodeUtil.getChildIndex(this.selectedElement.parentNode!.parentNode!, this.selectedElement.parentNode!) + 1
            ];
        }
        return [this.body, this.body.childNodes.length];
    }

    private insert<E extends Element>(newElem:E, position:InsertionPosition, focus=true, deleteOnEmpty=true) {

        newElem.classList.add("do-serialize"); // mark as element

        let insElem:Element;
        
        if (newElem instanceof HTMLImageElement) {
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
        else if (newElem instanceof HTMLAnchorElement && newElem.classList.contains("attachment")) {
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
                            fileSizeLabel.textContent = details.size ? getFileSizeString(details.size) : "";
                            fileTypeIcon.textContent = FILE_TYPE_ICONS[details.fileType];
                            downloadIcon.textContent = "download";
                            downloadIcon.classList.add("click-action");

                            newElem.setAttribute("href", details.href);
                            newElem.setAttribute("download", "");
                        })
                        .catch(err => {
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
        else insElem = newElem;

        const container:HTMLDivElement = ElementFactory.div(undefined, "element-container", "flex-columns", "main-axis-space-between", "cross-axis-center",  "in-section-gap")
            .children(
                insElem,
                ElementFactory.div(undefined, "controls", "flex-columns", "in-section-gap")
                .children(
                    ElementFactory.p("move_up")
                        .class("icon", "click-action", "no-margin")
                        .tooltip("Naar boven")
                        .on("click", () => {
                            if (container.previousElementSibling) NodeUtil.swap(container, container.previousElementSibling)
                        }),
                    ElementFactory.p("move_down")
                        .class("icon", "click-action", "no-margin")
                        .tooltip("Naar beneden")
                        .on("click", () => {
                            if (container.nextElementSibling) NodeUtil.swap(container, container.nextElementSibling)
                        }),
                    ElementFactory.p("remove")
                        .class("icon", "click-action", "no-margin")
                        .tooltip("Verwijderen")
                        .on("click", () => container.remove())

                )
            )
            .make();
        
        insertAt(position, container);

        if (deleteOnEmpty) insElem.addEventListener("keydown", ev => {
            if (!insElem.textContent && (ev as KeyboardEvent).key === "Backspace") container.remove();
        });
        if (insElem instanceof HTMLElement && focus) insElem.focus();

    }

    private hasBodySelection() {
        const selection = getSelection();
        if (selection && selection.rangeCount !== 0) {
            const range = selection.getRangeAt(0);
            return this.body.contains(range.commonAncestorContainer);
        }
        else return false;
    }

    constructor() {
        super();

        this.initElement();
    }

    initElement(): void {
        this.classList.add("boxed", "flex-rows", "section-gap");

        let boldToggle:HTMLElement;
        let italicToggle:HTMLElement;
        let underlinedToggle:HTMLElement;
        let strikethroughToggle:HTMLElement;
        let fontSizeInput:HTMLInputElement
        let colorSelector:FolderElement;
        let colorInput:HTMLInputElement;
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
                            boldToggle = ElementFactory.p("format_bold")
                                .class("icon", "click-action")
                                .tooltip("Dikgedrukt")
                                .attr("can-unselect")
                                .attr("disabled")
                                .noFocus()
                                .on("click", (ev, self) => { // make bold
                                    if (!boldToggle.hasAttribute("disabled")) TextStyling.applyStyleTag("bold", this.body);
                                })
                                .onMake(boldToggle => {
                                    document.addEventListener("selectionchange", () => {
                                        boldToggle.toggleAttribute("disabled", !this.hasBodySelection());
                                        boldToggle.toggleAttribute("selected", TextStyling.isInStyleTag("bold"));
                                    });
                                })
                                .make(),
                            italicToggle = ElementFactory.p("format_italic")
                                .class("icon", "click-action")
                                .tooltip("Cursief")
                                .attr("can-unselect")
                                .noFocus()
                                .on("click", (ev, self) => { // make italic
                                    if (!italicToggle.hasAttribute("disabled")) TextStyling.applyStyleTag("italic", this.body);
                                })
                                .onMake(italicToggle => {
                                    document.addEventListener("selectionchange", () => {
                                        italicToggle.toggleAttribute("disabled", !this.hasBodySelection());
                                        italicToggle.toggleAttribute("selected", TextStyling.isInStyleTag("italic"));
                                    });
                                })
                                .make(),
                            underlinedToggle = ElementFactory.p("format_underlined")
                                .class("icon", "click-action")
                                .tooltip("Onderstreept")
                                .attr("can-unselect")
                                .noFocus()
                                .on("click", (ev, self) => { // make underlined
                                    if (!underlinedToggle.hasAttribute("disabled")) TextStyling.applyStyleTag("underlined", this.body);
                                })
                                .onMake(underlinedToggle => {
                                    document.addEventListener("selectionchange", () => {
                                        underlinedToggle.toggleAttribute("disabled", !this.hasBodySelection());
                                        underlinedToggle.toggleAttribute("selected", TextStyling.isInStyleTag("underlined"));
                                    });
                                })
                                .make(),
                            strikethroughToggle = ElementFactory.p("format_strikethrough")
                                .class("icon", "click-action")
                                .tooltip("Doorgestreept")
                                .attr("can-unselect")
                                .noFocus()
                                .on("click", (ev, self) => { // make strikethrough
                                    if (!strikethroughToggle.hasAttribute("disabled")) TextStyling.applyStyleTag("strikethrough", this.body);
                                })
                                .onMake(strikethroughToggle => {
                                    document.addEventListener("selectionchange", () => {
                                        strikethroughToggle.toggleAttribute("disabled", !this.hasBodySelection());
                                        strikethroughToggle.toggleAttribute("selected", TextStyling.isInStyleTag("strikethrough"));
                                    });
                                })
                                .make(),
                            colorSelector = ElementFactory.folderElement("down", 250, true)
                                .class("color-selector")
                                .heading(
                                    ElementFactory.p("format_color_text")
                                        .class("icon", "color-heading")
                                        .tooltip("Tekstkleur")
                                )
                                .children(
                                    folder => colorInput = ElementFactory.input.color("#000000")
                                        .noFocus()
                                        .on("input", (ev, colorInput) => {
                                            folder.heading.style.color = colorInput.value;
                                            if (this.selectedElement) this.selectedElement.style.color = colorInput.value;
                                        })
                                        .make()
                                )
                                .make(),
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
                                                ElementFactory.p("format_align_left")
                                                    .class("icon", "click-action")
                                                    .attr("selected")
                                                    .attr("value", "align-left")
                                                    .tooltip("Links uitlijnen")
                                                    .noFocus()
                                                    .make(),
                                                ElementFactory.p("format_align_center")
                                                    .class("icon", "click-action")
                                                    .attr("value", "align-center")
                                                    .tooltip("Centreren")
                                                    .noFocus()
                                                    .make(),
                                                ElementFactory.p("format_align_right")
                                                    .class("icon", "click-action")
                                                    .attr("value", "align-right")
                                                    .tooltip("Rechts uitlijnen")
                                                    .noFocus()
                                                    .make(),
                                                ElementFactory.p("format_align_justify")
                                                    .class("icon", "click-action")
                                                    .attr("value", "align-justify")
                                                    .tooltip("Spreiden")
                                                    .noFocus()
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
                        while (!elem.classList.contains("do-serialize")) {
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

                            boldToggle.toggleAttribute("selected", this.selectedElement.classList.contains("bold"));
                            italicToggle.toggleAttribute("selected", this.selectedElement.classList.contains("italic"));
                            underlinedToggle.toggleAttribute("selected", this.selectedElement.classList.contains("underlined"));
                            strikethroughToggle.toggleAttribute("selected", this.selectedElement.classList.contains("strikethrough"));

                            colorInput.value = ColorUtil.toHex(getComputedStyle(this.selectedElement).color as Color);
                            colorSelector.heading.style.color = colorInput.value;

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

    private makeSectionTypes(insPosCallback:()=>InsertionPosition, exclude:RichTextSection[]=[]):HTMLDivElement {
        return ElementFactory.div(undefined, "section-types", "flex-columns", "cross-axis-center", "in-section-gap", "no-bullet")
            .canSelect(false)
            .children(
                !exclude.includes("shortcut") && ElementFactory.p("add_link")
                    .class("icon", "click-action")
                    .tooltip("Snelkoppeling toevoegen"),
                !exclude.includes("attachment") && ElementFactory.p("attach_file")
                    .class("icon", "click-action")
                    .tooltip("Bijlage toevoegen")
                    .on("click", () => {
                        this.insert(
                            ElementFactory.a()
                                .openInNewTab(true)
                                .class("attachment", "flex-columns", "cross-axis-center", "in-section-gap")
                                .children(
                                    ElementFactory.p("collections_bookmark")
                                        .class("icon", "file-type-icon", "do-serialize"),
                                    ElementFactory.div(undefined, "file-info", "flex-rows")
                                        .children(
                                            ElementFactory.p("Bestandsnaam")
                                                .class("file-name", "no-margin", "do-serialize"),
                                            ElementFactory.p("Bestandsgrootte")
                                                .class("file-size", "no-margin", "do-serialize"),
                                        ),
                                    ElementFactory.p("download")
                                        .class("icon", "click-action", "download-icon", "do-serialize")
                                )
                                .make(),
                            insPosCallback(), false, false
                        );
                    }),
                !exclude.includes("image") && ElementFactory.p("add_photo_alternate")
                    .class("icon", "click-action")
                    .tooltip("Afbeelding toevoegen")
                    .on("click", () => { // add new image
                        this.insert(ElementFactory.img().class("align-center").make(), insPosCallback(), true, false);
                    }),
                !ArrayUtil.includesAll(exclude, ...ALL_HEADERS) && ElementFactory.folderElement()
                    .class("category")
                    .foldDir("down")
                    .closingDelay(250)
                    .heading(
                        folder => exclude.includes("title") ?
                            folder.contents.firstElementChild! :
                            ElementFactory.p("title")
                                .class("icon", "click-action")
                                .tooltip("Nieuwe titel")
                                .noFocus()
                                .on("click", () => { // add new title h1
                                    this.insert(
                                        ElementFactory.h1()
                                            .class("title", "align-left", "text-input")
                                            .attr("contenteditable", "plaintext-only")
                                            .make(),
                                        insPosCallback()
                                    );
                                })
                    )
                    .children(
                        !exclude.includes("h1") && ElementFactory.p("format_h1")
                            .class("icon", "click-action")
                            .tooltip("Nieuwe kop 1")
                            .noFocus()
                            .on("click", () => { // add new normal h1
                                this.insert(
                                    ElementFactory.h1()
                                        .class("align-left", "text-input")
                                        .attr("contenteditable", "plaintext-only")
                                        .make(),
                                    insPosCallback()
                                );
                            }),
                        !exclude.includes("h2") && ElementFactory.p("format_h2")
                            .class("icon", "click-action")
                            .tooltip("Nieuwe kop 2")
                            .noFocus()
                            .on("click", () => { // add new h2
                                this.insert(
                                    ElementFactory.h2()
                                        .class("align-left", "text-input")
                                        .attr("contenteditable", "plaintext-only")
                                        .make(),
                                    insPosCallback()
                                );
                            }),
                        !exclude.includes("h3") && ElementFactory.p("format_h3")
                            .class("icon", "click-action")
                            .tooltip("Nieuwe kop 3")
                            .noFocus()
                            .on("click", () => { // add new h3
                                this.insert(
                                    ElementFactory.h3()
                                        .class("align-left", "text-input")
                                        .attr("contenteditable", "plaintext-only")
                                        .make(),
                                    insPosCallback()
                                );
                            }),

                    )
                    .tooltip("Nieuwe kop/titel"),
                !exclude.includes("paragraph") && ElementFactory.p("subject")
                    .class("icon", "click-action")
                    .tooltip("Nieuwe paragraaf")
                    .noFocus()
                    .on("click", () => { // add new paragraph
                        this.insert(
                            ElementFactory.p()
                                .class("align-left", "text-input")
                                .attr("contenteditable", "plaintext-only")
                                // .children(ElementFactory.span("RED TEXT").style({"color": "red"}))
                                .make(),
                            insPosCallback()
                        );
                    }),
                !exclude.includes("list") && ElementFactory.p("format_list_bulleted")
                    .class("icon", "click-action")
                    .tooltip("Nieuwe lijst")
                    .on("click", () => {
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
                    }),
                !exclude.includes("numbered-list") && ElementFactory.p("format_list_numbered")
                    .class("icon", "click-action")
                    .tooltip("Nieuwe genummerde lijst")
                    .on("click", () => {
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
                    }),
                !ArrayUtil.includesAll(exclude, ...ALL_WIDGETS) &&ElementFactory.folderElement("down", 250)
                    .class("category")
                    .heading(
                        ElementFactory.p("widgets")
                            .class("icon")
                            .tooltip("Widgets")
                    )
                    .children(
                        !exclude.includes("event-calendar") && ElementFactory.p("calendar_month")
                            .class("icon", "click-action")
                            .tooltip("Activiteiten-kalender toevoegen"),
                        !exclude.includes("event-note") && ElementFactory.p("sticky_note_2")
                            .class("icon", "click-action")
                            .tooltip("Activiteiten toevoegen")
                    )
            ).make();
    }

}

customElements.define("rich-text-input", RichTextInput);