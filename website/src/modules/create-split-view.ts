// this script puts the content div into a split-view together with the news-letters and sponsors

import Cache from "../common/Cache";
import Loading from "../common/Loading";
import MultisourceImage from "../common/custom-elements/MultisourceImage";
import Placeholder from "../common/custom-elements/Placeholder";
import RSSFeed from "../common/custom-elements/RSSFeed";
import FirestoreSettingsDatabase from "../common/firebase/database/settings/FirestoreSettingsDatabase";
import SettingsDatabase, { ImagedLink } from "../common/firebase/database/settings/SettingsDatabase";
import ElementFactory from "../common/html-element-factory/ElementFactory";

const SETTINGS_DB:SettingsDatabase = new FirestoreSettingsDatabase();
const NEWS_LETTER_RSS_SOURCE = `${location.origin}/test.xml`;

function makeSplitView(settingsDB:SettingsDatabase):Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
        Cache.getAndRefresh("sponsor-links", settingsDB.getSponsorLinks())
        .then(sponsorLinks => resolve(
            ElementFactory.div("split-view")
                .children(
                    new Placeholder("split-view-content"),
                    ElementFactory.div("news-letters", "boxed")
                        .children(
                            ElementFactory.h2("Nieuwsbrieven").class("section-name"),
                            new RSSFeed(NEWS_LETTER_RSS_SOURCE)
                        ),
                    ElementFactory.div("sponsors", "boxed", "flex-rows")
                        .children(
                            ElementFactory.h2("Onze sponsoren").class("section-name"),
                            ElementFactory.div(undefined, "logos", "flex-rows", "main-axis-space-between", "cross-axis-center")
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
                .make()
        ))
        .catch(reject);
    });
}

Loading.useDynamicContent(makeSplitView(SETTINGS_DB), splitView => {
    const contentElement = document.getElementsByClassName("content")[0];
    if (!contentElement) throw new Error("split-view insertion failed: no content element found");
    else {
        contentElement.replaceWith(splitView);
        Placeholder.replaceWith("split-view-content", contentElement);
    }
});