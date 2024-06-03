import { LinkTree } from "../firebase/database/settings/SettingsDatabase";
import ElementFactory from "../html-element-factory/ElementFactory";
import UserFeedback from "../ui/UserFeedback";
import NodeUtil from "../util/NodeUtil";
import ObjectUtil from "../util/ObjectUtil";
import StringUtil from "../util/StringUtil";
import URLUtil from "../util/URLUtil";
import { HasSections, HasValue } from "../util/UtilTypes";

type OrderedLinkTree = [string, string|OrderedLinkTree][];
namespace OrderedLinkTree {
    export function toOrdered(links:LinkTree):OrderedLinkTree {
        const out:OrderedLinkTree = [];
        
        for (const name in links) {
            const val = links[name];
            out.push([name, typeof val === "string" ? val : OrderedLinkTree.toOrdered(val)]);
        }

        return out;
    }

    export function fromOrdered(orderedLinks:OrderedLinkTree):LinkTree {
        const out:LinkTree = {};

        for (const [name, val] of orderedLinks) {
            if (name in out) { // duplicate group name
                const [newTypeName, existingTypeName] = [val, out[name]].map(v => typeof v === "string" ? "koppelingsnaam" : "groepsnaam");
                throw new Error(StringUtil.capitalize(`${newTypeName} "${name}" overlapt met ${existingTypeName} "${name}".`));
            }
            else out[name] = typeof val === "string" ? val : OrderedLinkTree.fromOrdered(val);
        }

        return out;
    }

    export function isLinkEntry(entry:[string, string|OrderedLinkTree]):entry is [string,string] {
        return typeof entry[1] === "string";
    }

    export function isSubtreeEntry(entry:[string, string|OrderedLinkTree]):entry is [string,OrderedLinkTree] {
        return Array.isArray(entry[1]);
    }
}

export default class LinkTreeEditor extends HTMLElement implements HasSections<"contents"|"addButton"> {

    protected readonly links:OrderedLinkTree;
    private savedLinks:OrderedLinkTree;
    public get value():LinkTree { return OrderedLinkTree.fromOrdered(this.links); }
    public get isDataModified() {
        return !ObjectUtil.deepEquals(this.links, this.savedLinks);
    }
    public save() {
        this.savedLinks = ObjectUtil.deepCopy(this.links);
    }

    public contents!:HTMLDivElement;
    public addButton!:HTMLDivElement;

    public constructor(root:OrderedLinkTree) {
        super();

        this.links = root;
        this.savedLinks = ObjectUtil.deepCopy(this.links);

        this.initElement();
    }

    public initElement() {
        this.classList.add("flex-rows", "in-section-gap");

        this.contents = this.appendChild(
            ElementFactory.div(undefined, "contents", "flex-rows", "in-section-gap")
                .children(() => {
                    const out:HTMLElement[] = [];
                    for (const entry of this.links) {
                        if (OrderedLinkTree.isLinkEntry(entry)) out.push(new LinkEntry(this.links, entry));
                        else if (OrderedLinkTree.isSubtreeEntry(entry)) out.push(new NestedLinkTreeEditor(this.links, entry));
                    }
                    return out;
                },
                ElementFactory.div(undefined, "add-buttons", "flex-columns", "cross-axis-center", "in-section-gap")
                    .children(
                        ElementFactory.iconButton("playlist_add", () => {
                            const newGroup:[string,OrderedLinkTree] = ["Nieuwe groep", []];
                            this.links.push(newGroup);
                            this.contents.lastElementChild!.before(new NestedLinkTreeEditor(this.links, newGroup));
                        }, "Koppelingsgroep toevoegen"),
                        ElementFactory.iconButton("add_link", () => {
                            const newEntry:[string,string] = ["Nieuwe koppeling", ""];
                            this.links.push(newEntry);
                            this.contents.lastElementChild!.before(new LinkEntry(this.links, newEntry));
                        }, "Koppeling toevoegen")
                    )
                    .make()
                )
                .make()
        );
    }

    public static fromLinkTree(linkTree:LinkTree) {
        return new LinkTreeEditor(OrderedLinkTree.toOrdered(linkTree));
    }

}

customElements.define("link-tree-editor", LinkTreeEditor);



interface LinkTreeEntry<E extends string|LinkTree> extends HasSections<"nameInput"|"upButton"|"downButton"|"removeButton">, HasValue<E> {
    get name():string;
    set name(newName:string);
}

class NestedLinkTreeEditor extends LinkTreeEditor implements LinkTreeEntry<LinkTree> {

    /** Parent LinkTree as an OrderedLinkTree. */
    private readonly parent:OrderedLinkTree;
    private readonly selfEntry:[string,OrderedLinkTree];
    private get selfIndex() {
        return this.parent.findIndex(e => e === this.selfEntry);
    }

    /** Name of the subtree as a child of `this.parent`. */
    public get name() { return this.selfEntry[0]; }
    private set name(newName) {
        this.selfEntry[0] = newName; // replace key
    }

    public nameInput!:HTMLInputElement;
    public upButton!:HTMLElement;
    public downButton!:HTMLElement;
    public removeButton!:HTMLElement;

    constructor(parent:OrderedLinkTree, selfEntry:[string,OrderedLinkTree]) {
        super(selfEntry[1]);
        
        this.parent = parent;
        this.selfEntry = selfEntry;
        
        this.nameInput.value = this.name;
    }

    public override initElement(): void {
        super.initElement();

        this.contents.toggleAttribute("collapsed", true);

        this.prepend(
            ElementFactory.div(undefined, "flex-columns", "cross-axis-center", "in-section-gap")
                .children(
                    ElementFactory.iconButton("menu", (_, self) => {
                        if (this.contents.toggleAttribute("collapsed")) [self.textContent, self.title] = ["menu", "Koppelingsgroep openen"];
                        else [self.textContent, self.title] = ["menu_open", "Koppelingsgroep sluiten"];
                    }, "Koppelingsgroep sluiten"),
                    this.nameInput = ElementFactory.input.text()
                        .placeholder("Groepsnaam")
                        .onValueChanged(newName => this.name = newName)
                        .make(),
                    this.upButton = ElementFactory.iconButton("move_up", () => {
                        const selfIndex = this.selfIndex;
                        if (selfIndex > 0) {
                            [this.parent[selfIndex - 1], this.parent[selfIndex]] = [this.parent[selfIndex], this.parent[selfIndex - 1]];
                            NodeUtil.swap(this, this.previousElementSibling!);
                        }
                    }, "Naar boven").make(),
                    this.downButton = ElementFactory.iconButton("move_down", () => {
                        const selfIndex = this.selfIndex;
                        if (selfIndex < this.parent.length - 1) {
                            [this.parent[selfIndex + 1], this.parent[selfIndex]] = [this.parent[selfIndex], this.parent[selfIndex + 1]];
                            NodeUtil.swap(this, this.nextElementSibling!);
                        }
                    }, "Naar boven").make(),
                    this.removeButton = ElementFactory.iconButton("playlist_remove", (_, self) => {
                        if (self.hasAttribute("awaiting-confirmation")) this.remove();
                        else {
                            UserFeedback.warning("Zeker weten? Dit kan niet ongedaan gemaakt worden.", 5000);
                            self.toggleAttribute("awaiting-confirmation", true);
                            self.textContent = "playlist_add_check";
                            setTimeout(() => { // back to normal
                                self.removeAttribute("awaiting-confirmation");
                                self.textContent = "playlist_remove";
                            }, 5000);
                        }
                    }, "Koppelingsgroep verwijderen").make()
                )
                .make()
        );
    }

    public override remove(): void {
        // remove from link tree too
        this.parent.splice(this.selfIndex, 1);

        super.remove();
    }

}

customElements.define("nested-link-tree-editor", NestedLinkTreeEditor);

class LinkEntry extends HTMLElement implements HasSections<"typeIcon">, LinkTreeEntry<string> {

    private readonly parent:OrderedLinkTree;
    private readonly selfEntry:[string,string];
    private get selfIndex() { return this.parent.findIndex(e => e === this.selfEntry); }
    private readonly savedSelfEntry:[string,string];
    public save() {
        this.savedSelfEntry[0] = this.selfEntry[0];
        this.savedSelfEntry[1] = this.selfEntry[1];
    }
    public get isDataModified() { return this.selfEntry[0] === this.savedSelfEntry[0] && this.selfEntry[1] === this.savedSelfEntry[1]; }

    get name():string { return this.selfEntry[0]; }
    private set name(newName) {
        this.selfEntry[0] = newName; // replace key
    }

    get value():string { return this.selfEntry[1]; }
    private set value(newValue) {
        this.selfEntry[1] = newValue || '/'; // replace value
        this.typeIcon.textContent = URLUtil.getLinkIcon(this.value);
    }

    public nameInput!:HTMLInputElement;
    public typeIcon!:HTMLParagraphElement;
    public upButton!:HTMLElement;
    public downButton!:HTMLElement;
    public removeButton!:HTMLElement;

    constructor(parent:OrderedLinkTree, selfEntry:[string,string]) {
        super();

        this.parent = parent;

        this.selfEntry = selfEntry;
        this.savedSelfEntry = [this.selfEntry[0], this.selfEntry[1]];

        this.initElement();
    }

    initElement(): void {
        this.classList.add("flex-columns", "cross-axis-center", "in-section-gap");

        this.appendChild(
            ElementFactory.div(undefined, "flex-columns", "cross-axis-center", "in-section-gap")
                .children(
                    this.typeIcon = ElementFactory.p(URLUtil.getLinkIcon(this.value || '/')).class("type-icon", "icon").make(),
                    this.nameInput = ElementFactory.input.text(this.name)
                        .class("name-input")
                        .placeholder("Koppelingsnaam")
                        .onValueChanged(newName => this.name = newName)
                        .make(),
                    ElementFactory.p("arrow_right_alt").class("icon").make(),
                    ElementFactory.input.text(this.value)
                        .class("link-input")
                        .placeholder("Koppeling")
                        .onValueChanged(newValue => this.value = newValue)
                        .make(),
                    this.upButton = ElementFactory.iconButton("move_up", () => {
                        const selfIndex = this.selfIndex;
                        if (selfIndex > 0) {
                            [this.parent[selfIndex - 1], this.parent[selfIndex]] = [this.parent[selfIndex], this.parent[selfIndex - 1]];
                            NodeUtil.swap(this, this.previousElementSibling!);
                        }
                    }, "Naar boven").make(),
                    this.downButton = ElementFactory.iconButton("move_down", () => {
                        const selfIndex = this.selfIndex;
                        if (selfIndex < this.parent.length - 1) {
                            [this.parent[selfIndex + 1], this.parent[selfIndex]] = [this.parent[selfIndex], this.parent[selfIndex + 1]];
                            NodeUtil.swap(this, this.nextElementSibling!);
                        }
                    }, "Naar boven").make(),
                    this.removeButton = ElementFactory.iconButton("remove", () => this.remove(), "Koppeling weghalen").make()
                )
                .make()
        );
    }

    public override remove():void {
        // remove from link tree too
        this.parent.splice(this.selfIndex, 1);

        super.remove();
    }

    override replaceWith(...nodes: (string | Node)[]):void {
        super.replaceWith(...nodes);
        this.upButton.toggleAttribute("disabled", this.selfIndex === 0);
        this.downButton.toggleAttribute("disabled", this.selfIndex >= this.parent.length - 1);
    }

}

customElements.define("link-entry", LinkEntry);