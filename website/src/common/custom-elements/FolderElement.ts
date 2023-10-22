import $ from "jquery";
import ElementFactory from "../html-element-factory/ElementFactory";

export type FoldingDirection = "down" | "right";

/**
 * A FolderElement is a custom type of HTMLElement. It allows other elements
 * to only be shown when hovering over its name.
 */
export default class FolderElement extends HTMLElement {

    private readonly foldDir:FoldingDirection;
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
    constructor(heading:string, foldDir:FoldingDirection="right", closingDelay=0) {
        super();
        this.style.position = "relative";
        this.style.display = "block";

        this.foldDir = foldDir;
        this.closingDelay = closingDelay;

        // initializing element
        this.heading = ElementFactory.h5(heading).class("heading").make();
        this.arrow = ElementFactory.h5(foldDir === "down" ? "expand_more" : "chevron_right")
            .class("arrow", "light-weight", "icon")
            .make();
        this.topper = super.appendChild(
            ElementFactory.div()
                .class("topper", "flex-columns", "main-axis-space-between", "cross-axis-start")
                .children(this.heading, this.arrow)
                .make()
        );

        this.contents = super.appendChild(
            ElementFactory.div()
                .class("contents")
                .make()
        );

        // initializing interactivity
        $(this.contents).hide(); // start closed
        this.topper.addEventListener("mouseenter", () => this.open());
        this.addEventListener("mouseenter", () => clearTimeout(this.closingTimeout));
        this.addEventListener("mouseleave", () => {
            this.closingTimeout = setTimeout(() => this.close(), this.closingDelay);
        });
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
        const headingBB = this.heading.getBoundingClientRect();
        switch (this.foldDir) {
            case "down":
                this.contents.style.left = "0px";
                this.contents.style.top = this.clientHeight + "px";
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
        $(this.contents).stop().slideUp(200);
        this.arrow.style.rotate = "0deg";
        this.removeAttribute("open");
    }

}

customElements.define("folder-element", FolderElement);