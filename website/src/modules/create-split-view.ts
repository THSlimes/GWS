// this script puts the content div into a split-view together with the news-letters and sponsors

import ElementFactory from "../common/html-element-factory/ElementFactory";

// create split-view before page loads
const SPLIT_VIEW = ElementFactory.div("split-view")
    .children(
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
                        ElementFactory.a("https://www.bol.com/nl/").openInNewTab(true)
                            .class("center-content")
                            .children(ElementFactory.img("./images/logos/bol_com.png", "Bol.com")),
                        ElementFactory.a("https://www.dressmeclothing.nl/").openInNewTab(true)
                            .class("center-content")
                            .children(ElementFactory.img("./images/logos/dressme.png", "Dress-me kleding")),
                        ElementFactory.a("https://www.knaek.nl/studentenkorting/nijmegen").openInNewTab(true)
                            .class("center-content")
                            .children(ElementFactory.img("./images/logos/Knaek-logo.png", "Knaek studentenkorting"))
                    )
            )
    )
    .make();

window.addEventListener("DOMContentLoaded", () => {
    const contentElement = document.getElementsByClassName("content")[0];
    if (contentElement === undefined) throw new Error("split-view insertion failed: no content element found");
    else {
        contentElement.parentNode!.insertBefore(SPLIT_VIEW, contentElement);
        SPLIT_VIEW.prepend(contentElement);
    }
});