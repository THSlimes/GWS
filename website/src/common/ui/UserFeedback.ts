import $ from "jquery";

import ElementFactory from "../html-element-factory/ElementFactory";
import Cache from "../Cache";
import Responsive from "./Responsive";
import Loading from "../Loading";

enum Type {
    INFO = "info",
    SUCCESS = "success",
    WARNING = "warning",
    ERROR = "error"
}

abstract class UserFeedback {
    private static MESSAGE_AREA:HTMLDivElement;
    static {
        Loading.onDOMContentLoaded()
        .then(() => { // optimized for speed
            this.MESSAGE_AREA = document.body.appendChild(document.createElement("div"));
            this.MESSAGE_AREA.id = "info-messages";
            this.MESSAGE_AREA.classList.add("flex-rows", "cross-axis-center");

            const msgData = Cache.get("relayed-message");
            if (msgData) {
                switch (msgData.type) {
                    case UserFeedback.MessageType.INFO:
                        UserFeedback.info(msgData.content, msgData.lifetime);
                        break;
                    case UserFeedback.MessageType.SUCCESS:
                        UserFeedback.success(msgData.content, msgData.lifetime);
                        break;
                    case UserFeedback.MessageType.WARNING:
                        UserFeedback.warning(msgData.content, msgData.lifetime);
                        break;
                    case UserFeedback.MessageType.ERROR:
                        UserFeedback.error(msgData.content, msgData.lifetime);
                        break;
                }
                Cache.remove("relayed-message");
            }
        });
    }
    
    protected static get messageLimit() { return Responsive.isSlimmerOrEq(Responsive.Viewport.TABLET_PORTRAIT) ? 1 : 3; }



    private static createMessage(text:string, type:Type, lifetime=5000) {
        const out = ElementFactory.p()
            .text(text)
            .class("boxed", "message", type)
            .make();
        
        $(out).delay(lifetime).fadeOut(200, "swing", function() { this.remove(); });
    
        return out;
    }

    public static info(text:string, lifetime=5000, onComplete?:VoidFunction) {
        if (this.MESSAGE_AREA.childElementCount + 1 > this.messageLimit) this.MESSAGE_AREA.lastChild?.remove();
        this.MESSAGE_AREA.prepend(this.createMessage(text, UserFeedback.MessageType.INFO, lifetime));
        if (onComplete) setTimeout(onComplete, lifetime);
    }

    public static relayInfo(content:string, lifetime=5000) {
        Cache.set("relayed-message", { type: UserFeedback.MessageType.INFO, content: content, lifetime }, Date.now() + 10000);
    }

    public static success(text:string, lifetime=5000, onComplete?:VoidFunction) {
        if (this.MESSAGE_AREA.childElementCount + 1 > this.messageLimit) this.MESSAGE_AREA.lastChild?.remove();
        this.MESSAGE_AREA.prepend(this.createMessage(text, UserFeedback.MessageType.SUCCESS, lifetime));
        if (onComplete) setTimeout(onComplete, lifetime);
    }

    public static relaySuccess(content:string, lifetime=5000) {
        Cache.set("relayed-message", { type: UserFeedback.MessageType.SUCCESS, content: content, lifetime }, Date.now() + 10000);
    }

    public static warning(text:string, lifetime=5000, onComplete?:VoidFunction) {
        if (this.MESSAGE_AREA.childElementCount + 1 > this.messageLimit) this.MESSAGE_AREA.lastChild?.remove();
        this.MESSAGE_AREA.prepend(this.createMessage(text, UserFeedback.MessageType.WARNING, lifetime));
        if (onComplete) setTimeout(onComplete, lifetime);
    }

    public static relayWarning(content:string, lifetime=5000) {
        Cache.set("relayed-message", { type: UserFeedback.MessageType.WARNING, content: content, lifetime }, Date.now() + 10000);
    }

    public static error(text:string, lifetime=5000, onComplete?:VoidFunction) {
        if (this.MESSAGE_AREA.childElementCount + 1 > this.messageLimit) this.MESSAGE_AREA.lastChild?.remove();
        this.MESSAGE_AREA.prepend(this.createMessage(text, UserFeedback.MessageType.ERROR, lifetime));
        if (onComplete) setTimeout(onComplete, lifetime);
    }

    public static relayError(content:string, lifetime=5000) {
        Cache.set("relayed-message", { type: UserFeedback.MessageType.ERROR, content: content, lifetime }, Date.now() + 10000);
    }
}

namespace UserFeedback {

    export const MessageType = Type;

    export interface MessageData {
        type: Type,
        content:string,
        lifetime:number
    }

}

export default UserFeedback;