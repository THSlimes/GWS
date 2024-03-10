import $ from "jquery";

import FolderElement from "../common/custom-elements/FolderElement";
import ElementFactory from "../common/html-element-factory/ElementFactory";
import Responsive from "../common/ui/Responsive";
import { FIREBASE_AUTH, checkLoginState } from "../common/firebase/init-firebase";
import { onPermissionCheck } from "../common/firebase/authentication/permission-based-redirect";
import Permissions from "../common/firebase/database/Permissions";
import Cache from "../common/Cache";
import FirestoreSettingsDatabase from "../common/firebase/database/settings/FirestoreSettingsDatabase";
import SettingsDatabase, { LinkTree } from "../common/firebase/database/settings/SettingsDatabase";
import MultisourceImage from "../common/custom-elements/MultisourceImage";
import Loading from "../common/Loading";
import NodeUtil from "../common/util/NodeUtil";
import ArrayUtil from "../common/util/ArrayUtil";

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

/** Whether to use a sidebar for navigation, instead of a navbar. */
function useSidebar() { return Responsive.isSlimmerOrEq(Responsive.Viewport.DESKTOP_SLIM); }

function makeNavbar(settingsDB:SettingsDatabase):Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
        Cache.getAndRefresh("navbar-links", settingsDB.getNavbarLinks())
        .then(navbarLinks => {
            let searchButton:HTMLElement;
            let searchBox:HTMLDivElement;
            let searchResults:HTMLDivElement;

            const out = ElementFactory.header()
                .class("page-header")
                .children(
                    ElementFactory.div("header-container", "flex-columns", "main-axis-space-between", "cross-axis-center")
                        .children(
                            ElementFactory.div()
                                .class("desc", "flex-rows", "main-axis-center")
                                .children(
                                    ElementFactory.a('/').children(ElementFactory.h3("Den Geitenwollen Soc.")),
                                    ElementFactory.p("Studievereniging Sociologie Nijmegen").class("subtitle")
                                ),
                            ElementFactory.div()
                                .class("links", "flex-columns", "main-axis-center", "cross-axis-baseline")
                                .children(
                                    ...makeFolderContents(navbarLinks)
                                ),
                            ElementFactory.div()
                                .class("quick-actions", "center-content", "main-axis-space-between", "cross-axis-center")
                                .children(
                                    searchButton = ElementFactory.p("search")
                                        .id("search-button",)
                                        .class("icon", "click-action")
                                        .on("click", (_, self) => {
                                            self.textContent = searchBox.style.display === "none" ? "search_off" : "search";
                                            $(searchBox).stop().slideToggle(200);
                                        })
                                        .onMake(self => {
                                            document.body.addEventListener("click", ev => {
                                                if (ev.target instanceof Node && !searchBox.contains(ev.target) && ev.target !== self) {
                                                    self.textContent = "search";
                                                    $(searchBox).stop().slideUp(200);
                                                }
                                            });
                                        })
                                        .make(),
                                    ElementFactory.p("admin_panel_settings")
                                        .class("icon", "click-action")
                                        .tooltip("Administratie-paneel")
                                        .on("click", () => location.href = "/admin-panel.html")
                                        .onMake(self => {
                                            onPermissionCheck(Permissions.Permission.VIEW_ADMIN_PANEL, hasPerms => self.style.display = hasPerms ? "" : "none", true, true);
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
                                ),
                            searchBox = ElementFactory.div(undefined, "search-box", "flex-columns", "main-axis-space-between", "cross-axis-center", "section-gap")
                                .style({ display: "none" })
                                .children(
                                    searchResults = ElementFactory.div(undefined, "results", "flex-columns", "cross-axis-center", "in-section-gap")
                                        .children(document.createElement("p"))
                                        .make(),
                                    ElementFactory.input.text()
                                        .placeholder("Zoeken...")
                                        .class("query-input")
                                        .onValueChanged(query => {
                                            NodeUtil.empty(searchResults);
                                            query = query.trim();
                                            if (query) {
                                                const matches = LinkTree.search(navbarLinks, query);
                                                searchResults.append(...ArrayUtil.interlace(
                                                    matches.map(([name, link]) => ElementFactory.a(link, name).class("subtitle").make()),
                                                    '•'
                                                ));
                                            }
                                            searchResults.appendChild(document.createElement("p"));
                                        })
                                )
                                .make()
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

            resolve(out);
        
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

            Responsive.onChange(() => {
                if (useSidebar()) {
                    sidebarDiv.prepend(...linksTree); // move links to sidebar
                    linksTree.forEach(e => {
                        if (e instanceof FolderElement) e.foldDir = "right";
                    });
                }
                else { // move links to navbar
                    linksDiv.prepend(...linksTree);
                    // force-close sidebar
                    closeSidebar();
                    linksTree.forEach(e => {
                        if (e instanceof FolderElement) e.foldDir = "down";
                    });
                }
            }, true);
        })
        .catch(reject);
    });
}

// FOOTER + COPYRIGHT NOTICE
function makeFooter(settingsDB:SettingsDatabase):Promise<HTMLElement> {
    return new Promise((resolve, reject) => {
        Loading.markLoadStart(makeFooter);

        Cache.getAndRefresh("social-media-links", settingsDB.getSocialMediaLinks())
        .then(socialMediaLinks => resolve(
            ElementFactory.footer()
                .class("page-footer", "flex-rows", "cross-axis-center")
                .children(
                    ElementFactory.h4("Je vindt ons ook op").id("link-text"),
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
                .make()
        ))
        .catch(reject)
        .finally(() => Loading.markLoadEnd(makeFooter));
    });
}

// insert both after page-load
Loading.useDynamicContent(makeNavbar(SETTINGS_DB), navbar => document.body.prepend(navbar));
Loading.useDynamicContent(makeFooter(SETTINGS_DB), footer => document.body.append(footer));