import ElementFactory from "../html-element-factory/ElementFactory";
import ColorUtil from "../util/ColorUtil";
import NumberUtil from "../util/NumberUtil";
import { HasSections, HasValue } from "../util/UtilTypes";

class ColorListEditor extends HTMLElement implements HasSections<"addButton">, HasValue<ColorUtil.HexColor[]> {

    public addButton!:HTMLElement;

    public get value() {
        const out:ColorUtil.HexColor[] = [];
        this.childNodes.forEach(c => {
            if (c instanceof ColorListEditor.Entry) out.push(c.value);
        });

        return out;
    }

    public set value(newVal:ColorUtil.HexColor[]) {
        this.childNodes.forEach(c => {
            if (c instanceof ColorListEditor.Entry) c.remove();
        });
        this.prepend(...newVal.map(val => new ColorListEditor.Entry(this, val)));
    }

    constructor(value:ColorUtil.HexColor[] = []) {
        super();

        this.initElement();

        this.value = value;
    }

    public initElement():void {
        this.classList.add("in-section-gap");

        this.addButton = this.appendChild(
            ElementFactory.iconButton("add", (ev, self) => {
                const r = NumberUtil.randInt(0, 256).toString(16).padStart(2, '0');
                const g = NumberUtil.randInt(0, 256).toString(16).padStart(2, '0');
                const b = NumberUtil.randInt(0, 256).toString(16).padStart(2, '0');
                self.before(new ColorListEditor.Entry(this, `#${r}${g}${b}`));
            }, "Nieuwe kleur toevoegen")
            .make()
        );
    }

}

customElements.define("color-list-editor", ColorListEditor);

namespace ColorListEditor {
    export class Entry extends HTMLElement implements HasSections<"colorInput"|"removeButton">, HasValue<ColorUtil.HexColor> {

        private readonly parentEditor:ColorListEditor;

        public colorInput!:HTMLInputElement;
        public removeButton!:HTMLElement;

        public set value(newVal:ColorUtil.HexColor) { this.colorInput.value = newVal; }
        public get value() { return this.colorInput.value as ColorUtil.HexColor; }

        constructor(editor:ColorListEditor, value:ColorUtil.HexColor) {
            super();

            this.parentEditor = editor;

            this.initElement();

            this.value = value;
        }

        public initElement():void {
            this.classList.add("flex-columns", "main-axis-space-between", "cross-axis-center", "in-section-gap", "in-section-padding");

            this.colorInput = this.appendChild(
                ElementFactory.input.color()
                .make()
            );

            this.removeButton = this.appendChild(
                ElementFactory.iconButton("remove", () => this.remove(), "Kleur verwijderen")
                .make()
            );
        }

    }

    customElements.define("color-list-editor-entry", Entry);
}

export default ColorListEditor;
