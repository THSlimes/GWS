import AssemblyLine from "../../html-element-factory/AssemblyLine";
import ElementFactory from "../../html-element-factory/ElementFactory";
import ColorUtil from "../../util/ColorUtil";
import NodeUtil from "../../util/NodeUtil";
import StyleUtil from "../../util/StyleUtil";
import { HasSections } from "../../util/UtilTypes";
import FolderElement from "../FolderElement";

const EMPTY_CHAR = '‎';
function getRange(selection = document.getSelection()): Range | undefined {
    return selection?.rangeCount ? selection.getRangeAt(0) : undefined;
}

class WYSIWYGEditor extends HTMLElement implements HasSections<"toolbar" | "fsButton" | "body"> {

    private static readonly TEXT_TYPES: { name: string, tagName: string, cls?: string, createPreviewAsmLine(): AssemblyLine<any> }[] = [
        { name: "Tekst", tagName: 'p', createPreviewAsmLine: () => ElementFactory.p() },
        { name: "Titel", tagName: 'h1', cls: "title", createPreviewAsmLine: () => ElementFactory.h1().class("title") },
        { name: "Kop 1", tagName: 'h1', createPreviewAsmLine: () => ElementFactory.h1() },
        { name: "Kop 2", tagName: 'h2', createPreviewAsmLine: () => ElementFactory.h2() },
        { name: "Kop 3", tagName: 'h3', createPreviewAsmLine: () => ElementFactory.h3() }
    ];
    private static readonly FONTS: { name: string, family: string }[] = [
        { name: "Times New Roman", family: `"Times New Roman", Times, serif` },
        { name: "Arial", family: "Arial, Helvetica, sans-serif" },
        { name: "Comic Sans", family: "cursive" },
        { name: "Impact", family: `Impact, Haettenschweiler, "Arial Narrow Bold", fantasy` },
        { name: "Courier New", family: `"Courier New", Courier, monospace` }
    ];
    private static readonly EFFECTS: { cls: string, icon: string, tooltip: string }[] = [
        { cls: "bold", icon: "format_bold", tooltip: "Dikgedrukt" },
        { cls: "italic", icon: "format_italic", tooltip: "Schuingedrukt" },
        { cls: "underlined", icon: "format_underlined", tooltip: "Onderstreept" },
        { cls: "strikethrough", icon: "format_strikethrough", tooltip: "Doorgestreept" },
    ];
    private static readonly LINE_HEIGHTS: { value: number, name?: string }[] = [
        { value: 1, name: "Enkel" },
        { value: 1.15 },
        { value: 1.5 },
        { value: 2, name: "Dubbel" }
    ];

    public toolbar!: HTMLDivElement;
    public fsButton!: HTMLElement;
    public body!: HTMLDivElement;

    /** Whether the editor occupies the full screen */
    protected get isFullscreen() { return document.fullscreenElement === this; }
    protected set isFullscreen(newVal: boolean) {
        if (newVal !== this.isFullscreen) {
            if (newVal) this.requestFullscreen()
                .then(() => {
                    this.fsButton.textContent = "close_fullscreen";
                    this.fsButton.title = "Volledig scherm sluiten";
                    this.toggleAttribute("fullscreen", true);
                });
            else document.exitFullscreen()
                .then(() => {
                    this.fsButton.textContent = "open_in_full";
                    this.fsButton.title = "Volledig scherm openen";
                    this.toggleAttribute("fullscreen", false);
                });
        }
    }

    public constructor() {
        super();

        this.initElement();
    }

    public initElement(): void {
        this.classList.add("in-section-padding");

        let fontFolder: FolderElement;
        let textTypeFolder: FolderElement;

        let textColorFolder: FolderElement;
        let textBackgroundFolder: FolderElement;

        let textAlignFolder: FolderElement;
        let lineHeightFolder: FolderElement;

        const getFontSize = () => {
            const range = getRange();
            if (range) {
                const commonAncestor = range.commonAncestorContainer;
                if (this.body.contains(commonAncestor)) {
                    const elem = commonAncestor instanceof HTMLElement ? commonAncestor : commonAncestor.parentElement!;
                    return Number.parseFloat(getComputedStyle(elem).fontSize.slice(0, -2));
                }
                else return NaN;
            }
            return NaN;
        }

        this.toolbar = this.appendChild(
            ElementFactory.div(undefined, "toolbar", "flex-columns", "main-axis-space-around", "flex-wrap", "in-section-gap")
                .children(
                    ElementFactory.div(undefined, "category")
                        .children(
                            ElementFactory.iconButton("undo", () => { }, "Ongedaan maken"),
                            ElementFactory.iconButton("redo", () => { }, "Opnieuw doen"),
                        ),
                    ElementFactory.div(undefined, "category", "center-content", "in-section-gap")
                        .children(
                            textTypeFolder = ElementFactory.folderElement("down", 250, false)
                                .attr("applies-style")
                                .heading(
                                    ElementFactory.p("Tekst")
                                        .class("no-margin")
                                        .onMake(self => document.addEventListener("selectionchange", () => {
                                            const selected = Array.from(textTypeFolder.contents.children).find(c => c.hasAttribute("selected"));
                                            if (selected instanceof HTMLElement) self.textContent = selected.textContent;
                                        }))
                                )
                                .children(
                                    ...WYSIWYGEditor.TEXT_TYPES.map(({ name, tagName, cls, createPreviewAsmLine }) => createPreviewAsmLine()
                                        .text(name)
                                        .class("no-margin", "click-action")
                                        .on("click", (ev, self) => {
                                            ev.preventDefault();
                                            this.body.focus();
                                            self.toggleAttribute("selected", this.toggleStyle(cls, {}, "text-type", tagName));
                                        })
                                        .onMake(self => // apply selected
                                            document.addEventListener("selectionchange", () => self.toggleAttribute("selected", this.isInStyle(cls, {}, tagName)))
                                        ))
                                )
                                .make(),
                            fontFolder = ElementFactory.folderElement("down", 250, false)
                                .attr("applies-style")
                                .heading(
                                    ElementFactory.p("Standaard")
                                        .class("no-margin")
                                        .style({ fontFamily: "var(--std-font)" })
                                        .onMake(self => document.addEventListener("selectionchange", () => {
                                            const selected = Array.from(fontFolder.contents.children).find(c => c.hasAttribute("selected"));
                                            if (selected instanceof HTMLElement) {
                                                self.textContent = selected.textContent;
                                                self.style.fontFamily = selected.style.fontFamily;
                                            }
                                        }))
                                )
                                .children(
                                    ElementFactory.p("Standaard")
                                        .class("no-margin", "click-action")
                                        .style({ fontFamily: "var(--std-font)" })
                                        .on("click", (ev, self) => {
                                            ev.preventDefault();
                                            this.body.focus();
                                            self.toggleAttribute("selected", this.toggleStyle([], { fontFamily: "var(--std-font)" }, "font-family"));
                                        })
                                        .onMake(self => // apply selected
                                            document.addEventListener("selectionchange", () => {
                                                const isInDefaultFontElement = this.isInStyle([], { fontFamily: "var(--std-font)" });
                                                const isInFontElement = this.isInStyleGroup("font-family");

                                                self.toggleAttribute("selected", isInDefaultFontElement || !isInFontElement);
                                            })
                                        ),
                                    ...WYSIWYGEditor.FONTS.map(({ name, family }) => ElementFactory.p(name)
                                        .class("no-margin", "click-action")
                                        .style({ fontFamily: family })
                                        .on("click", (ev, self) => {
                                            ev.preventDefault();
                                            this.body.focus();
                                            self.toggleAttribute("selected", this.toggleStyle([], { fontFamily: family }, "font-family"));
                                        })
                                        .onMake(self => // apply selected
                                            document.addEventListener("selectionchange", () => self.toggleAttribute("selected", this.isInStyle([], { fontFamily: family })))
                                        ))
                                )
                                .make(),
                        ),
                    ElementFactory.div(undefined, "category", "center-content", "in-section-gap")
                        .children(
                            ElementFactory.iconButton("remove", () => this.toggleStyle([], { fontSize: `${getFontSize() - 1}px` }, "font-size"), "Kleinere tekstgrootte")
                                .onMake(self => {
                                    document.addEventListener("selectionchange", () => self.toggleAttribute("disabled", isNaN(getFontSize())));
                                }),
                            ElementFactory.p(16)
                                .class("text-center", "no-margin")
                                .onMake(self =>
                                    document.addEventListener("selectionchange", () => {
                                        const fontSize = getFontSize();
                                        if (!isNaN(fontSize)) self.textContent = fontSize.toString();
                                    })
                                ),
                            ElementFactory.iconButton("add", () => this.toggleStyle([], { fontSize: `${getFontSize() + 1}px` }, "font-size"), "Grotere tekstgrootte")
                                .onMake(self => {
                                    document.addEventListener("selectionchange", () => self.toggleAttribute("disabled", isNaN(getFontSize())));
                                }),
                        ),
                    ElementFactory.div(undefined, "category", "center-content")
                        .children(
                            ...WYSIWYGEditor.EFFECTS.map(({ cls, icon, tooltip }) =>
                                ElementFactory.iconButton(icon, (ev, self) => {
                                    ev.preventDefault();
                                    self.toggleAttribute("selected", this.toggleStyle(cls));
                                }, tooltip)
                                    .attr("applies-style")
                                    .attr("can-unselect")
                                    .onMake(self => // apply selected
                                        document.addEventListener("selectionchange", () => self.toggleAttribute("selected", this.isInStyle(cls)))
                                    )
                            ),
                            textColorFolder = ElementFactory.folderElement("down", 250, false)
                                .attr("applies-style")
                                .tooltip("Tekstkleur")
                                .heading(
                                    ElementFactory.p("format_color_text")
                                        .class("icon", "no-margin")
                                        .style({ textShadow: "0px 0px 1.5px var(--tertiary)" })
                                )
                                .children(
                                    ElementFactory.colorPicker("#000000")
                                        .on("input", (_, self) => {
                                            textColorFolder.close();
                                            this.body.focus();
                                            this.toggleStyle([], { color: self.value }, "text-color");
                                        })
                                        .on("mousedown", ev => ev.preventDefault())
                                        .onMake(self => document.addEventListener("selectionchange", () => {
                                            const colorGroupElement = this.findStyleGroupElement("text-color");
                                            const selectedColor = ColorUtil.toHex((colorGroupElement?.style.color ?? "#000000") as ColorUtil.Color);;

                                            textColorFolder.heading.style.color = self.value = selectedColor;
                                        }))
                                )
                                .make(),
                            textBackgroundFolder = ElementFactory.folderElement("down", 250, false)
                                .attr("applies-style")
                                .tooltip("Tekstkleur")
                                .heading(
                                    ElementFactory.p("format_ink_highlighter")
                                        .class("icon", "no-margin")
                                        .style({ textShadow: "0px 0px 1.5px var(--tertiary)" })
                                )
                                .children(
                                    ElementFactory.colorPicker("#000000")
                                        .on("input", (_, self) => {
                                            textBackgroundFolder.close();
                                            this.body.focus();
                                            this.toggleStyle([], { backgroundColor: self.value }, "text-background");
                                        })
                                        .on("mousedown", ev => ev.preventDefault())
                                        .onMake(self => document.addEventListener("selectionchange", () => {
                                            const colorGroupElement = this.findStyleGroupElement("text-background");
                                            const selectedColor = ColorUtil.toHex((colorGroupElement?.style.backgroundColor ?? "#000000") as ColorUtil.Color);;

                                            textBackgroundFolder.heading.style.color = self.value = selectedColor;
                                        }))
                                )
                                .make()
                        ),
                    ElementFactory.div(undefined, "category")
                        .children(
                            ElementFactory.iconButton("add_link", () => { }, "Koppeling toevoegen"),
                            ElementFactory.iconButton("attach_file_add", () => { }, "Bijlage toevoegen"),
                            ElementFactory.iconButton("add_photo_alternate", () => { }, "Afbeelding toevoegen"),
                        ),
                    ElementFactory.div(undefined, "category", "center-content", "in-section-gap")
                        .children(
                            textAlignFolder = ElementFactory.folderElement("down", 250, false)
                                .attr("applies-style")
                                .tooltip("Tekst uitlijnen")
                                .heading(
                                    ElementFactory.p("format_align_left")
                                        .class("no-margin", "icon")
                                        .onMake(self => document.addEventListener("selectionchange", () => {
                                            const alignGroupElement = this.findStyleGroupElement("text-align");
                                            const alignment = alignGroupElement?.style.textAlign ?? "left";

                                            self.textContent = `format_align_${alignment}`;
                                            Array.from(textAlignFolder.contents.children).forEach(c => c.toggleAttribute("selected", c.getAttribute("value") === alignment));
                                        }))
                                )
                                .children(
                                    ElementFactory.iconButton("format_align_left", () => {
                                        this.toggleStyle([], { textAlign: "left" }, "text-align", "div");
                                        textAlignFolder.close();
                                    }, "Links uitlijnen")
                                        .attr("value", "left"),
                                    ElementFactory.iconButton("format_align_center", () => {
                                        this.toggleStyle([], { textAlign: "center" }, "text-align", "div");
                                        textAlignFolder.close();
                                    }, "Centreren")
                                        .attr("value", "center"),
                                    ElementFactory.iconButton("format_align_right", () => {
                                        this.toggleStyle([], { textAlign: "right" }, "text-align", "div");
                                        textAlignFolder.close();
                                    }, "Rechts uitlijnen")
                                        .attr("value", "right"),
                                    ElementFactory.iconButton("format_align_justify", () => {
                                        this.toggleStyle([], { textAlign: "justify" }, "text-align", "div");
                                        textAlignFolder.close();
                                    }, "Gespreid uitlijnen")
                                        .attr("value", "justify"),
                                )
                                .make(),
                            lineHeightFolder = ElementFactory.folderElement("down", 250, false)
                                .attr("applies-style")
                                .tooltip("Regelafstand")
                                .heading(
                                    ElementFactory.p("format_line_spacing")
                                        .class("no-margin", "icon")
                                )
                                .children(
                                    ...WYSIWYGEditor.LINE_HEIGHTS.map(({ value, name }) =>
                                        ElementFactory.input.button(name ?? value.toString())
                                            .on("click", ev => {
                                                this.body.focus();
                                                this.toggleStyle([], { lineHeight: (value * 1.35).toString() }, "line-height", "div");
                                                lineHeightFolder.close();
                                            })
                                            .onMake(self => document.addEventListener("selectionchange", () => {
                                                const lineHeightGroupElement = this.findStyleGroupElement("line-height");
                                                const lineHeight = lineHeightGroupElement?.style.lineHeight ?? 1.35;

                                                self.toggleAttribute("selected", value * 1.35 == lineHeight);
                                            }))
                                    )
                                )
                                .make(),
                            ElementFactory.iconButton("format_list_bulleted", () => this.insertNode(this.makeList("ul")), "Nieuwe lijst")
                                .onMake(self => document.addEventListener("selectionchange", () => self.toggleAttribute("disabled", !this.canApply()))),
                            ElementFactory.iconButton("format_list_numbered", () => this.insertNode(this.makeList("ol")), "Nieuwe genummerde lijst")
                                .onMake(self => document.addEventListener("selectionchange", () => self.toggleAttribute("disabled", !this.canApply()))),
                            ElementFactory.folderElement("down", 250, false)
                                .heading(
                                    ElementFactory.p("table")
                                        .class("icon", "no-margin")
                                )
                                .children(
                                    ElementFactory.input.gridSize()
                                        .on("input", (_, self) => {
                                            this.body.focus();
                                            const { width, height } = self.value;
                                            this.insertNode(ElementFactory.table(width, height).make());
                                        })
                                )
                        )
                )
                .make()
        );

        this.body = this.appendChild(
            ElementFactory.div(undefined, "body", "rich-text", "in-section-padding")
                .attr("contenteditable", "plaintext-only")
                .on("keydown", ev => {
                    if (ev.key === "Enter") {
                        ev.preventDefault();
                        this.insertNode(document.createElement("br"));
                    }
                })
                .on("input", () => this.normalizeBody())
                .make()
        );

        const applyTBHeight = () => this.style.setProperty("--toolbar-height", this.toolbar.getBoundingClientRect().height + "px");
        window.addEventListener("resize", applyTBHeight);
        new ResizeObserver(applyTBHeight).observe(this.toolbar);
        setTimeout(applyTBHeight, 100); // TODO: fix race condition!

        document.addEventListener("selectionchange", () => {
            const canApply = this.canApply(); // reflect intractability
            this.querySelectorAll("*[applies-style]").forEach(e => e.toggleAttribute("disabled", !canApply));
        });
        document.dispatchEvent(new Event("selectionchange"));
    }

    private canApply(range = getRange()): range is Range {
        return range !== undefined
            && this.body.contains(range.startContainer)
            && this.body.contains(range.endContainer);
    }

    private findStyleElement(classes: string | string[] = [], style: StyleUtil.StyleMap = {}, tagName: string = "span", range = getRange()): HTMLElement | null {
        if (typeof classes === "string") classes = [classes];

        if (!range) return null;
        else {
            let node: Node | null = range.commonAncestorContainer;

            while (this.body.contains(node) && node !== null) {
                if (WYSIWYGEditor.isStyleElement(node) && WYSIWYGEditor.isStyle(node, classes, style, tagName)) return node; // style element found
                node = node.parentNode;
            }

            return null; // no style element found
        }
    }
    private isInStyle(classes: string | string[] = [], style: StyleUtil.StyleMap = {}, tagName: string = "span", range = getRange()): boolean {
        return this.findStyleElement(classes, style, tagName, range) !== null;
    }


    private findStyleGroupElement(group: string, range = getRange()): HTMLElement | null {
        if (!range) return null;
        else {
            let node: Node | null = range.commonAncestorContainer;
            while (this.body.contains(node) && node !== null) {
                if (WYSIWYGEditor.isStyleElement(node) && WYSIWYGEditor.isInGroup(node, group)) return node; // style element in group found
                else node = node.parentNode;
            }

            return null; // no style element in group found
        }
    }
    private isInStyleGroup(group: string, range = getRange()): boolean {
        return this.findStyleGroupElement(group, range) !== null;
    }

    private makeTemporaryTextNode(doSelect = true): Text {
        const out = document.createTextNode(EMPTY_CHAR);

        const checkTextNode = () => {
            if (out.textContent!.length !== 0) out.splitText(EMPTY_CHAR.length);
            out.remove();

            obs.disconnect();
            document.removeEventListener("selectionchange", selectionChangeCB);

            this.normalizeBody();
        }

        const obs = new MutationObserver(checkTextNode);
        obs.observe(out, { characterData: true });

        const selectionChangeCB = () => {
            if (!document.getSelection()?.anchorNode?.contains(out)) checkTextNode();
        }
        document.addEventListener("selectionchange", selectionChangeCB);

        if (doSelect) NodeUtil.whenInsertedIn(out, this.body)
            .then(() => {
                const range = getRange();
                range?.selectNode(out);
                range?.collapse();
            });

        return out;
    }

    private makeList(type: "ul" | "ol"): HTMLUListElement | HTMLOListElement {
        const itemAsmLine = ElementFactory.li()
            .children(() => this.makeTemporaryTextNode());

        return ElementFactory[type]()
            .children(itemAsmLine)
            .onMake(list => {
                const keydownCB: (ev: KeyboardEvent) => void = ev => {
                    const range = getRange();

                    if (range && list.contains(range.commonAncestorContainer)) {
                        const listItem = NodeUtil.getAncestors(range.commonAncestorContainer, true).find(anc => anc instanceof HTMLLIElement) as HTMLLIElement | undefined;
                        if (listItem) {
                            if ((!listItem.textContent || listItem.textContent === EMPTY_CHAR)) { // if list item is empty
                                if (["Backspace", "Enter"].includes(ev.key)) { // remove empty item
                                    if (listItem.previousElementSibling && listItem.nextElementSibling) { // is in middle of list
                                        list.after( // put following items into new list
                                            document.createElement("br"),
                                            ElementFactory[type]()
                                                .children(
                                                    ...Array.from(list.children)
                                                        .filter(c => listItem.compareDocumentPosition(c) === Node.DOCUMENT_POSITION_FOLLOWING)
                                                )
                                                .make()
                                        );
                                    }
                                    else if (listItem.previousElementSibling) { // is last child
                                        const br = document.createElement("br");
                                        list.after(br);
                                        range.selectNode(br);
                                        range.collapse();
                                    }
                                    else if (listItem.nextElementSibling) { // is first child
                                        const br = document.createElement("br");
                                        list.before(br);
                                        range.selectNode(br);
                                        range.collapse();
                                    }
                                    else { // is only child
                                        list.remove(); // remove entire list
                                        this.body.removeEventListener("keydown", keydownCB);
                                    }

                                    listItem.remove(); // remove regardless
                                }
                            }
                            else if (ev.key === "Enter" && !ev.shiftKey) { // create new entry
                                range.deleteContents();
                                const temp = document.createElement("div");
                                range.insertNode(temp);

                                const newItem = itemAsmLine.make();
                                listItem.after(newItem);
                                newItem.append(
                                    ...Array.from(listItem.childNodes)
                                        .filter(c => temp.compareDocumentPosition(c) === Node.DOCUMENT_POSITION_FOLLOWING)
                                );

                                temp.remove();
                                this.body.addEventListener("keyup", () => listItem.lastElementChild?.remove());
                            }
                        }
                    }
                };
                document.addEventListener("keydown", keydownCB);
            })
            .make();
    }


    private static readonly UNSTYLABLE_ELEMENT_NAMES: (keyof HTMLElementTagNameMap)[] = ["table", "tbody", "thead", "tr", "td"];
    private normalizeBody() {
        let html: string;
        do {
            html = this.body.innerHTML;

            // remove redundant nested style elements
            NodeUtil.onEach(this.body, n => {
                const isRedundant = WYSIWYGEditor.isStyleElement(n) && NodeUtil.getAncestors(n).some(anc =>
                    WYSIWYGEditor.isStyleElement(anc)
                    && this.body.contains(anc)
                    && (WYSIWYGEditor.areSameStyle(n, anc) || WYSIWYGEditor.areInSameGroup(n, anc))
                );

                if (isRedundant) n.replaceWith(...Array.from(n.childNodes));
            });
            this.body.normalize();

            // combine same adjacent style elements
            NodeUtil.onEach(this.body, n => {
                if (n instanceof HTMLElement && n.previousSibling instanceof HTMLElement) {
                    const combineWithPrevSibling = n.previousSibling !== null
                        && (
                            WYSIWYGEditor.areSameStyle(n, n.previousSibling) // are same style element
                            || (n.tagName === "UL" && n.previousSibling.tagName === "UL") // are both unordered lists
                            || (n.tagName === "OL" && n.previousSibling.tagName === "OL") // are both ordered lists
                        );
                    if (combineWithPrevSibling) {
                        n.prepend(...Array.from(n.previousSibling.childNodes));
                        n.previousSibling.remove();
                    }
                }
            });
            this.body.normalize();

            // remove empty style elements
            NodeUtil.onEach(this.body, n => {
                if (WYSIWYGEditor.isStyleElement(n) && !n.innerHTML) n.remove();
            });
            this.body.normalize();

            this.body.normalize();
        }
        while (this.body.innerHTML !== html); // apply until inner html doesn't change
    }

    private toggleStyle(classes: string | string[] = [], style: StyleUtil.StyleMap = {}, group?: string, tagName: string = "span", range = getRange()): boolean {
        if (!this.canApply(range)) throw new Error("style elements can't be applied here");

        let styleElem = this.findStyleElement(classes, style, tagName, range);

        if (group !== undefined) {
            const styleGroupElement = this.findStyleGroupElement(group, range);
            if (styleGroupElement) { // un-apply same group style first
                this.toggleStyle(Array.from(styleGroupElement.classList), styleGroupElement.style, undefined, styleGroupElement.tagName, range);
            }
        }

        let out: boolean;
        if (styleElem === null) { // apply style
            styleElem = WYSIWYGEditor.makeStyleElement(classes, style, group, tagName);

            if (range.collapsed) { // insert new style element
                range.insertNode(styleElem);
                const temp = styleElem.appendChild(this.makeTemporaryTextNode());

                const selectionChangeCB = () => {
                    const range = getRange();
                    if (range) {
                        if (!styleElem?.contains(range.commonAncestorContainer) && (temp.textContent === EMPTY_CHAR || temp.textContent?.length === 0)) styleElem?.remove();
                        else document.removeEventListener("selectionchange", selectionChangeCB);
                    }
                };
                document.addEventListener("selectionchange", selectionChangeCB);
            }
            else { // surround range contents
                const rangeContents = range.extractContents();

                if (rangeContents.querySelector("td")) {
                    const tableCells = rangeContents.querySelectorAll("td").forEach(tc => {
                        const tcRange = document.createRange();
                        tcRange.selectNodeContents(tc);
                        // this.toggleStyle(classes, style, group, tagName, tcRange);
                    });
                    range.insertNode(rangeContents);
                }
                else {
                    styleElem.append(rangeContents);
                    range.insertNode(styleElem);
                    range.selectNodeContents(styleElem);
                }
            }

            out = true;
        }
        else { // remove style
            // wrap selection
            const selectionRoot = document.createElement("div");
            selectionRoot.appendChild(range.extractContents());
            range.insertNode(selectionRoot);

            // replace style elem with its children
            let children = Array.from(styleElem.childNodes);
            styleElem.replaceWith(...children);

            while (children.some(c => c.contains(selectionRoot))) { // reapply style element to all unselected descendants
                const containerIndex = children.findIndex(c => c.contains(selectionRoot));
                const container = children[containerIndex];

                const beforeContainer = children.slice(0, containerIndex);
                if (beforeContainer.length !== 0) { // wrap nodes before container in copy
                    const copy = WYSIWYGEditor.cloneStyleElement(styleElem);
                    copy.append(...beforeContainer);
                    container.before(copy);
                }

                const afterContainer = children.slice(containerIndex + 1);
                if (afterContainer.length !== 0) { // wrap nodes before container in copy
                    const copy = WYSIWYGEditor.cloneStyleElement(styleElem);
                    copy.append(...afterContainer);
                    container.after(copy);
                }

                range.selectNodeContents(selectionRoot);
                children = Array.from(container.childNodes);
            }

            // unwrap selection
            const selectionContents = Array.from(selectionRoot.childNodes);
            if (selectionContents.length) { // replace selection root with selection contents
                selectionRoot.replaceWith(...selectionContents);
                range.setStartBefore(selectionContents[0]);
                range.setEndAfter(selectionContents.at(-1)!);
            }
            else { // empty selection, insert temp text node
                const temp = this.makeTemporaryTextNode();
                selectionRoot.replaceWith(temp);
            }

            out = false;
        }

        // apply normalization
        this.normalizeBody();

        return out;

    }

    private insertNode(elem: Node) {
        const range = getRange();
        if (!this.canApply(range)) throw new Error("elements can't be inserted here");
        else {
            range.deleteContents();
            range.insertNode(elem);
            range.setEndAfter(elem);
            range.collapse();
        }
    }

}

namespace WYSIWYGEditor {

    export function makeStyleElement(classes: string | string[] = [], style: StyleUtil.StyleMap = {}, group?: string, tagName: string = "span"): HTMLElement {
        const out = document.createElement(tagName);
        out.toggleAttribute("style-element", true);

        StyleUtil.apply(style, out); // apply style

        if (typeof classes === "string") classes = [classes]; // force to array
        out.classList.add(...classes); // apply classes
        if (group !== undefined) out.setAttribute("group", group); // apply group

        return out;
    }

    export function cloneStyleElement(elem: HTMLElement) {
        if (!isStyleElement(elem)) throw new Error("element is not a style element");
        else return makeStyleElement(Array.from(elem.classList), elem.style, elem.getAttribute("group") ?? undefined, elem.tagName);
    }

    export function isStyleElement(n: Node | null): n is HTMLElement {
        return n instanceof HTMLElement && n.hasAttribute("style-element");
    }

    export function isStyle(node: Node, classes: string | string[] = [], style: StyleUtil.StyleMap = {}, tagName: string = "span") {
        if (typeof classes === "string") classes = [classes];

        return isStyleElement(node) // is style element
            && node.tagName.toLowerCase() === tagName.toLowerCase() // same tag
            // same classes
            && node.classList.length === classes.length
            && classes.every(c => node.classList.contains(c))
            // same style
            && Object.entries(style).every(([k, v]) => node.style[k as keyof StyleUtil.StyleMap] === v);
    }

    export function isInGroup(node: Node, group: string) {
        return isStyleElement(node) && node.getAttribute("group") === group;
    }

    export function areSameStyle(a: HTMLElement, b: HTMLElement): boolean {
        return isStyleElement(a) && isStyle(b, Array.from(a.classList), a.style, a.tagName);
    }

    export function areInSameGroup(a: HTMLElement, b: HTMLElement): boolean {
        return a.hasAttribute("group") && a.getAttribute("group") === b.getAttribute("group");
    }

}

customElements.define("wysiwyg-editor", WYSIWYGEditor);

export default WYSIWYGEditor;