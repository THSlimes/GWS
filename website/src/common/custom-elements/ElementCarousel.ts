import $ from "jquery";

/**
 * An ElementCarousel is a custom type of HTMLElement which
 * cycles through its child elements. Give a child the ```cover```
 * attribute to have it cover the cycling elements instead.
 *
 * The ```delay``` attributes defines how long (in ms.) an element stays visible.
 * The ```fade-time``` attribute defines how long (in ms.) the transition takes.
 * The ```first``` attribute provides the index (from 0, excluding cover-children)
 * that should be displayed first.
 */
export default class ElementCarousel extends HTMLElement {

    private delay:number;
    private fadeTime:number;
    private current:number;
    public get currentIndex() { return this.current; }

    public readonly revolvingElements:Element[] = [];

    constructor(delay=5000, fadeTime=1000, current=0) {
        super();
        this.classList.add("center-content");

        // display parameters
        this.delay = Number.parseFloat(this.getAttribute("delay")!);
        if (isNaN(this.delay)) this.delay = delay;

        this.fadeTime = Number.parseFloat(this.getAttribute("fade-time")!);
        if (isNaN(this.fadeTime)) this.fadeTime = fadeTime;
        this.style.setProperty("--fade-time", this.fadeTime + "ms");

        this.current = Number.parseInt(this.getAttribute("current")!);
        if (isNaN(this.current)) this.current = current;

        // initializing display
        this.revolvingElements.push(...Array.from(this.children).filter(e => e.hasAttribute("cover")));
        this.revolvingElements.filter((e,i) => i !== this.current).forEach(e => e.setAttribute("hide", ""));

        setInterval(() => { // loops through children in interval
            const prev = this.current;
            this.current = (this.current + 1) % this.revolvingElements.length;

            this.revolvingElements[prev]?.setAttribute("hide", "");
            this.revolvingElements[this.current]?.removeAttribute("hide");            

        }, this.delay);
    }

    public override appendChild<T extends Node>(node: T): T {
        if (node instanceof Element && !node.hasAttribute("cover")) {
            if (this.revolvingElements.push(node)-1 !== this.current) node.setAttribute("hide", "");
        }
        
        return super.appendChild(node);
    }

    public override append(...nodes: (string | Node)[]): void {
        for (const node of nodes) {
            if (typeof node === "string") this.appendChild(document.createTextNode(node));
            else this.appendChild(node);
        }
    }

}

customElements.define("element-carousel", ElementCarousel);