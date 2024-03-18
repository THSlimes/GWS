import { ImagedLink } from "../firebase/database/settings/SettingsDatabase";
import ElementFactory from "../html-element-factory/ElementFactory";
import ArrayUtil from "../util/ArrayUtil";
import FunctionUtil from "../util/FunctionUtil";
import { HasSections } from "../util/UtilTypes";
import MultisourceImage from "./MultisourceImage";

class ImagedLinksEditor extends HTMLElement implements HasSections<"addButton"> {

    private readonly links:ImagedLink[];
    public get value() {
        // check for duplicate names
        for (let i = 0; i < this.links.length; i ++) {
            const link = this.links[i];

            if (!link.name.trim()) throw new Error(`Item #${i+1} heeft geen naam.`);
            else if (ArrayUtil.count(this.links, l => l.name === link.name) > 1) {
                throw new Error(`Meerdere items hebben de naam "${link.name}".`);
            }
        }

        return [...this.links];
    }
    
    public addButton!:HTMLElement;

    constructor(links:ImagedLink[]) {
        super();

        this.links = links;

        this.initElement();
    }

    initElement():void {
        this.append(
            ...this.links.map(link => new ImagedLinksEditor.Entry(this, link)),
            this.addButton = ElementFactory.iconButton("add", () => {
                const newEntry:ImagedLink = { name: "", origin: "firebase-storage-public", src: "placeholder.svg", href: "" };
                this.links.push(newEntry);
                this.lastElementChild!.before(new ImagedLinksEditor.Entry(this, newEntry));
            }, "Item toevoegen").make()
        );
    }

    public removeEntry(entry:ImagedLink) {
        const ind = this.links.indexOf(entry);
        this.links.splice(ind, 1);
        this.children[ind].remove();
    }

}

customElements.define("imaged-links-editor", ImagedLinksEditor);


namespace ImagedLinksEditor {
    export class Entry extends HTMLElement implements HasSections<"image"|"nameInput"|"originInput"|"sourceInput"|"hrefInput"|"removeButton"> {
    
        private readonly editor:ImagedLinksEditor;
        private readonly link:ImagedLink;
    
        public nameInput!:HTMLInputElement;
        public image!:MultisourceImage;
        public originInput!:HTMLSelectElement & { value:"firebase-storage-public"|"external" };
        public sourceInput!:HTMLInputElement;
        public hrefInput!:HTMLInputElement;
        public removeButton!:HTMLElement;
    
        constructor(editor:ImagedLinksEditor, link:ImagedLink) {
            super();
    
            this.editor = editor;
            this.link = link;
    
            this.initElement();
        }
    
        initElement():void {
            this.classList.add("flex-rows", "cross-axis-center", "in-section-gap");
    
            this.nameInput = this.appendChild(
                ElementFactory.input.text(this.link.name)
                    .onValueChanged(newName => this.link.name = newName)
                    .placeholder("Naam van item...")
                    .class("name-input")
                    .make()
            );
    
            this.image = this.appendChild(new MultisourceImage(this.link.origin, this.link.src));
            this.image.classList.add("image");
    
            this.originInput = this.appendChild(
                ElementFactory.select({ "firebase-storage-public": "Firebase cloud-opslag (openbaar)", "external": "Directe link" })
                    .value(this.link.origin === "firebase-storage-protected" ? "firebase-storage-public" : this.link.origin)
                    .onValueChanged(newOrigin => {
                        this.image.origin = this.link.origin = newOrigin;
                        this.sourceInput.placeholder = this.link.origin === "external" ? "Link naar afbeelding..." : "Pad naar afbeelding...";
                    })
                    .class("origin-input")
                    .make()
            );
    
            const setSrcCallback = () => this.image.src = this.sourceInput.value;
            this.sourceInput = this.appendChild(
                ElementFactory.input.text(this.link.src)
                    .class("source-input")
                    .placeholder(this.link.origin === "external" ? "Link naar afbeelding..." : "Pad naar afbeelding...")
                    .onValueChanged(newSrc => {
                        this.link.src = newSrc;
                        FunctionUtil.setDelayedCallback(setSrcCallback, 300);
                    })
                    .make()
            );
    
            this.hrefInput = this.appendChild(
                ElementFactory.input.text(this.link.href)
                    .onValueChanged(newHref => this.link.href = newHref)
                    .placeholder("Link naar item...")
                    .class("href-input")
                    .make()
            );
    
            this.removeButton = this.appendChild(
                ElementFactory.iconButton("delete", () => this.editor.removeEntry(this.link), "Item weghalen")
                    .class("remove-button")
                    .make()
            );
    
        }
    
    }

    customElements.define("imaged-link-entry", Entry);
}

export default ImagedLinksEditor;