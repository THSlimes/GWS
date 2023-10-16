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

    constructor() {
        super();
        this.classList.add("center-content");

        // display parameters
        this.delay = Number.parseFloat(this.getAttribute("delay")!);
        if (isNaN(this.delay)) this.delay = 5000;

        this.fadeTime = Number.parseFloat(this.getAttribute("fade-time")!);
        if (isNaN(this.fadeTime)) this.fadeTime = 1000;

        try { this.current = Number.parseInt(this.getAttribute("first")??"0"); }
        catch (e) { this.current = 0; }

        // initializing display
        $(this).children().filter((i,elem) => elem.hasAttribute("cover")).css({"z-index": 1});

        const revolvingElements = $(this).children().filter((i,elem) => !elem.hasAttribute("cover"));
        revolvingElements.filter(i => i !== this.current).hide();

        setInterval(() => { // loops through children in interval
            const prev = this.current;
            this.current = (this.current + 1) % revolvingElements.length;

            revolvingElements.eq(prev).fadeOut(this.fadeTime);
            revolvingElements.eq(this.current).fadeIn(this.fadeTime);

        }, this.delay);
    }

}

customElements.define("element-carousel", ElementCarousel);