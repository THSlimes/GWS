import $ from "jquery";
import ElementFactory from "../html-element-factory/ElementFactory";
import Responsive, { Viewport } from "../ui/Responsive";
import ElementUtil from "../util/ElementUtil";

export type FoldingDirection = "down" | "right";
export type ContentPosition = "absolute" | "static";

/** Viewport-types which open/close using clicking instead of hovering. */
const USES_CLICK_INTERACTION:Viewport[] = ["mobile-portrait", "tablet-portrait"];

/**
 * A FolderElement is a custom type of HTMLElement. It allows other elements
 * to only be shown when hovering over its name.
 */
export default class FolderElement extends HTMLElement {

    private _foldDir:FoldingDirection;
    public set foldDir(newDir:FoldingDirection) {
        this._foldDir = newDir;
        this.arrow.innerText = "chevron_right";
    }
    public closingDelay:number;
    private closingTimeout?:NodeJS.Timeout;

    private readonly topper:HTMLDivElement;
    private readonly heading:HTMLHeadingElement;
    private readonly arrow:HTMLHeadingElement;
    
    private readonly contents:HTMLDivElement;

    /** Whether the folder is currently open. */
    public get isOpen() { return this.hasAttribute("open"); }

    /**
     * Creates a new FolderElement.
     * @param heading name displayed at the top
     * @param foldDir what direction it folds out
     * @param closingDelay time from the mouse leaving to when it closes
     */
    constructor(heading?:string, foldDir?:FoldingDirection, contentPosition?:ContentPosition, closingDelay?:number, openOn?:keyof HTMLElementEventMap, closeOn?:keyof HTMLElementEventMap) {
        super();
        this.style.position = "relative";
        this.style.display = "block";

        this._foldDir = foldDir ?? (this.hasAttribute("fold-dir") ? this.getAttribute("fold-dir") as FoldingDirection : null) ?? "right";
        this.closingDelay = closingDelay ?? ElementUtil.getAttrAsNumber(this, "closing-delay") ?? 0;

        // initializing element
        const originalContents = Array.from(this.children);

        this.heading = ElementFactory.h5(heading ?? this.getAttribute("heading") ?? "").class("heading").make();
        this.arrow = ElementFactory.h5("chevron_right")
            .class("arrow", "light-weight", "icon")
            .make();
        this.topper = super.appendChild(
            ElementFactory.div()
                .class("topper", "flex-columns", "cross-axis-center")
                .children(this.heading, this.arrow)
                .make()
        );

        contentPosition ??= ElementUtil.getAttrAs<ContentPosition>(this, "content-position", v => v === "absolute" || v === "static") ?? "absolute";
        this.contents = super.appendChild(
            ElementFactory.div()
                .class("contents", contentPosition)
                .children(...originalContents)
                .make()
        );

        // initializing interactivity
        openOn ??= ElementUtil.getAttrAs<keyof HTMLElementEventMap>(this, "open-on") ?? "mouseenter";
        closeOn ??= ElementUtil.getAttrAs<keyof HTMLElementEventMap>(this, "close-on") ?? "mouseleave";

        $(this.contents).hide(); // start closed
        if (openOn === closeOn) {
            this.topper.addEventListener(openOn, () => this.isOpen ? this.close() : this.open());
        }
        else {
            this.topper.addEventListener(openOn, () => { // only for hover-interactions
                if (!Responsive.isAnyOf(...USES_CLICK_INTERACTION)) this.open();
            });
            this.topper.addEventListener("click", e => { // only for click-interactions
                if (Responsive.isAnyOf(...USES_CLICK_INTERACTION)) this.isOpen ? this.close() : this.open();
                e.preventDefault();
            });
    
            this.addEventListener(openOn, () => clearTimeout(this.closingTimeout));
            this.addEventListener(closeOn, () => {
                this.closingTimeout = setTimeout(
                    () => this.close(),
                    Responsive.isAnyOf(...USES_CLICK_INTERACTION) ? 0 : this.closingDelay
                );
            });
        }
    }

    /**
     * Appends the given node as a child.
     * NOTE: the node is added to the ```contents``` div
     * @param node
     * @returns the added node
     */
    public override appendChild<T extends Node>(node: T): T {
        return this.contents.appendChild(node);
    }

    /**
     * Appends multiple nodes as children.
     * NOTE: the children are added to the ```contents``` div
     * @param nodes
     */
    public override append(...nodes: (string | Node)[]): void {
        return this.contents.append(...nodes);
    }

    /**
     * Immediately opens the FolderElement.
     */
    public open() {
        console.log("open");
        
        const headingBB = this.heading.getBoundingClientRect();
        switch (this._foldDir) {
            case "down":
                this.contents.style.left = "0px";
                this.contents.style.top = this.clientHeight + "px";

                this.arrow.style.rotate = "90deg";
                break;
            case "right":
                this.contents.style.left = (this.parentElement!.getBoundingClientRect().right - this.getBoundingClientRect().left) + "px";
                this.contents.style.top = "0px";

                this.arrow.style.rotate = "90deg";
                break;
        }
        this.contents.style.setProperty("--top", this.contents.style.top??"0px");

        $(this.contents).stop().slideDown(200);
        this.setAttribute("open", "");
    }

    /**
     * Immediately closes the FolderElement.
     */
    public close() {
        console.log("close");
        
        $(this.contents).stop().slideUp(200);
        this.arrow.style.rotate = "0deg";
        this.removeAttribute("open");
    }

}

customElements.define("folder-element", FolderElement);