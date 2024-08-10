import ElementFactory from "../../html-element-factory/ElementFactory";
import ColorUtil from "../../util/ColorUtil";
import NodeUtil from "../../util/NodeUtil";
import { HasSections } from "../../util/UtilTypes";

class WYSIWYGEditor extends HTMLElement implements HasSections<"toolbar" | "fsButton" | "body"> {

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

        // toolbar
        this.toolbar = this.appendChild(
            ElementFactory.div(undefined, "toolbar", "flex-columns", "main-axis-center", "cross-axis-center", "flex-wrap")
                .children(
                    ElementFactory.div(undefined, "history-controls", "center-content", "flex-columns")
                        .children(
                            ElementFactory.iconButton("undo", () => { }, "Ongedaan maken"),
                            ElementFactory.iconButton("redo", () => { }, "Opnieuw doen"),
                        ),

                    ElementFactory.div(undefined, "style-options", "center-content", "flex-columns", "in-section-gap")
                        .children(
                            ElementFactory.folderElement("down", 250, false)
                                .class("style-dropdown")
                                .contentPosition("absolute")
                                .heading(
                                    ElementFactory.p("Tekst")
                                        .class("no-margin")
                                        .tooltip("Tekst stijl")
                                )
                                .children(
                                    ElementFactory.p("Tekst")
                                        .class("no-margin", "click-action")
                                        .on("click", ev => {
                                            ev.preventDefault();
                                            this.toggleStyle(WYSIWYGEditor.createStyleElement("TEXT_STYLE_TEXT"));
                                        }),
                                    ElementFactory.h1("Titel")
                                        .class("no-margin", "title", "click-action")
                                        .on("click", ev => {
                                            ev.preventDefault();
                                            this.toggleStyle(WYSIWYGEditor.createStyleElement("TEXT_STYLE_TITLE"));
                                        }),
                                    ElementFactory.h2("Ondertitel")
                                        .class("no-margin", "subtitle", "click-action")
                                        .style({ fontSize: "1rem", color: "gray" })
                                        .on("click", ev => {
                                            ev.preventDefault();
                                            this.toggleStyle(WYSIWYGEditor.createStyleElement("TEXT_STYLE_SUBTITLE"));
                                        }),
                                    ElementFactory.h1("Kop 1")
                                        .class("no-margin", "click-action")
                                        .on("click", ev => {
                                            ev.preventDefault();
                                            this.toggleStyle(WYSIWYGEditor.createStyleElement("TEXT_STYLE_HEADING_1"));
                                        }),
                                    ElementFactory.h2("Kop 2")
                                        .class("no-margin", "click-action")
                                        .on("click", ev => {
                                            ev.preventDefault();
                                            this.toggleStyle(WYSIWYGEditor.createStyleElement("TEXT_STYLE_HEADING_2"));
                                        }),
                                    ElementFactory.h3("Kop 3")
                                        .class("no-margin", "click-action")
                                        .on("click", ev => {
                                            ev.preventDefault();
                                            this.toggleStyle(WYSIWYGEditor.createStyleElement("TEXT_STYLE_HEADING_3"));
                                        })
                                ),

                            ElementFactory.folderElement("down", 250, false)
                                .class("font-dropdown")
                                .contentPosition("absolute")
                                .heading(
                                    ElementFactory.p("Standaard")
                                        .class("no-margin")
                                        .tooltip("Lettertype")
                                )
                                .children(
                                    ElementFactory.p("Standaard")
                                        .class("no-margin", "click-action")
                                        .style({ fontFamily: "var(--std-font)" })
                                        .on("click", (ev, self) => {
                                            ev.preventDefault();
                                            this.toggleStyle(WYSIWYGEditor.createStyleElement("TEXT_FONT", self.style.fontFamily));
                                        }),
                                    ElementFactory.p("Sans-serif")
                                        .class("no-margin", "click-action")
                                        .style({ fontFamily: "sans-serif" })
                                        .on("click", (ev, self) => {
                                            ev.preventDefault();
                                            this.toggleStyle(WYSIWYGEditor.createStyleElement("TEXT_FONT", self.style.fontFamily));
                                        }),
                                    ElementFactory.p("Serif")
                                        .class("no-margin", "click-action")
                                        .style({ fontFamily: "serif" })
                                        .on("click", (ev, self) => {
                                            ev.preventDefault();
                                            this.toggleStyle(WYSIWYGEditor.createStyleElement("TEXT_FONT", self.style.fontFamily));
                                        }),
                                    ElementFactory.p("Handgeschreven")
                                        .class("no-margin", "click-action")
                                        .style({ fontFamily: "cursive" })
                                        .on("click", (ev, self) => {
                                            ev.preventDefault();
                                            this.toggleStyle(WYSIWYGEditor.createStyleElement("TEXT_FONT", self.style.fontFamily));
                                        }),
                                    ElementFactory.p("Monospace")
                                        .class("no-margin", "click-action")
                                        .style({ fontFamily: "monospace" })
                                        .on("click", (ev, self) => {
                                            ev.preventDefault();
                                            this.toggleStyle(WYSIWYGEditor.createStyleElement("TEXT_FONT", self.style.fontFamily));
                                        }),
                                    ElementFactory.p("Fantasie")
                                        .class("no-margin", "click-action")
                                        .style({ fontFamily: "fantasy" })
                                        .on("click", (ev, self) => {
                                            ev.preventDefault();
                                            this.toggleStyle(WYSIWYGEditor.createStyleElement("TEXT_FONT", self.style.fontFamily));
                                        })
                                ),
                        ),

                    ElementFactory.div(undefined, "font-size-selector", "center-content", "flex-columns")
                        .children(
                            ElementFactory.iconButton("remove", () => { }, "Kleinere tekstgrootte"),
                            ElementFactory.input.number(16, 4, 32, 1)
                                .class("text-center")
                                .attr("hide-controls")
                                .tooltip("Tekstgrootte")
                                .style({ "width": "2rem" }),
                            ElementFactory.iconButton("add", () => { }, "Grotere tekstgrootte"),
                        ),

                    ElementFactory.div(undefined, "format-options", "center-content", "flex-columns")
                        .children(
                            ElementFactory.iconButton("format_bold", ev => {
                                ev.preventDefault();
                                this.toggleStyle(WYSIWYGEditor.createStyleElement("TEXT_DECORATION", "bold"));
                            }, "Dikgedrukt"),
                            ElementFactory.iconButton("format_italic", ev => {
                                ev.preventDefault();
                                this.toggleStyle(WYSIWYGEditor.createStyleElement("TEXT_DECORATION", "italic"));
                            }, "Cursief"),
                            ElementFactory.iconButton("format_underlined", ev => {
                                ev.preventDefault();
                                this.toggleStyle(WYSIWYGEditor.createStyleElement("TEXT_DECORATION", "underlined"));
                            }, "Onderlijnd"),
                            ElementFactory.iconButton("format_strikethrough", ev => {
                                ev.preventDefault();
                                this.toggleStyle(WYSIWYGEditor.createStyleElement("TEXT_DECORATION", "strikethrough"));
                            }, "Doorgestreept"),
                        ),

                    ElementFactory.div(undefined, "color-options", "center-content", "flex-columns")
                        .children(
                            ElementFactory.folderElement("down", 250, false)
                                .heading(ElementFactory.p("format_color_text").class("icon", "no-margin"))
                                .tooltip("Tekstkleur"),
                            ElementFactory.folderElement("down", 250, false)
                                .heading(ElementFactory.p("format_ink_highlighter").class("icon", "no-margin"))
                                .tooltip("Tekstmarkering"),
                        ),

                    ElementFactory.div(undefined, "media-options", "center-content", "flex-columns")
                        .children(
                            ElementFactory.folderElement("down", 250, false)
                                .heading(ElementFactory.p("add_link").class("icon", "no-margin"))
                                .tooltip("Koppeling toevoegen"),
                            ElementFactory.folderElement("down", 250, false)
                                .heading(ElementFactory.p("add_photo_alternate").class("icon", "no-margin"))
                                .tooltip("Afbeelding toevoegen"),
                            ElementFactory.folderElement("down", 250, false)
                                .heading(ElementFactory.p("attach_file_add").class("icon", "no-margin"))
                                .tooltip("Bijlage toevoegen"),
                            ElementFactory.folderElement("down", 250, false)
                                .heading(ElementFactory.p("widgets").class("icon", "no-margin"))
                                .tooltip("Widgets"),
                        ),

                    ElementFactory.div(undefined, "placement-options", "center-content", "flex-columns")
                        .children(
                            ElementFactory.folderElement("down", 250, false)
                                .heading(ElementFactory.p("format_align_left").class("icon", "no-margin"))
                                .children(
                                    ElementFactory.iconButton("format_align_left", ev => {
                                        ev.preventDefault();
                                        this.toggleStyle(WYSIWYGEditor.createStyleElement("TEXT_ALIGN", "left"));
                                    }, "Links uitlijnen"),
                                    ElementFactory.iconButton("format_align_center", ev => {
                                        ev.preventDefault();
                                        this.toggleStyle(WYSIWYGEditor.createStyleElement("TEXT_ALIGN", "center"));
                                    }, "Centreren"),
                                    ElementFactory.iconButton("format_align_right", ev => {
                                        ev.preventDefault();
                                        this.toggleStyle(WYSIWYGEditor.createStyleElement("TEXT_ALIGN", "right"));
                                    }, "Rechts uitlijnen"),
                                    ElementFactory.iconButton("format_align_justify", ev => {
                                        ev.preventDefault();
                                        this.toggleStyle(WYSIWYGEditor.createStyleElement("TEXT_ALIGN", "justify"));
                                    }, "Spreiden"),
                                )
                                .tooltip("Uitlijnen"),
                            ElementFactory.folderElement("down", 250, false)
                                .heading(ElementFactory.p("format_line_spacing").class("icon", "no-margin"))
                                .children(
                                    ElementFactory.input.button("Enkel"),
                                    ElementFactory.input.button("1.15"),
                                    ElementFactory.input.button("1.5"),
                                    ElementFactory.input.button("Dubbel"),
                                )
                                .tooltip("Regelafstand"),
                            ElementFactory.iconButton("format_list_bulleted", () => { }, "Lijst toevoegen"),
                            ElementFactory.iconButton("format_list_numbered", () => { }, "Genummerde lijst toevoegen"),
                            ElementFactory.iconButton("table_chart", () => { }, "Tabel toevoegen"),
                        ),


                    this.fsButton = ElementFactory.iconButton("open_in_full", () => this.isFullscreen = !this.isFullscreen, "Volledig scherm openen")
                        .class("fullscreen-button")
                        .make()

                )
                .make()
        );

        const scrollCB = () => { // keep toolbar on screen
            const rect = this.toolbar.getBoundingClientRect();
            const top = window.scrollY - rect.height;
            const maxTop = this.getBoundingClientRect().height - rect.height;
            this.toolbar.style.top = this.isFullscreen ?
                `${this.scrollTop}px` :
                `calc(min(${maxTop}px, max(0px, ${top}px - var(--in-section-gap) - 1.5px)))`;

        };
        window.addEventListener("scroll", scrollCB);
        window.addEventListener("scrollend", scrollCB);
        this.addEventListener("scroll", scrollCB);
        this.addEventListener("scrollend", scrollCB);
        window.addEventListener("load", () => requestAnimationFrame(() => scrollCB())); // set initial value

        document.addEventListener("fullscreenchange", () => {
            if (this.isFullscreen) {
                this.fsButton.textContent = "close_fullscreen";
                this.fsButton.title = "Volledig scherm sluiten";
                this.toggleAttribute("fullscreen", true);
            }
            else {
                this.fsButton.textContent = "open_in_full";
                this.fsButton.title = "Volledig scherm openen";
                this.toggleAttribute("fullscreen", false);
            }
        });


        // body
        this.body = this.appendChild(
            ElementFactory.div(undefined, "body", "rich-text")
                .attr("contenteditable", true)
                .children(document.createElement("br"))
                .on("keydown", (ev, self) => {
                    if (ev.key === "Enter") {
                        const selection = getSelection();
                        if (selection && self.contains(selection.anchorNode) && selection.rangeCount !== 0) {
                            ev.preventDefault();

                            const range = selection.getRangeAt(0);
                            if (!range.collapsed) range.deleteContents();

                            const br = document.createElement("br");
                            range.insertNode(br);
                            range.setStartAfter(br);
                            range.setEndAfter(br);
                        }
                    }
                })
                .make()
        );

        const resizeCB = () => { // make space for toolbar
            const rect = this.toolbar.getBoundingClientRect();
            this.body.style.marginTop = `calc(${rect.height}px + var(--in-section-gap))`;
            scrollCB();
        }
        window.addEventListener("resize", resizeCB);
        window.addEventListener("load", () => requestAnimationFrame(resizeCB));

    }

    private canApplyStyle(): boolean {
        const selection = getSelection();

        return selection !== null
            && this.body.contains(selection.anchorNode);
    }

    private toggleStyle(styleElement: Element) {
        const selection = getSelection();
        if (!selection) throw new Error("Nothing is selected");
        else if (!this.body.contains(selection.anchorNode)) throw new Error("Selection is not part of the body");
        else if (selection.rangeCount === 0) throw new Error("Selection has no ranges");

        const range = selection.getRangeAt(0);
        const ancestor = range.commonAncestorContainer;

        const matchingStyleElem = [ancestor, ...NodeUtil.getAncestors(ancestor)]
            .find(n => n instanceof Element && this.isSameStyleElement(n, styleElement));


        if (matchingStyleElem) {
            const rangeContents = Array.from(range.extractContents().childNodes);
            for (const n of rangeContents) range.insertNode(n); // reinsert to separate out nodes

            matchingStyleElem.childNodes.forEach(cn => {
                if (!rangeContents.includes(cn)) { // wrap unselected part with style element
                    const wrapper = matchingStyleElem.cloneNode(false);
                    cn.replaceWith(wrapper);
                    wrapper.appendChild(cn);
                }
            });

            (matchingStyleElem as ChildNode).replaceWith(...Array.from(matchingStyleElem.childNodes));
            // reselect old selection
            selection.removeAllRanges();
            for (const n of rangeContents) {
                const newRange = document.createRange();
                newRange.selectNode(n);
                selection.addRange(newRange);
            }

        }
        else {
            const rangeContents = Array.from(range.extractContents().childNodes);

            const styleElementClone = styleElement.cloneNode(false);
            for (const n of rangeContents) styleElementClone.appendChild(n);
            range.insertNode(styleElementClone);

            selection.removeAllRanges();
            for (const n of rangeContents) {
                const newRange = document.createRange();
                newRange.selectNode(n);
                selection.addRange(newRange);
            }
        }

        this.normalizeStyleElements(this.body);

    }

    /**
     * Normalized the descendants of the root to use as few style elements as possible.
     * @param root root of a subtree
     */
    private normalizeStyleElements(root: Element) {

        let prevHTML;
        do {
            prevHTML = root.outerHTML;

            root.normalize();

            NodeUtil.onEach(root, n => {
                if (n !== root && n instanceof Element && n.childNodes.length === 0) n.parentElement?.removeChild(n);
            });

            // remove redundant nested elements
            NodeUtil.onEach(root, node => {
                if (node instanceof Element) {

                    let ancestor = node.parentElement!;
                    while (root.contains(ancestor)) {

                        if (this.isSameStyleElement(node, ancestor)) { // node is redundant
                            node.replaceWith(...Array.from(node.childNodes));
                            break;
                        }

                        ancestor = ancestor.parentElement!;
                    }
                }
            });

            root.normalize();

            // combine adjacent identical style elements
            NodeUtil.onEach(root, node => {
                if (node instanceof Element && node !== root) {
                    const prevSibling = node.previousSibling;
                    if (prevSibling instanceof Element && this.isSameStyleElement(prevSibling, node)) { // same style, combine
                        node.prepend(...Array.from(prevSibling.childNodes));
                        prevSibling.remove();
                    }
                }
            });

            // normalize text nodes
            root.normalize();

        } while (prevHTML !== root.outerHTML);

    }

    private isSameStyleElement(a: Element, b: Element): boolean {
        return a.tagName === b.tagName &&
            (
                (a.tagName === "H1" && a.classList.contains("title") === b.classList.contains("title")) || // both (non) titles
                (a.tagName === "H2" && a.classList.contains("subtitle") === b.classList.contains("subtitle")) || // both subtitles or H2
                a.tagName === "H3" || // both H3
                ( // identically styled spans
                    (
                        a.tagName === "SPAN" ||
                        a.tagName === "P"
                    ) &&
                    a instanceof HTMLElement &&
                    b instanceof HTMLElement &&
                    a.style.cssText === b.style.cssText &&
                    a.classList.length === b.classList.length &&
                    Array.from(a.classList).every(cls => b.classList.contains(cls))
                )
            )

    }

}

namespace WYSIWYGEditor {

    interface ArgMap {
        // Text styles
        "TEXT_STYLE_TEXT": [],
        "TEXT_STYLE_TITLE": [],
        "TEXT_STYLE_SUBTITLE": [],
        "TEXT_STYLE_HEADING_1": [],
        "TEXT_STYLE_HEADING_2": [],
        "TEXT_STYLE_HEADING_3": [],

        // Font styles,
        "TEXT_FONT": [string],

        // Font size
        "TEXT_FONT_SIZE": [number],

        // Text decoration
        "TEXT_DECORATION": [string],

        // Color
        "TEXT_COLOR_TEXT": [ColorUtil.HexColor],
        "TEXT_COLOR_MARKING": [ColorUtil.HexColor],

        // Media
        "MEDIA_LINK": [string],

        // Text placement
        "TEXT_ALIGN": ["left" | "center" | "right" | "justify"],
        "TEXT_LINE_SPACING": [number]
    }

    export type StyleElementType = keyof ArgMap;

    const CREATOR_FUNCTIONS: { [T in keyof ArgMap]: (args: ArgMap[T]) => Element } = {
        TEXT_STYLE_TEXT: () => document.createElement("p"),
        TEXT_STYLE_TITLE: () => {
            const out = document.createElement("h1");
            out.classList.add("title");
            return out;
        },
        TEXT_STYLE_SUBTITLE: () => {
            const out = document.createElement("h2");
            out.classList.add("subtitle");
            return out;
        },
        TEXT_STYLE_HEADING_1: () => document.createElement("h1"),
        TEXT_STYLE_HEADING_2: () => document.createElement("h2"),
        TEXT_STYLE_HEADING_3: () => document.createElement("h3"),
        TEXT_FONT: ([font]: [string]) => {
            const out = document.createElement("span");
            out.style.fontFamily = font;
            return out;
        },
        TEXT_FONT_SIZE: ([size]: [number]) => {
            const out = document.createElement("span");
            out.style.fontSize = `${size}px`;
            return out;
        },
        TEXT_DECORATION: ([cls]: [string]) => {
            const out = document.createElement("span");
            out.classList.add(cls);
            return out;
        },
        TEXT_COLOR_TEXT: ([color]: [`#${string}`]) => {
            const out = document.createElement("span");
            out.style.color = color;
            return out;
        },
        TEXT_COLOR_MARKING: ([color]: [`#${string}`]) => {
            const out = document.createElement("span");
            out.style.backgroundColor = color;
            return out;
        },
        MEDIA_LINK: ([href]: [string]) => {
            const out = document.createElement("a");
            out.href = href;
            return out;
        },
        TEXT_ALIGN: ([alignment]: ["left" | "center" | "right" | "justify"]) => {
            const out = document.createElement("p");
            out.style.textAlign = alignment;
            return out;
        },
        TEXT_LINE_SPACING: ([spacing]: [number]) => {
            const out = document.createElement("span");
            out.style.lineHeight = spacing.toString();
            return out;
        }
    };

    export function createStyleElement<T extends StyleElementType>(type: T, ...args: ArgMap[T]): Element {
        return CREATOR_FUNCTIONS[type](args);
    }

}

customElements.define("wysiwyg-editor", WYSIWYGEditor);

export default WYSIWYGEditor;