// this script puts the content div into a split-view together with the news-letters and sponsors

import Cache from "../common/Cache";
import Loading from "../common/Loading";
import MultisourceImage from "../common/custom-elements/MultisourceImage";
import Placeholder from "../common/custom-elements/Placeholder";
import FirestoreSettingsDatabase from "../common/firebase/database/settings/FirestoreSettingsDatabase";
import SettingsDatabase from "../common/firebase/database/settings/SettingsDatabase";
import ElementFactory from "../common/html-element-factory/ElementFactory";

const SETTINGS_DB:SettingsDatabase = new FirestoreSettingsDatabase();

function makeSplitView(settingsDB:SettingsDatabase):Promise<HTMLElement> {
    return Cache.getAndRefresh("sponsor-links", settingsDB.getSponsorLinks())
        .then(sponsorLinks => {
            return ElementFactory.div("split-view")
                .children(
                    new Placeholder("split-view-content"),
                    ElementFactory.div("news-letters", "boxed", "flex-rows", "cross-axis-center")
                        .children(
                            ElementFactory.h2("Nieuwsbrieven").class("section-name"),
                            document.getElementsByClassName("display_archive")[0]
                        )
                        .onMake(self => {
                            const displayArchive = self.lastElementChild as HTMLDivElement;
                            displayArchive.classList.add("flex-rows", "in-section-gap");
                            displayArchive.childNodes.forEach(campaign => {
                                campaign.firstChild?.remove();
                                const link = campaign.firstChild as HTMLAnchorElement;
                                link.addEventListener("click", () => location.href = link.href);
                            });
                        }),
                    ElementFactory.div("sponsors", "boxed", "flex-rows")
                        .children(
                            ElementFactory.h2("Onze sponsoren").class("section-name"),
                            ElementFactory.div(undefined, "logos", "flex-rows", "main-axis-space-between", "cross-axis-center")
                                .children(
                                    ...sponsorLinks.sort((a,b) => a.name.localeCompare(b.name)).map(link => ElementFactory.a(link.href)
                                        .openInNewTab(true)
                                        .class("center-content")
                                        .children(new MultisourceImage(link.origin, link.src))
                                        .tooltip(link.name)
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