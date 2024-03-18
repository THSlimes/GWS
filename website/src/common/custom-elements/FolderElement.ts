import $ from "jquery";
import ElementFactory from "../html-element-factory/ElementFactory";
import Responsive from "../ui/Responsive";
import ElementUtil from "../util/ElementUtil";

/**
 * A FolderElement is a custom type of HTMLElement. It allows other elements
 * to only be shown when hovering over its name.
 */
class FolderElement extends HTMLElement {

    /** Maximum Viewport that uses click-interaction to open/close a folder. */
    private static useClickInteraction() { return Responsive.isSlimmerOrEq(Responsive.Viewport.DESKTOP_SLIM); }

    private static topFolderContentZIndex = 100;

    private _foldDir:FolderElement.Direction;
    public set foldDir(newDir:FolderElement.Direction) {
        this._foldDir = newDir;
        this.arrow.textContent = "chevron_right";
    }
    public closingDelay:number;
    private closingTimeout?:NodeJS.Timeout;



    private readonly topper:HTMLDivElement;

    private _heading:HTMLElement;
    public set heading(newHeading:HTMLElement) {
        const oldHeading = this._heading;
        
        if (newHeading !== oldHeading) {
            oldHeading.replaceWith(newHeading);
            this._heading = newHeading;
        }
    }
    public get heading() { return this._heading; }

    private readonly arrow:HTMLHeadingElement;
    public set arrowHidden(isHidden:boolean) {
        isHidden ? this.arrow.setAttribute("hidden", "") : this.arrow.removeAttribute("hidden");
    }

    
    private readonly _contents:HTMLDivElement;
    public get contents() { return this._contents; }

    private _contentsPosition!:FolderElement.ContentsPosition;
    public get contentsPosition() { return this._contentsPosition; }
    public set contentsPosition(pos:FolderElement.ContentsPosition) {
        this._contents.classList.remove("absolute", "static");
        this._contents.classList.add(pos);
        this._contentsPosition = pos;
    }

    /** Whether the folder is currently open. */
    public get isOpen() { return this.hasAttribute("open"); }

    /**
     * Creates a new FolderElement.
     * @param heading name displayed at the top
     * @param foldDir what direction it folds out
     * @param closingDelay time from the mouse leaving to when it closes
     */
    constructor(heading?:string, foldDir?:FolderElement.Direction, contentsPosition?:FolderElement.ContentsPosition, closingDelay?:number, openOn?:keyof HTMLElementEventMap, closeOn?:keyof HTMLElementEventMap) {
        super();
        this.style.position = "relative";
        this.style.display = "block";

        this._foldDir = foldDir ?? (this.hasAttribute("fold-dir") ? this.getAttribute("fold-dir") as FolderElement.Direction : null) ?? "right";
        this.closingDelay = closingDelay ?? ElementUtil.getAttrAsNumber(this, "closing-delay") ?? 0;

        // initializing element
        const originalContents = Array.from(this.children);

        this._heading = ElementFactory.h4(heading ?? this.getAttribute("heading") ?? "").class("heading").make();
        this.arrow = ElementFactory.h4("chevron_right")
            .class("arrow", "light-weight", "icon")
            .make();
        this.topper = super.appendChild(
            ElementFactory.div()
                .class("topper", "flex-columns", "cross-axis-center")
                .children(this._heading, this.arrow)
                .make()
        );

        contentsPosition ??= ElementUtil.getAttrAs<FolderElement.ContentsPosition>(this, "contents-position", v => v === "absolute" || v === "static") ?? "absolute";
        this._contents = super.appendChild(
            ElementFactory.div()
                .class("contents", contentsPosition)
                .children(...originalContents)
                .make()
        );
        this.contentsPosition = contentsPosition;

        // initializing interactivity
        openOn ??= ElementUtil.getAttrAs<keyof HTMLElementEventMap>(this, "open-on") ?? "mouseenter";
        closeOn ??= ElementUtil.getAttrAs<keyof HTMLElementEventMap>(this, "close-on") ?? "mouseleave";

        $(this._contents).hide(); // start closed
        if (openOn === closeOn) { // simple toggle interaction
            this.topper.addEventListener(openOn, () => this.isOpen ? this.close() : this.open());
        }
        else {
            this.topper.addEventListener(openOn, () => { // only for normal interactions
                if (!FolderElement.useClickInteraction()) this.open();
            });
            this.topper.addEventListener("click", e => { // only for click interaction override
                if (FolderElement.useClickInteraction()) this.isOpen ? this.close() : this.open();
                e.preventDefault();
            });
    
            this.addEventListener(openOn, () => clearTimeout(this.closingTimeout));
            this.addEventListener(closeOn, () => {
                if (!FolderElement.useClickInteraction()) { // only for normal interactions
                    this.closingTimeout = setTimeout(() => this.close(), FolderElement.useClickInteraction() ? 0 : this.closingDelay);
                }
            });
            document.body.addEventListener("click", ev => {
                if (FolderElement.useClickInteraction() && ev.target instanceof Node && !this.contains(ev.target)) { // only for click interaction override
                    this.close();
                }
            });
        }

        Responsive.onChange(() => this.topper.classList.toggle("click-action", FolderElement.useClickInteraction()), true);
    }

    /**
     * Appends the given node as a child.
     * NOTE: the node is added to the ```contents``` div
     * @param node
     * @returns the added node
     */
    public override appendChild<T extends Node>(node: T): T {
        return this._contents.appendChild(node);
    }

    /**
     * Appends multiple nodes as children.
     * NOTE: the children are added to the ```contents``` div
     * @param nodes
     */
    public override append(...nodes: (string | Node)[]): void {
        return this._contents.append(...nodes);
    }

    /**
     * Immediately opens the FolderElement.
     */
    public open() {
        if (!this.hasAttribute("disabled")) {
            const headingBB = this._heading.getBoundingClientRect();
            switch (this._foldDir) {
                case "down":
                    this._contents.style.left = "0px";
                    this._contents.style.top = this.clientHeight + "px";

                    this.arrow.style.rotate = "90deg";
                    break;
                case "right":
                    this._contents.style.left = (this.parentElement!.getBoundingClientRect().right - this.getBoundingClientRect().left) + "px";
                    this._contents.style.top = "0px";

                    this.arrow.style.rotate = "90deg";
                    break;
            }
            this._contents.style.setProperty("--top", this._contents.style.top??"0px");

            if (this.contentsPosition === "absolute") this.contents.style.zIndex = (FolderElement.topFolderContentZIndex++).toString();
            
            $(this._contents).stop().slideDown(200, () => this._contents.style.height = "");
            this.setAttribute("open", "");
        }
    }

    /**
     * Immediately closes the FolderElement.
     */
    public close() {
        $(this._contents).stop().slideUp(200);
        this.arrow.style.rotate = "0deg";
        this.removeAttribute("open");
    }

}

namespace FolderElement {
    export type Direction = "down" | "right";
    export type ContentsPosition = "absolute" | "static";
}

export default FolderElement;

customElements.define("folder-element", FolderElement);