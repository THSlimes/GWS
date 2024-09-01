import ElementFactory from "../html-element-factory/ElementFactory";
import ColorUtil from "../util/ColorUtil";
import { HasValue } from "../util/UtilTypes";

export default class ColorPicker extends HTMLElement implements HasValue<ColorUtil.HexColor> {

    private static readonly BASE_COLORS: ColorUtil.HexColor[] = ["#FF0000", "#FF8700", "#FFD300", "#DEFF0A", "#A1FF0A", "#0AFF99", "#0AEFFF", "#147DF5", "#580AFF", "#BE0AFF"];
    private static readonly BRIGHTNESS_MODIFIERS = [.25, .5, .75];

    get value(): `#${string}` {
        const selectedBulb = this.querySelector(".bulb[selected]");
        
        return selectedBulb instanceof HTMLElement ? selectedBulb.style.backgroundColor as ColorUtil.HexColor : "#";
    }
    set value(newVal: `#${string}`) {
        if (newVal !== this.value) {
            Array.from(this.querySelectorAll(".bulb")).forEach(b => {
                if (b instanceof HTMLElement) b.toggleAttribute("selected", b.getAttribute("value")?.toLowerCase() === newVal.toLowerCase());
            });

            this.dispatchEvent(new Event("input"));
            this.dispatchEvent(new Event("change"));
        }
    }

    constructor(value: ColorUtil.HexColor = "#000000") {
        super();

        this.initValue = value;
    }

    private readonly initValue: ColorUtil.HexColor;
    private isInitialized = false;
    connectedCallback() {
        if (!this.isInitialized) {
            this.classList.add("flex-columns");

            const bulbLine = ElementFactory.div(undefined, "bulb", "click-action")
                .attr("can-unselect")
                .on("click", (_, self) => {
                    if (!this.hasAttribute("disabled")) this.value = self.getAttribute("value") as ColorUtil.HexColor
                });

            this.append(
                ...ColorPicker.BASE_COLORS.map((baseColor, i) =>
                    ElementFactory.div(undefined, "flex-rows")
                        .children(
                            ...[
                                ColorUtil.mix("#000000", "#ffffff", i / (ColorPicker.BASE_COLORS.length - 1)),
                                ...ColorPicker.BRIGHTNESS_MODIFIERS.map(m => ColorUtil.mix(baseColor, "#ffffff", m)),
                                baseColor,
                                ...ColorPicker.BRIGHTNESS_MODIFIERS.toReversed().map(m => ColorUtil.mix(baseColor, "#000000", m)),
                            ]
                                .map(c => bulbLine.tooltip(c).attr("value", c).style({ backgroundColor: c }).make())
                        )
                        .make()
                )
            );

            this.value = this.initValue;
            this.isInitialized = true;
        }
    }

}

customElements.define("color-picker", ColorPicker);