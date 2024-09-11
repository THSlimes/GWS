import ElementFactory from "../html-element-factory/ElementFactory";
import NumberUtil from "../util/NumberUtil";
import { HasSections, HasValue } from "../util/UtilTypes";

export interface GridSize {
    width: number,
    height: number
}

export default class GridSizeInput extends HTMLElement implements HasSections<"cells" | "valueDisplay">, HasValue<GridSize> {

    private static readonly MAX_SIZE: GridSize = { width: 10, height: 10 };
    static { Object.freeze(this.MAX_SIZE); }

    public cells!: HTMLDivElement;
    public valueDisplay!: HTMLParagraphElement;

    private readonly _value: GridSize;

    get value(): GridSize {
        return { ...this._value };
    }
    set value(newVal: GridSize) {
        if (newVal.width !== this._value.width || newVal.height !== this._value.height) {
            this._value.width = newVal.width;
            this._value.height = newVal.height;

            this.cells.querySelectorAll(".cell").forEach(cell => cell.toggleAttribute("highlighted",
                Number.parseInt(cell.getAttribute('x') ?? '0') <= newVal.width
                && Number.parseInt(cell.getAttribute('y') ?? '0') <= newVal.height
            ));

            this.valueDisplay.textContent = `${newVal.width} x ${newVal.height}`;

            this.dispatchEvent(new Event("change"));
        }
    }

    constructor(value: GridSize = { width: 0, height: 0 }) {
        super();

        this._value = value;
    }

    private isInitialized = false;
    initElement(): void {
        if (!this.isInitialized) {
            this.classList.add("flex-rows", "center-content");

            this.cells = this.appendChild(
                ElementFactory.div(undefined, "cells", "flex-rows")
                    .children(
                        ...NumberUtil.range(1, GridSizeInput.MAX_SIZE.height, 1, true).map(y =>
                            ElementFactory.div(undefined, "row", "flex-columns")
                                .children(
                                    ...NumberUtil.range(1, GridSizeInput.MAX_SIZE.width, 1, true).map(x =>
                                        ElementFactory.div(undefined, "cell", "click-action")
                                            .attrs({ x, y })
                                            .on("mouseover", (_, self) => this.value = { width: x, height: y })
                                            .on("click", ev => {
                                                this.value = { width: x, height: y };
                                                this.dispatchEvent(new Event("input"));
                                            })
                                    )
                                )
                        )


                    )
                    .make()
            );

            this.valueDisplay = this.appendChild(
                ElementFactory.p("0 x 0")
                    .class("value-display", "no-margin")
                    .make()
            );

            this.isInitialized = true;
        }
    }

    connectedCallback() {
        this.initElement();
    }

}

customElements.define("grid-size-input", GridSizeInput);