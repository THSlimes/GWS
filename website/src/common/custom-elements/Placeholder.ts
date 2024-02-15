export default class Placeholder extends HTMLElement {

    private static readonly ALL_BY_ID:Record<string,Placeholder> = {};

    constructor(id?:string) {
        super();

        if (id) this.id = id;
        if (!this.id) throw new Error("placeholders must have an ID");

        if (this.id in Placeholder.ALL_BY_ID) throw new DuplicateIdError(this.id);
        else Placeholder.ALL_BY_ID[this.id] = this;

        new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (mutation.target instanceof Placeholder) {
                    // switch id in record
                    if (mutation.oldValue) delete Placeholder.ALL_BY_ID[mutation.oldValue];
                    Placeholder.ALL_BY_ID[mutation.target.id] = mutation.target;
                }
            }
        }).observe(this, { attributes:true, attributeFilter:["id"], attributeOldValue:true });
    }

    public override replaceWith(...nodes: (string | Node)[]): void {
        super.replaceWith(...nodes);
        if (!document.contains(this)) delete Placeholder.ALL_BY_ID[this.id];
    }

    static replaceWith<N extends Node>(id:string, replacement:N):N {
        const placeholder = Placeholder.ALL_BY_ID[id];
        if (placeholder) {
            placeholder.replaceWith(replacement);
            return replacement;
        }
        else throw new Error(`no placeholder with id "${id}"`);
    }

}

window.addEventListener("DOMContentLoaded", () => customElements.define("place-holder", Placeholder));

class DuplicateIdError extends Error {

    constructor(id:string) {
        super(`placeholder with id "${id}" already exists`);
    }

}