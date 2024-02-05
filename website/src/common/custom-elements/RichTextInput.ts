import AssemblyLine from "../html-element-factory/AssemblyLine";
import ElementFactory from "../html-element-factory/ElementFactory";
import ColorUtil, { Color } from "../util/ColorUtil";
import ElementUtil, { HasSections } from "../util/ElementUtil";
import NumberUtil from "../util/NumberUtil";
import URLUtil from "../util/URLUtil";
import FolderElement from "./FolderElement";
import IconSelector from "./IconSelector";

/** [parent Node, "before child" index] */
type InsertionPosition = [Node, number];

function insertAt<N extends Node>(position:InsertionPosition, node:N):N {
    const [parent, ind] = position;
    if (ind <= 0) parent.insertBefore(node, parent.firstChild);
    else if (ind >= parent.childNodes.length) parent.appendChild(node);
    else parent.insertBefore(node, parent.childNodes[ind]);

    return node;
}

function swap(a:Element, b:Element) {
    const [aRep, bRep] = [document.createTextNode(""), document.createTextNode("")];

    a.replaceWith(aRep);
    b.replaceWith(bRep);

    aRep.replaceWith(b);
    bRep.replaceWith(a);
}

export default class RichTextInput extends HTMLElement implements HasSections<"toolbar"|"body"> {

    public toolbar!:HTMLDivElement;
    public body!:HTMLDivElement;

    private selectedElement:HTMLElement|null = null;

    private get insertionPosition():InsertionPosition {
        if (this.selectedElement) {
            return [this.body, ElementUtil.getChildIndex(this.body, this.selectedElement.parentNode!) + 1];
        }
        return [this.body, this.body.childNodes.length];
    }

    private insert<E extends Element>(newElem:E, focus=true, deleteOnEmpty=true) {

        newElem.classList.add("element"); // mark as element

        let insElem:Element;
        
        if (newElem instanceof HTMLImageElement) insElem = ElementFactory.div(undefined, "image-container", "flex-rows", "cross-axis-center", "in-section-gap")
            .children(() => {
                let urlInputTimeout:NodeJS.Timeout|undefined;

                newElem.src ||= location.origin + "/images/other/placeholder.svg";
                const defaultSrc = newElem.src;

                const urlInput = ElementFactory.input.url()
                    .placeholder("Link naar afbeelding...")
                    .on("input", () => {
                        const url = urlInput.value;

                        clearTimeout(urlInputTimeout);
                        urlInputTimeout = setTimeout(() => {
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
                        }, 500);
                    })
                    .make();

                const urlStatus = ElementFactory.p()
                    .class("url-status", "no-margin")
                    .make();

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
        else insElem = newElem;

        const container = ElementFactory.div(undefined, "element-container", "flex-columns", "cross-axis-center", "in-section-gap")
            .children(
                insElem,
                container => ElementFactory.p("move_up")
                    .class("icon", "click-action", "no-margin")
                    .tooltip("Naar boven")
                    .on("click", () => {
                        if (container.previousElementSibling) swap(container, container.previousElementSibling)
                    }),
                ElementFactory.p("move_down")
                    .class("icon", "click-action", "no-margin")
                    .tooltip("Naar beneden")
                    .on("click", () => {
                        if (container.nextElementSibling) swap(container, container.nextElementSibling)
                    }),
                container => ElementFactory.p("remove")
                    .class("icon", "click-action", "no-margin")
                    .tooltip("Verwijderen")
                    .on("click", () => container.remove())
            )
            .make();
        
        insertAt(this.insertionPosition, container);

        if (deleteOnEmpty) insElem.addEventListener("keydown", ev => {
            if (!insElem.textContent && (ev as KeyboardEvent).key === "Backspace") container.remove();
        });
        if (insElem instanceof HTMLElement && focus) insElem.focus();

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
                            boldToggle =ElementFactory.p("format_bold")
                                .class("icon", "click-action")
                                .tooltip("Dikgedrukt")
                                .attr("can-unselect")
                                .noFocus()
                                .on("mousedown", (ev, self) => { // make bold
                                    const isBold = self.toggleAttribute("selected");
                                    this.selectedElement?.classList.toggle("bold", isBold);
                                })
                                .make(),
                            italicToggle = ElementFactory.p("format_italic")
                                .class("icon", "click-action")
                                .tooltip("Cursief")
                                .attr("can-unselect")
                                .noFocus()
                                .on("mousedown", (ev, self) => { // make italic
                                    const isItalic = self.toggleAttribute("selected");
                                    this.selectedElement?.classList.toggle("italic", isItalic);
                                })
                                .make(),
                            underlinedToggle = ElementFactory.p("format_underlined")
                                .class("icon", "click-action")
                                .tooltip("Onderstreept")
                                .attr("can-unselect")
                                .noFocus()
                                .on("mousedown", (ev, self) => { // make underlined
                                    const isUnderlined = self.toggleAttribute("selected");
                                    this.selectedElement?.classList.toggle("underlined", isUnderlined);
                                })
                                .make(),
                            strikethroughToggle = ElementFactory.p("format_strikethrough")
                                .class("icon", "click-action")
                                .tooltip("Doorgestreept")
                                .attr("can-unselect")
                                .noFocus()
                                .on("mousedown", (ev, self) => { // make strikethrough
                                    const isStrikethrough = self.toggleAttribute("selected");
                                    this.selectedElement?.classList.toggle("strikethrough", isStrikethrough);
                                })
                                .make(),
                            colorSelector = ElementFactory.folderElement("down", 250, true)
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
                    ElementFactory.div(undefined, "section-types", "flex-columns", "cross-axis-center", "in-section-gap")
                        .children(
                            ElementFactory.p("add_link")
                                .class("icon", "click-action")
                                .tooltip("Snelkoppeling toevoegen"),
                            ElementFactory.p("attach_file_add")
                                .class("icon", "click-action")
                                .tooltip("Bestand toevoegen"),
                            ElementFactory.p("add_photo_alternate")
                                .class("icon", "click-action")
                                .tooltip("Afbeelding toevoegen")
                                .on("click", () => { // add new image
                                    this.insert(ElementFactory.img().class("align-center").make(), true, false);
                                }),
                            
                            ElementFactory.folderElement()
                                .class("category")
                                .foldDir("down")
                                .closingDelay(250)
                                .heading(
                                    ElementFactory.p("title")
                                        .class("icon", "click-action")
                                        .tooltip("Nieuwe titel")
                                        .on("click", () => { // add new title h1
                                            this.insert(
                                                ElementFactory.h1()
                                                    .class("title", "align-left")
                                                    .attr("contenteditable", "plaintext-only")
                                                    .make()
                                            );
                                        })
                                )
                                .children(
                                    ElementFactory.p("format_h1")
                                        .class("icon", "click-action")
                                        .tooltip("Nieuwe kop 1")
                                        .on("click", () => { // add new h1
                                            this.insert(
                                                ElementFactory.h1()
                                                    .class("align-left")
                                                    .attr("contenteditable", "plaintext-only")
                                                    .make()
                                            );
                                        }),
                                    ElementFactory.p("format_h2")
                                        .class("icon", "click-action")
                                        .tooltip("Nieuwe kop 2")
                                        .on("click", () => { // add new h2
                                            this.insert(
                                                ElementFactory.h2()
                                                    .class("align-left")
                                                    .attr("contenteditable", "plaintext-only")
                                                    .make()
                                            );
                                        }),
                                    ElementFactory.p("format_h3")
                                        .class("icon", "click-action")
                                        .tooltip("Nieuwe kop 3")
                                        .on("click", () => { // add new h3
                                            this.insert(
                                                ElementFactory.h3()
                                                    .class("align-left")
                                                    .attr("contenteditable", "plaintext-only")
                                                    .make()
                                            );
                                        }),

                                )
                                .tooltip("Nieuwe kop/titel"),
                            ElementFactory.p("subject")
                                .class("icon", "click-action")
                                .tooltip("Nieuwe paragraaf")
                                .noFocus()
                                .on("click", () => { // add new paragraph
                                    this.insert(
                                        ElementFactory.p()
                                            .class("align-left")
                                            .attr("contenteditable", "plaintext-only")
                                            .make()
                                        );
                                }),
                            ElementFactory.p("format_list_bulleted")
                                .class("icon", "click-action")
                                .tooltip("Nieuwe lijst"),
                            ElementFactory.p("format_list_numbered")
                                .class("icon", "click-action")
                                .tooltip("Nieuwe genummerde lijst"),
                            ElementFactory.folderElement("down", 250)
                                .class("category")
                                .heading(
                                    ElementFactory.p("data_object")
                                        .class("icon")
                                        .tooltip("Objecten")
                                )
                                .children(
                                    ElementFactory.p("calendar_month")
                                        .class("icon", "click-action")
                                        .tooltip("Activiteiten-kalender toevoegen"),
                                    ElementFactory.p("sticky_note_2")
                                        .class("icon", "click-action")
                                        .tooltip("Activiteiten toevoegen")
                                )
                        ),
                )
                .make()
        )

        this.body = this.appendChild(
            ElementFactory.div(undefined, "body", "rich-text")
                .on("focusout", () => {
                    this.selectedElement = null;
                })
                .on("focusin", (ev) => {
                    let target = ev.target;

                    if (target instanceof HTMLElement) {
                        
                        let elem = target; // find element to select
                        while (!elem.classList.contains("element")) {
                            const q = elem.querySelector(".element");
                            if (q instanceof HTMLElement) elem = q;
                            else if (elem.parentElement) elem = elem.parentElement;
                            else throw Error("uh oh :(");
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
                .make()
        );
        
    }

}

customElements.define("rich-text-input", RichTextInput);