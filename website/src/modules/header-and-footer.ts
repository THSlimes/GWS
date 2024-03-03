import $ from "jquery";

import FolderElement from "../common/custom-elements/FolderElement";
import ElementFactory from "../common/html-element-factory/ElementFactory";
import Responsive, { Viewport } from "../common/ui/Responsive";
import { FIREBASE_AUTH, checkLoginState } from "../common/firebase/init-firebase";
import { showError } from "../common/ui/info-messages";
import { onPermissionCheck } from "../common/firebase/authentication/permission-based-redirect";
import Permission from "../common/firebase/database/Permission";
import Cache from "../common/Cache";
import FirestoreSettingsDatabase from "../common/firebase/database/settings/FirestoreSettingsDatabase";
import { ImagedLink, LinkTree } from "../common/firebase/database/settings/SettingsDatabase";
import MultisourceImage from "../common/custom-elements/MultisourceImage";

const SETTINGS_DB = new FirestoreSettingsDatabase();

// HEADER / NAVBAR

function makeLink(text:string, url:string):HTMLAnchorElement {
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

function makeFolderContents(config:LinkTree, nestingLvl=0):(FolderElement|HTMLAnchorElement)[] {
    const out:(FolderElement|HTMLAnchorElement)[] = [];

    for (const heading in config) {
        const v = config[heading];
        if (typeof v === "string") out.push(makeLink(heading, v));
        else {
            const folder = new FolderElement(heading, nestingLvl === 0 ? "down" : "right", "absolute", 200);
            folder.append(...makeFolderContents(v, nestingLvl+1));
            out.push(folder);
        }
    }

    return out;
}

const USES_SIDEBAR:Viewport[] = ["mobile-portrait", "tablet-portrait"];
function makeHeader(config:LinkTree):HTMLElement {
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
                            ...makeFolderContents(config)
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

/** Number of hours to wait between querying the navbar links. */
const NAVBAR_QUERY_FREQUENCY = 6;
const NAVBAR_LINKS_PROMISE = new Promise<LinkTree>((resolve, reject) => {
    const cached = Cache.get("navbar-links", true);
    if (cached) { // got from cache
        
        resolve(cached);
        if (!Cache.has("navbar-links")) SETTINGS_DB.getNavbarLinks('/') // invalidated after getting, get from DB
            .then(navbarLinks => Cache.set("navbar-links", navbarLinks,  Date.now() + NAVBAR_QUERY_FREQUENCY))
            .catch(console.error);
    }
    else SETTINGS_DB.getNavbarLinks('/') // no cached version
        .then(navbarLinks => {
            Cache.set("navbar-links", navbarLinks, Date.now() + NAVBAR_QUERY_FREQUENCY*60*60*1000);
            resolve(navbarLinks);
        })
        .catch(reject);
});


// FOOTER + COPYRIGHT NOTICE
function makeFooter(socialMediaLinks:ImagedLink[]):Node {
    return ElementFactory.footer()
        .class("page-footer", "flex-rows", "cross-axis-center")
        .children(
            ElementFactory.h4("Je vindt ons ook op ...").id("link-text"),
            ElementFactory.div()
                .class("social-media-links", "flex-columns", "main-axis-space-between")
                .children(
                    ...socialMediaLinks.map(link => ElementFactory.a(link.href)
                        .openInNewTab(true)
                        .children(new MultisourceImage(link.origin, link.src))
                        .onMake(self => {
                            const img = self.firstElementChild as MultisourceImage;
                            img.alt = link.name;
                            img.classList.add("click-action");
                        })
                    )
                ),
            ElementFactory.h5(`© ${new Date().getFullYear()} Den Geitenwollen Soc.`)
                .class("copyright-notice")
        )
        .make();
}

/** Number of hours to wait between querying the social media links. */
const SOCIAL_MEDIA_QUERY_FREQUENCY = 6;
const SOCIAL_MEDIA_LINKS_PROMISE = new Promise<ImagedLink[]>((resolve, reject) => {
    const cached = Cache.get("social-media-links", true);
    if (cached) { // got from cache
        
        resolve(cached);
        if (!Cache.has("social-media-links")) SETTINGS_DB.getSocialMediaLinks() // invalidated after getting, get from DB
            .then(socialMediaLinks => Cache.set("social-media-links", socialMediaLinks,  Date.now() + SOCIAL_MEDIA_QUERY_FREQUENCY*60*60*1000))
            .catch(console.error);
    }
    else SETTINGS_DB.getSocialMediaLinks() // no cached version
        .then(socialMediaLinks => {
            Cache.set("social-media-links", socialMediaLinks, Date.now() + SOCIAL_MEDIA_QUERY_FREQUENCY*60*60*1000);
            resolve(socialMediaLinks);
        })
        .catch(reject);
});


// insert both after page-load
window.addEventListener("DOMContentLoaded", () => {
    NAVBAR_LINKS_PROMISE.then(navbarLinks => document.body.prepend(makeHeader(navbarLinks))).catch(console.error);
    SOCIAL_MEDIA_LINKS_PROMISE.then(socialMediaLinks => document.body.appendChild(makeFooter(socialMediaLinks))).catch(console.error);
});