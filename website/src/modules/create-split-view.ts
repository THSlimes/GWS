// this script puts the content div into a split-view together with the news-letters and sponsors

import Cache from "../common/Cache";
import MultisourceImage from "../common/custom-elements/MultisourceImage";
import FirestoreSettingsDatabase from "../common/firebase/database/settings/FirestoreSettingsDatabase";
import SettingsDatabase, { ImagedLink } from "../common/firebase/database/settings/SettingsDatabase";
import ElementFactory from "../common/html-element-factory/ElementFactory";

const SETTINGS_DB:SettingsDatabase = new FirestoreSettingsDatabase();
/** Number of hours to wait between querying the sponsor links. */
const SPONSOR_LINKS_QUERY_FREQUENCY = 6;
const SPONSOR_LINKS_PROMISE = new Promise<ImagedLink[]>((resolve, reject) => {
    const cached = Cache.get("sponsor-links", true);
    if (cached) { // got from cache
        resolve(cached);
        if (!Cache.has("sponsor-links")) SETTINGS_DB.getSponsorLinks() // invalidated after getting, get from DB
            .then(sponsorLinks => Cache.set("sponsor-links", sponsorLinks,  Date.now() + SPONSOR_LINKS_QUERY_FREQUENCY))
            .catch(console.error);
    }
    else SETTINGS_DB.getSponsorLinks() // no cached version
        .then(sponsorLinks => {
            Cache.set("sponsor-links", sponsorLinks, Date.now() + SPONSOR_LINKS_QUERY_FREQUENCY*60*60*1000);
            resolve(sponsorLinks);
        })
        .catch(reject);
});

function createSplitView(content:Element, sponsorLinks:ImagedLink[]):HTMLElement {
    return ElementFactory.div("split-view")
        .children(
            content,
            ElementFactory.div("news-letters", "boxed")
                .children(
                    ElementFactory.h3("Nieuwsbrieven").class("section-name"),
                    ElementFactory.div("news-letters-list", "flex-rows", "main-axis-start")
                        .children(
                            ElementFactory.p("Nieuwsbrief juni 2023"),
                            ElementFactory.p("Nieuwsbrief april 🐥🌻"),
                            ElementFactory.p("Nieuwsbrief maart🌹"),
                            ElementFactory.p("Nieuwsbrief februari💚💛"),
                            ElementFactory.p("Nieuwsbrief December")
                        )
                ),
            ElementFactory.div("sponsors", "boxed", "flex-rows")
                .children(
                    ElementFactory.h3("Onze sponsoren").class("section-name"),
                    ElementFactory.div(undefined, "logos", "flex-rows", "main-axis-center", "cross-axis-center")
                        .children(
                            ...sponsorLinks.map(link => ElementFactory.a(link.href)
                                .openInNewTab(true)
                                .class("center-content")
                                .children(new MultisourceImage(link.origin, link.src))
                                .onMake(self => {
                                    const img = self.firstElementChild as MultisourceImage;
                                    img.alt = link.name;
                                    img.classList.add("click-action")
                                })
                            )
                        )
                )
        )
        .make();
}

window.addEventListener("DOMContentLoaded", () => {
    const contentElement = document.getElementsByClassName("content")[0];
    if (!contentElement) throw new Error("split-view insertion failed: no content element found");
    else SPONSOR_LINKS_PROMISE
        .then(sponsorLinks => {
            const temp = document.createElement("div");
            contentElement.replaceWith(temp);
            temp.replaceWith(createSplitView(contentElement, sponsorLinks));
        })
        .catch(console.error);
});