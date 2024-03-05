// this script puts the content div into a split-view together with the news-letters and sponsors

import Cache from "../common/Cache";
import Loading from "../common/Loading";
import MultisourceImage from "../common/custom-elements/MultisourceImage";
import Placeholder from "../common/custom-elements/Placeholder";
import FirestoreSettingsDatabase from "../common/firebase/database/settings/FirestoreSettingsDatabase";
import SettingsDatabase, { ImagedLink } from "../common/firebase/database/settings/SettingsDatabase";
import ElementFactory from "../common/html-element-factory/ElementFactory";

const SETTINGS_DB:SettingsDatabase = new FirestoreSettingsDatabase();

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
                            ElementFactory.h2("Onze sponsoren").class("section-name"),
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