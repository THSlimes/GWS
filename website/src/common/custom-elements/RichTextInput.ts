import AssemblyLine from "../html-element-factory/AssemblyLine";
import ElementFactory from "../html-element-factory/ElementFactory";
import { HasSections } from "../util/ElementUtil";

/** [parent Node, "before child" index] */
type InsertionPosition = [Node, number];

function insertAt<N extends Node>(position:InsertionPosition, node:N):N {
    const [parent, ind] = position;
    if (ind === 0) parent.insertBefore(node, parent.firstChild);
    else if (ind === parent.childNodes.length) parent.appendChild(node);
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

    private get insertionPosition():InsertionPosition {
        return [this.body, this.body.childNodes.length];
    }

    private insert<E extends Element>(newElem:E, focus=true, deleteOnEmpty=true) {
        const container = ElementFactory.div(undefined, "element-container", "flex-columns", "cross-axis-center", "in-section-gap")
            .children(
                newElem,
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

        newElem.classList.add("element");
        if (deleteOnEmpty) newElem.addEventListener("keydown", ev => {
            if (!newElem.textContent && (ev as KeyboardEvent).key === "Backspace") container.remove();
        });
        if (newElem instanceof HTMLElement && focus) newElem.focus();

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

        this.toolbar = this.appendChild(
            ElementFactory.div(undefined, "toolbar", "flex-columns", "main-axis-space-evenly", "section-gap")
                .children(
                    ElementFactory.div(undefined, "styling", "flex-columns", "in-section-gap")
                        .children(
                            boldToggle =ElementFactory.p("format_bold")
                                .class("icon", "click-action")
                                .tooltip("Dikgedrukt")
                                .attr("can-unselect")
                                .on("mousedown", (ev, self) => {
                                    // prevent focus change
                                    ev.stopImmediatePropagation();
                                    ev.preventDefault();

                                    // make bold
                                    const isBold = self.toggleAttribute("selected");
                                    selectedElement?.classList.toggle("bold", isBold);
                                })
                                .make(),
                            italicToggle = ElementFactory.p("format_italic")
                                .class("icon", "click-action")
                                .tooltip("Cursief")
                                .attr("can-unselect")
                                .on("mousedown", (ev, self) => {
                                    // prevent focus change
                                    ev.stopImmediatePropagation();
                                    ev.preventDefault();

                                    // make italic
                                    const isItalic = self.toggleAttribute("selected");
                                    selectedElement?.classList.toggle("italic", isItalic);
                                })
                                .make(),
                            underlinedToggle = ElementFactory.p("format_underlined")
                                .class("icon", "click-action")
                                .tooltip("Onderstreept")
                                .attr("can-unselect")
                                .on("mousedown", (ev, self) => {
                                    // prevent focus change
                                    ev.stopImmediatePropagation();
                                    ev.preventDefault();

                                    // make underlined
                                    const isUnderlined = self.toggleAttribute("selected");
                                    selectedElement?.classList.toggle("underlined", isUnderlined);
                                })
                                .make(),
                            strikethroughToggle = ElementFactory.p("format_strikethrough")
                                .class("icon", "click-action")
                                .tooltip("Doorgestreept")
                                .attr("can-unselect")
                                .on("mousedown", (ev, self) => {
                                    // prevent focus change
                                    ev.stopImmediatePropagation();
                                    ev.preventDefault();

                                    // make strikethrough
                                    const isStrikethrough = self.toggleAttribute("selected");
                                    selectedElement?.classList.toggle("strikethrough", isStrikethrough);
                                })
                                .make(),
                            ElementFactory.folderElement()
                                .foldDir("down")
                                .hideArrow()
                                .closingDelay(250)
                                .heading(
                                    ElementFactory.p("format_size")
                                        .class("icon", "click-action")
                                        .tooltip("Tekstgrootte")
                                )
                                .children(
                                    ElementFactory.input.number(12, 1, 144)
                                ),
                            ElementFactory.folderElement()
                                .foldDir("down")
                                .hideArrow(true)
                                .closingDelay(250)
                                .heading(
                                    ElementFactory.p("format_color_text")
                                        .class("icon", "click-action", "color-heading")
                                        .tooltip("Tekstkleur")
                                )
                                .children(
                                    folder => ElementFactory.input.color("#000000")
                                        .on("input", (ev, colorInput) => folder.heading.style.color = colorInput.value)
                                )
                        ),
                    ElementFactory.div(undefined, "section-types", "flex-columns", "cross-axis-center", "in-section-gap")
                        .children(
                            ElementFactory.folderElement()
                                .class("category")
                                .foldDir("down")
                                .closingDelay(250)
                                .heading(
                                    ElementFactory.p("title")
                                        .class("icon", "click-action")
                                        .tooltip("Nieuwe titel")
                                        .on("click", () => { // add new title h1
                                            this.insert(ElementFactory.h1().class("title").attr("contenteditable", "plaintext-only").make());
                                        })
                                )
                                .children(
                                    ElementFactory.p("format_h1")
                                        .class("icon", "click-action")
                                        .tooltip("Nieuwe kop 1")
                                        .on("click", () => { // add new h1
                                            this.insert(ElementFactory.h1().attr("contenteditable", "plaintext-only").make());
                                        }),
                                    ElementFactory.p("format_h2")
                                        .class("icon", "click-action")
                                        .tooltip("Nieuwe kop 2")
                                        .on("click", () => { // add new h2
                                            this.insert(ElementFactory.h2().attr("contenteditable", "plaintext-only").make());
                                        }),
                                    ElementFactory.p("format_h3")
                                        .class("icon", "click-action")
                                        .tooltip("Nieuwe kop 3")
                                        .on("click", () => { // add new h3
                                            this.insert(ElementFactory.h3().attr("contenteditable", "plaintext-only").make());
                                        }),

                                )
                                .tooltip("Nieuwe kop/titel"),
                            ElementFactory.p("subject")
                                .class("icon", "click-action")
                                .tooltip("Nieuwe paragraaf")
                                .on("click", () => { // add new paragraph
                                    this.insert(ElementFactory.p().attr("contenteditable", "plaintext-only").make());
                                }),
                            ElementFactory.p("format_list_bulleted")
                                .class("icon", "click-action")
                                .tooltip("Nieuwe lijst"),
                            ElementFactory.p("format_list_numbered")
                                .class("icon", "click-action")
                                .tooltip("Nieuwe genummerde lijst"),
                            ElementFactory.p("add_photo_alternate")
                                .class("icon", "click-action")
                                .tooltip("Afbeelding toevoegen"),
                            ElementFactory.p("add_link")
                                .class("icon", "click-action")
                                .tooltip("Snelkoppeling toevoegen"),
                            ElementFactory.p("attach_file_add")
                                .class("icon", "click-action")
                                .tooltip("Bestand toevoegen"),
                            ElementFactory.folderElement()
                                .class("category")
                                .foldDir("down")
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

        let selectedElement:Element|null = null

        this.body = this.appendChild(
            ElementFactory.div(undefined, "body", "rich-text")
                .on("focusout", () => {
                    selectedElement = null;
                })
                .on("focusin", (ev) => {
                    const target = ev.target;

                    if (target instanceof Element && target.classList.contains("element")) {
                        selectedElement = target;
                        
                        boldToggle.toggleAttribute("selected", target.classList.contains("bold"));
                        italicToggle.toggleAttribute("selected", target.classList.contains("italic"));
                        underlinedToggle.toggleAttribute("selected", target.classList.contains("underlined"));
                        strikethroughToggle.toggleAttribute("selected", target.classList.contains("strikethrough"));
                    }
                })
                .make()
        );
        
    }

}

customElements.define("rich-text-input", RichTextInput);