import "./header-and-footer";
import "../common/custom-elements/EventCalendar";

import { redirectIfMissingPermission } from "../common/firebase/authentication/permission-based-redirect";
import Permission from "../common/firebase/database/Permission";
import ElementFactory from "../common/html-element-factory/ElementFactory";
import { initUsersPanel } from "../common/admin-panels/users-panel";
import { initEventsPanel } from "../common/admin-panels/events-panel";
import { initArticlesPanel } from "../common/admin-panels/articles-panel";

// only permitted users can view page
redirectIfMissingPermission("/", [Permission.VIEW_ADMIN_PANEL, Permission.READ_OTHER_USER_INFO], true, true);

/** Union type of the IDs of all panels. */
type PanelId = "users-panel" | "messages-panel" | "events-panel" | "links-panel";

const PANEL_CONFIG:Record<PanelId, { icon:string, label:string, default?:true, selectCallback?:VoidFunction }> = {
    "users-panel": {
        icon: "group",
        label: "Accounts",
        selectCallback: initUsersPanel,
        default: true
    },
    "events-panel": {
        icon: "calendar_month",
        label: "Activiteiten",
        selectCallback: initEventsPanel,
    },
    "messages-panel": {
        icon: "mail",
        label: "Berichten",
        selectCallback: initArticlesPanel,
    },
    "links-panel": {
        icon: "account_tree",
        label: "Koppelingen"
    }
};
Object.freeze(PANEL_CONFIG);

/**
 * Shows the panel with the given id, and hides all others.
 * @param id id of the panel to show
 */
function showPanel(id:PanelId) {
    Array.from(document.getElementsByClassName("panel")).forEach(e => {
        if (e instanceof HTMLElement) e.hidden = e.id !== id;
    });

    const initFunct = PANEL_CONFIG[id].selectCallback;
    if (initFunct) initFunct();
}

function createSectionButton(icon:string, label:string, id:PanelId, selected?:boolean):HTMLElement {
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

window.addEventListener("DOMContentLoaded", () => { // insert section selectors
    const SECTION_SELECTOR = document.getElementById("section-selector") as HTMLDivElement;

    const ids = Object.keys(PANEL_CONFIG) as PanelId[];
    ids.sort((a,b) => PANEL_CONFIG[a].label.localeCompare(PANEL_CONFIG[b].label)); // sort alphabetically

    const defaultId = ids.find(id => PANEL_CONFIG[id].default) ?? ids[0];
    SECTION_SELECTOR.append(...ids.map(id => createSectionButton(PANEL_CONFIG[id].icon, PANEL_CONFIG[id].label, id, id === defaultId)));
    showPanel(defaultId);
});