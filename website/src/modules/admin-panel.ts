import { redirectIfMissingPermission } from "../common/firebase/authentication/permission-based-redirect";
import { Permission } from "../common/firebase/database/Permission";
import ElementFactory from "../common/html-element-factory/ElementFactory";
import "./header-and-footer";

redirectIfMissingPermission("/", Permission.VIEW_ADMIN_PANEL, true, true);

type PanelId = "accounts-panel" | "messages-panel";

/** [icon, label, panel id, isOpen?] triples / quads. */
const SECTION_CONFIG:[string, string, PanelId, boolean?][] = [
    ["group", "Accounts", "accounts-panel"],
    ["mail", "Berichten", "messages-panel"],
]
SECTION_CONFIG.sort((a,b) => a[1].localeCompare(b[1])); // sort alphabetically

/**
 * Shows the panel with the given id, and hides all others.
 * @param id id of the panel to show
 */
function showPanel(id:PanelId) {
    Array.from(document.getElementsByClassName("panel")).forEach(e => {
        if (e instanceof HTMLElement) e.hidden = e.id !== id;
    });
}

function createSectionButton(icon:string, label:string, id:PanelId):HTMLElement {
    return ElementFactory.div(undefined, "section-button", "click-action", "flex-columns")
        .children(
            ElementFactory.h4(icon).class("icon", "center-content"),
            ElementFactory.h4(label).class("center-content")
        )
        .on("click", () => showPanel(id))
        .make();
}

window.addEventListener("DOMContentLoaded", () => {
    const SECTION_SELECTOR = document.getElementById("section-selector") as HTMLDivElement;

    SECTION_SELECTOR.append(...SECTION_CONFIG.map(c => createSectionButton(c[0], c[1], c[2])));
    showPanel((SECTION_CONFIG.find(c => c[3]) ?? SECTION_CONFIG[0])[2]);
});