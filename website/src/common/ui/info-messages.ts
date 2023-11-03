import $ from "jquery";

import ElementFactory from "../html-element-factory/ElementFactory";
import RichText from "./RichText";
import Responsive from "./Responsive";

let MESSAGE_AREA:HTMLDivElement;

function messageLimit() {
    return Responsive.isAnyOf("desktop", "tablet-portrait") ? 3 : 1;
}

window.addEventListener("DOMContentLoaded", () => {
    MESSAGE_AREA = document.body.appendChild(
        ElementFactory.div("info-messages")
            .class("flex-rows", "cross-axis-center")
            .make()
    );
});

type MessageType = "info" | "warning" | "error";
function createMessage(text:string, type:MessageType="info", lifetime=5000) {
    const out = ElementFactory.p()
        .html(RichText.parseLine(text))
        .class(type)
        .make();
    
    $(out).delay(lifetime).fadeOut(200, "swing", function() { this.remove(); });

    return out;
}

export function showMessage(text:string, lifetime=5000) {
    if (MESSAGE_AREA.childElementCount + 1 > messageLimit()) MESSAGE_AREA.lastChild?.remove();
    MESSAGE_AREA.prepend(createMessage(text, "info", lifetime));
}

export function showWarning(text:string, lifetime=5000) {
    if (MESSAGE_AREA.childElementCount + 1 > messageLimit()) MESSAGE_AREA.lastChild?.remove();
    MESSAGE_AREA.prepend(createMessage(text, "warning", lifetime));
}

export function showError(text:string, lifetime=5000) {
    if (MESSAGE_AREA.childElementCount + 1 > messageLimit()) MESSAGE_AREA.lastChild?.remove();
    MESSAGE_AREA.prepend(createMessage(text, "error", lifetime));
}