import { HasSections } from "../util/UtilTypes";

export default class IFrameContainer extends HTMLElement implements HasSections<"contents"> {

    private readonly src:string;

    public contents!:HTMLIFrameElement;

    constructor(src:string) {
        super();

        this.src = this.getAttribute("src") ?? src;

        this.initElement();
    }

    initElement():void {
        this.contents = this.appendChild(document.createElement("iframe"));
        this.contents.classList.add("contents");
        this.contents.src = this.src;
        this.setAttribute("src", this.src);
    }

}

customElements.define("iframe-container", IFrameContainer);