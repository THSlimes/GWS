import $ from "jquery";

import FolderElement from "../common/custom-elements/FolderElement";
import ElementFactory from "../common/html-element-factory/ElementFactory";
import Responsive, { Viewport } from "../common/ui/Responsive";
import { FIREBASE_AUTH, onAuth, checkLoginState } from "../common/firebase/init-firebase";
import { showError } from "../common/ui/info-messages";
import { checkPermissions, onPermissionCheck } from "../common/firebase/authentication/permission-based-redirect";
import Permission from "../common/firebase/database/Permission";
import Cache from "../common/Cache";

/** Creates the link to an article given its ID. */
export function articleLink(id: string) { return `/article.html?id=${id}`; }

// HEADER / NAVBAR

const DEFAULT_LINK = "/";
type NavbarConfig = { [name:string]: NavbarConfig | string }
const NAVBAR_CONFIG:NavbarConfig = {
    "Vereniging": {
        "Algemeen": articleLink("vereniging-algemeen"),
        "Verenigingsblad 't blaatje": articleLink("vereniging-verenigingsblad-t-blaatje"),
        "Lidmaatschap": articleLink("vereniging-lidmaatschap"),
        "Huidig bestuur": {
            "Voorzitter": DEFAULT_LINK,
            "Penningmeester en Commissaris Interne Betrekkingen": DEFAULT_LINK,
            "Secretaris": DEFAULT_LINK,
            "Commissaris Algemene Zaken": DEFAULT_LINK
        },
        "Oud-besturen": DEFAULT_LINK,
        "Commissies": {
            "’t Blaatje": DEFAULT_LINK,
            "Contentcommissie": DEFAULT_LINK,
            "Carrièrecommissie": DEFAULT_LINK,
            "Den Geitenwollen Soccer": DEFAULT_LINK,
            "Dinercommissie": DEFAULT_LINK,
            "Feestcommissie": DEFAULT_LINK,
            "Formele Activiteitencommissie": DEFAULT_LINK,
            "Introductiecommissie": DEFAULT_LINK,
            "Jaarboekcommissie": DEFAULT_LINK,
            "Kascontrolecommissie": DEFAULT_LINK,
            "Lustrumcommissie": DEFAULT_LINK,
            "Sportcommissie": DEFAULT_LINK,
            "Studiereiscommissie": DEFAULT_LINK,
            "Weekendcommissie": DEFAULT_LINK
        },
        "GWS-kamer": DEFAULT_LINK
    },
    "Agenda": "/calendar.html",
    "Onderwijs": {
        "Aankomende studenten": DEFAULT_LINK,
        "Sociologie": DEFAULT_LINK,
        "Studieadviseur": DEFAULT_LINK,
        "Medezeggenschap": DEFAULT_LINK,
        "Boekenverkoop": DEFAULT_LINK
    },
    "Carrière": {
        "Bedrijfsprofielen": DEFAULT_LINK,
        "Alumni aan het woord": {
            "Acht vragen aan Anna Reith": DEFAULT_LINK,
            "Acht vragen aan Sanne van der Drift": DEFAULT_LINK,
            "Tien vragen aan Sander Sloot": DEFAULT_LINK,
            "Elf vragen aan Hakim Bouali": DEFAULT_LINK,
            "Twaalf vragen aan Joris Blaauw": DEFAULT_LINK,
            "Tien vragen aan Roza Meuleman": DEFAULT_LINK,
            "Twaalf vragen aan Camiel Margry": DEFAULT_LINK,
            "Elf vragen aan Gideon van der Hulst": DEFAULT_LINK
        },
        "Vacatures": DEFAULT_LINK
    },
    "Samenwerkingen": {
        "Wat bieden wij?": DEFAULT_LINK,
        "Onze sponsoren": DEFAULT_LINK,
        "GWS-sticker": DEFAULT_LINK
    },
    "Leden": {
        "Bestuurswerving": DEFAULT_LINK,
        "Declaratieformulier": DEFAULT_LINK,
        "Documenten": DEFAULT_LINK,
        "Huidige dealtjes": DEFAULT_LINK,
        "Foto's": DEFAULT_LINK,
        "Ideeënbox": DEFAULT_LINK,
        "Inschrijvingen activiteiten": DEFAULT_LINK,
        "Inzendingen nieuwsbrief": DEFAULT_LINK,
        "Samenvattingen": DEFAULT_LINK,
        "Vertrouwenspersonen": DEFAULT_LINK,
    },
    "Contact": {
        "Contactgegevens": DEFAULT_LINK
    },
    "Inschrijven": DEFAULT_LINK
};

function createLink(text:string, url:string):HTMLAnchorElement {
    let isExternal = false;
    try {
        const parsed = new URL(url);
        isExternal = parsed.hostname !== window.location.hostname;
    } catch (e) { /* assume internal link */ }

    return ElementFactory.a(url)
        .class("link")
        .openInNewTab(isExternal)
        .children(
            ElementFactory.h5(text)
                .children(isExternal ? ElementFactory.span(" open_in_new").class("icon") : null)
        ).make();
}

function createFolderContents(config:NavbarConfig, nestingLvl=0):(FolderElement|HTMLAnchorElement)[] {
    const out:(FolderElement|HTMLAnchorElement)[] = [];

    for (const heading in config) {
        const v = config[heading];
        if (typeof v === "string") out.push(createLink(heading, v));
        else {
            const folder = new FolderElement(heading, nestingLvl === 0 ? "down" : "right", "absolute", 200);
            folder.append(...createFolderContents(v, nestingLvl+1));
            out.push(folder);
        }
    }

    return out;
}

const USES_SIDEBAR:Viewport[] = ["mobile-portrait", "tablet-portrait"];
function createHeader(config:NavbarConfig):HTMLElement {
    const out = ElementFactory.header()
        .class("page-header")
        .children(
            ElementFactory.div("header-container", "flex-columns", "main-axis-space-between", "cross-axis-center")
                .children(
                    ElementFactory.div()
                        .class("desc", "flex-rows", "main-axis-center")
                        .children(
                            ElementFactory.a('/').children(ElementFactory.h4("Den Geitenwollen Soc.")),
                            ElementFactory.p("Studievereniging Sociologie Nijmegen").class("subtitle")
                        ),
                    ElementFactory.div()
                        .class("links", "flex-columns", "main-axis-center", "cross-axis-baseline")
                        .children(
                            ...createFolderContents(config)
                        ),
                    ElementFactory.div()
                        .class("quick-actions", "center-content", "main-axis-space-between", "cross-axis-center")
                        .children(
                            ElementFactory.p("search")
                                .id("search-button",)
                                .class("icon", "click-action")
                                .on("click", () => showError("Not yet implemented.")),
                            ElementFactory.p("admin_panel_settings")
                                .class("icon", "click-action")
                                .tooltip("Administratie-paneel")
                                .on("click", () => location.href = "/admin-panel.html")
                                .onMake(self => {
                                    onPermissionCheck(Permission.VIEW_ADMIN_PANEL, hasPerms => self.style.display = hasPerms ? "" : "none", true, true);
                                }),
                            ElementFactory.p("login")
                                .class("icon", "click-action")
                                .tooltip("Inloggen")
                                .on("click", () => location.href = "/login.html")
                                .onMake(self => { // hide login button when already logged in
                                    checkLoginState(loggedIn => self.style.display = loggedIn ? "none" : "", true);
                                    FIREBASE_AUTH.onAuthStateChanged(user => self.style.display = user ? "none" : "");
                                }),
                            ElementFactory.p("logout")
                                .class("icon", "click-action")
                                .tooltip("Uitloggen")
                                .on("click", () => {
                                    FIREBASE_AUTH.signOut();
                                    Cache.remove("is-logged-in");
                                    location.reload();
                                })
                                .onMake(self => { // hide account button when not logged in
                                    checkLoginState(loggedIn => self.style.display = loggedIn ? "" : "none", true);
                                    FIREBASE_AUTH.onAuthStateChanged(user => self.style.display = user ? "" : "none");
                                }),
                            ElementFactory.p("menu")
                                .id("open-menu-button")
                                .class("icon", "click-action")
                                .style({"display": "none"})
                                .on("click", () => {
                                    sidebar.hasAttribute("shown") ? closeSidebar() : openSidebar()
                                })
                        )
                ),
                ElementFactory.div("sidebar-container")
                    .children(
                        ElementFactory.div("sidebar", "links")
                    )
                    .on("click", (e, self) => {
                        if (e.target === self) closeSidebar();
                    })
        )
        .make();

    function openSidebar() {
        $(sidebarContainer).stop().fadeIn(200);
        sidebar.setAttribute("shown", "");
        openMenuButton.textContent = "menu_open";
        document.body.classList.add("no-scroll");
    }

    function closeSidebar() {
        $(sidebarContainer).stop().fadeOut(200);
        sidebar.removeAttribute("shown");
        openMenuButton.textContent = "menu";
        document.body.classList.remove("no-scroll");
    }

    const sidebarContainer = out.querySelector("#sidebar-container")!;
    const sidebar = out.querySelector("#sidebar")!;

    const openMenuButton = out.querySelector("#open-menu-button") as HTMLParagraphElement;

    const linksDiv = out.querySelector(".links")!;
    const sidebarDiv = out.querySelector("#sidebar")!;
    const linksTree = Array.from(out.querySelectorAll(".links > *"));

    function checkMoveLinks() {
        if (Responsive.isAnyOf(...USES_SIDEBAR)) {
            sidebarDiv.prepend(...linksTree); // move links to sidebar
            linksTree.forEach(e => {
                if (e instanceof FolderElement) e.foldDir = "right";
            });
        }
        else { // move links to navbar
            linksDiv.prepend(...linksTree);
            // force-close sidebar
            $(sidebarContainer).hide();
            sidebar.removeAttribute("shown");
            document.body.classList.remove("no-scroll");
            (out.querySelector("#open-menu-button") as HTMLInputElement).value = "menu";
            linksTree.forEach(e => {
                if (e instanceof FolderElement) e.foldDir = "down";
            });
        }
    }
    Responsive.onChange = () => checkMoveLinks();
    checkMoveLinks(); // initial check

    return out;
}



// FOOTER + COPYRIGHT NOTICE
function createFooter():Node {
    return ElementFactory.footer()
        .class("page-footer", "flex-rows", "cross-axis-center")
        .children(
            ElementFactory.h4("Je vindt ons ook op ...").id("link-text"),
            ElementFactory.div()
                .class("social-media-links", "flex-columns", "main-axis-space-between")
                .children(
                    ElementFactory.a("https://www.instagram.com/svdengeitenwollensoc/")
                        .children(
                            ElementFactory.img("./images/logos/Instagram_Glyph_Gradient.png", "Instagram")
                                .class("click-action")
                        ),
                    ElementFactory.a("https://nl.linkedin.com/in/s-v-den-geitenwollen-soc-496145163")
                        .id("linked-in-link")
                        .children(
                            ElementFactory.img("./images/logos/LI-In-Bug.png", "Linked-In")
                                .class("click-action")
                        ),
                    ElementFactory.a("https://www.facebook.com/dengeitenwollensoc/")
                        .children(
                            ElementFactory.img("./images/logos/Facebook_Logo_Primary.png", "Facebook")
                                .class("click-action")
                        ),
                ),
            ElementFactory.h5(`© ${new Date().getFullYear()} Den Geitenwollen Soc.`)
                .class("copyright-notice")
        )
        .make();
}


// create header and footer before page-load
const HEADER = createHeader(NAVBAR_CONFIG);
const FOOTER = createFooter();

// insert both after page-load
window.addEventListener("DOMContentLoaded", () => {
    document.body.prepend(HEADER);
    document.body.appendChild(FOOTER);
});