import "./header-and-footer";
import "../common/custom-elements/EventCalendar";

import { redirectIfMissingPermission } from "../common/firebase/authentication/permission-based-redirect";
import Permissions from "../common/firebase/database/Permissions";
import ElementFactory from "../common/html-element-factory/ElementFactory";
import { initUsersPanel } from "../common/admin-panels/users-panel";
import { initEventsPanel } from "../common/admin-panels/events-panel";
import { initArticlesPanel } from "../common/admin-panels/articles-panel";
import { initLinksPanel } from "../common/admin-panels/links-panel";
import Loading from "../common/Loading";
import { initIdeaBoxPanel } from "../common/admin-panels/idea-box-panel";
import URLUtil from "../common/util/URLUtil";
import ObjectUtil from "../common/util/ObjectUtil";

// only permitted users can view page
redirectIfMissingPermission("/", [Permissions.Permission.VIEW_ADMIN_PANEL, Permissions.Permission.READ_OTHER_USER_INFO], true, true);

/** Union type of the IDs of all panels. */
type PanelID = "users-panel" | "articles-panel" | "events-panel" | "links-panel" | "idea-box-panel";

const PANEL_CONFIG:Record<PanelID, { icon:string, label:string, default?:true, selectCallback?:VoidFunction }> = {
    "users-panel": {
        icon: "group",
        label: "Accounts",
        selectCallback: initUsersPanel,
    },
    "events-panel": {
        icon: "calendar_month",
        label: "Activiteiten",
        selectCallback: initEventsPanel,
    },
    "articles-panel": {
        icon: "mail",
        label: "Berichten",
        selectCallback: initArticlesPanel,
    },
    "links-panel": {
        icon: "account_tree",
        label: "Koppelingen",
        selectCallback: initLinksPanel
    },
    "idea-box-panel": {
        icon: "emoji_objects",
        label: "Ideeënbox",
        selectCallback: initIdeaBoxPanel
    }
};
const preselectedPanel = URLUtil.getHashProperties()["panel"];
if (preselectedPanel in PANEL_CONFIG) PANEL_CONFIG[preselectedPanel as PanelID].default = true;
Object.freeze(PANEL_CONFIG);

/**
 * Shows the panel with the given id, and hides all others.
 * @param id id of the panel to show
 */
function showPanel(id:PanelID) {
    Array.from(document.getElementsByClassName("panel")).forEach(e => {
        if (e instanceof HTMLElement) e.hidden = e.id !== id;
    });

    const initFunct = PANEL_CONFIG[id].selectCallback;
    if (initFunct) initFunct();
    URLUtil.setHashProperty("panel", id);
}

function createSectionButton(icon:string, label:string, id:PanelID, selected?:boolean):HTMLElement {
    return ElementFactory.div(undefined, "section-button", "click-action", "flex-columns", "main-axis-space-between")
        .children(
            ElementFactory.h4(icon).class("icon", "center-content"),
            ElementFactory.h4(label).class("center-content")
        )
        .attr("selected", selected ? "" : null)
        .on("click", (e, self) => {
            showPanel(id);
            Array.from(document.getElementsByClassName("section-button")).forEach(e => {
                if (e !== self) e.removeAttribute("selected");
            });
            self.setAttribute("selected", "");
        })
        .make();
}

Loading.onDOMContentLoaded({ "section-selector": HTMLDivElement })
.then(elements => elements["section-selector"])
.then(sectionSelector => { // insert section selectors

    const ids = Object.keys(PANEL_CONFIG) as PanelID[];
    ids.sort((a,b) => PANEL_CONFIG[a].label.localeCompare(PANEL_CONFIG[b].label)); // sort alphabetically

    const defaultId = ids.find(id => PANEL_CONFIG[id].default) ?? ids[0];
    sectionSelector.append(...ids.map(id => createSectionButton(PANEL_CONFIG[id].icon, PANEL_CONFIG[id].label, id, id === defaultId)));
    showPanel(defaultId);

})
.catch(console.error);