import $ from "jquery";

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

        setInterval(() => {
            const prev = this.current;
            this.current = (this.current + 1) % revolvingElements.length;

            revolvingElements.eq(prev).fadeOut(this.fadeTime);
            revolvingElements.eq(this.current).fadeIn(this.fadeTime);

        }, this.delay);
    }

}

customElements.define("element-carousel", ElementCarousel);