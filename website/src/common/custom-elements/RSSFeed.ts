import ElementFactory from "../html-element-factory/ElementFactory";
import { HasSections } from "../util/UtilTypes";

namespace RSSFeed {
    export interface FeedItem {
        title:string,
        linkToFull:string,
        postDate:Date
    }
}

export default class RSSFeed extends HTMLElement implements HasSections {

    private static readonly DEFAULT_MAX_ITEMS = 5;

    private readonly src;

    constructor(src:string) {
        super();

        this.src = src;
        
        this.initElement();
    }

    initElement():void {
        this.classList.add("flex-rows", "in-section-gap");

        fetch(this.src, { method: "GET", mode: "no-cors"})
        .then(res => res.text())
        .then(text => new DOMParser().parseFromString(text, "text/xml"))
        .then(doc => {
            const items = RSSFeed.parseDocument(doc);
            this.append(...items.map(item => ElementFactory.a(item.linkToFull, item.title).make()));
        });
    }

    private static parseDocument(doc:Document, maxItems=this.DEFAULT_MAX_ITEMS):RSSFeed.FeedItem[] {
        const out:RSSFeed.FeedItem[] = [];

        const items = doc.getElementsByTagName("item");
        for (let i = 0; i < items.length && i < maxItems; i ++) {
            const item = items[i];
            
            out.push({
                title: item.getElementsByTagName("title")[0].textContent ?? "",
                linkToFull: item.getElementsByTagName("link")[0].textContent ?? "/",
                postDate: new Date(item.getElementsByTagName("pubDate")[0].textContent ?? 0)
            });
        }

        return out;
    }

}

customElements.define("rss-feed", RSSFeed);