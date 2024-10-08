import NumberUtil from "../util/NumberUtil";
import AssemblyLine, { AnchorElementAssemblyLine, RichTextInputAssemblyLine, SelectAssemblyLine } from "./AssemblyLine";
import FolderElementAssemblyLine from "./FolderElementAssemblyLine";
import { ButtonLikeInputAssemblyLine, CheckableInputAssemblyLine, DateInputAssemblyLine, InputAssemblyLine, NumberInputAssemblyLine, RangedInputAssemblyLine, TextInputAssemblyLine } from "./InputAssemblyLine";
import RichTextSerializer from "../custom-elements/rich-text/RichTextSerializer";
import FolderElement from "../custom-elements/FolderElement";
import ColorUtil from "../util/ColorUtil";
import IconSelectorAssemblyLine from "./IconSelectorAssemblyLine";
import SwitchAssemblyLine from "./SwitchAssemblyLine";
import { ToStringable } from "../util/UtilTypes";
import ColorPickerAssemblyLine from "./ColorPickerAssemblyLine";
import GridSizeInputAssemblyLine from "./GridSizeInputAssemblyLine";
import PasswordInput from "../custom-elements/PasswordInput";
import PasswordInputAssemblyLine from "./PasswordInputAssemblyLine";

/**
 * The ElementFactory helper-class provides static methods that allow
 * for easier creation of HTMLElement objects.
 */
export default abstract class ElementFactory {

    public static header() { return new AssemblyLine("header"); }
    public static footer() { return new AssemblyLine("footer"); }

    public static div(id?: string, ...classes: (string | null | false)[]) {
        const out = new AssemblyLine("div");
        if (typeof id === "string") out.id(id);
        out.class(...classes);
        return out;
    }

    /** A heading with the given size. */
    public static heading(size: number, text?: string) {
        size = NumberUtil.clamp(Math.floor(size), 1, 6);
        const out = this[`h${size as 1 | 2 | 3 | 4 | 5 | 6}`]();
        if (text) out.text(text);
        return out;
    }

    public static h1(text?: string) {
        const out = new AssemblyLine("h1");
        return text ? out.text(text) : out;
    }
    public static h2(text?: string) {
        const out = new AssemblyLine("h2");
        return text ? out.text(text) : out;
    }
    public static h3(text?: string) {
        const out = new AssemblyLine("h3");
        return text ? out.text(text) : out;
    }
    public static h4(text?: string) {
        const out = new AssemblyLine("h4");
        return text ? out.text(text) : out;
    }
    public static h5(text?: string) {
        const out = new AssemblyLine("h5");
        return text ? out.text(text) : out;
    }
    public static h6(text?: string) {
        const out = new AssemblyLine("h6");
        return text ? out.text(text) : out;
    }

    public static p(text?: ToStringable) {
        const out = new AssemblyLine('p');
        return text === undefined ? out : out.text(text.toString());
    }
    public static richText(richText: string) {
        return ElementFactory.div().class("rich-text").children(...RichTextSerializer.deserialize(richText));
    }
    public static text(text?: string) {
        return document.createTextNode(text ?? "");
    }
    public static span(text?: string, ...classes: (string | null | false)[]) {
        const out = new AssemblyLine('span')
            .class(...classes);
        return text ? out.text(text) : out;
    }
    public static a(href?: string, text?: string) {
        const out = new AnchorElementAssemblyLine();
        out.onMake(self => {
            self.addEventListener("click", () => {
                if (self.href && !self.hasAttribute("download")) {
                    if (self.target === "_blank") open(self.href);
                    else location.href = self.href;
                }
            });
        });
        if (href) out.href(href);
        return text ? out.text(text) : out;
    }

    public static img(src?: string, alt?: string) {
        const out = AssemblyLine.specific("img", ["src", "alt"], () => document.createElement("img"))
        if (src) out.src(src);
        return alt ? out.alt(alt) : out;
    }

    /** Methods for specific input-types. */
    public static readonly input = {
        button(value?: string, onClick?: (val: string) => void) {
            const out = new ButtonLikeInputAssemblyLine("button");
            if (value !== undefined) out.value(value);
            return onClick ? out.onClick(onClick) : out;
        },
        checkbox() { return new CheckableInputAssemblyLine("checkbox"); },
        color(value?: ColorUtil.HexColor) {
            const out = new InputAssemblyLine("color");
            if (value) out.value(value);
            return out;
        },
        date(val?: Date, min?: Date, max?: Date, step?: number) {
            const out = new DateInputAssemblyLine("date");
            if (val) out.value(val.getFullYear(), val.getMonth(), val.getDate());
            if (min) out.min(min.getFullYear(), min.getMonth(), min.getDate());
            if (max) out.max(max.getFullYear(), max.getMonth(), max.getDate());
            if (typeof step === "number") out.step(step);
            return out;
        },
        dateTimeLocal(value?: Date, min?: Date, max?: Date, step?: number) {
            const out = new DateInputAssemblyLine("datetime-local");
            if (value instanceof Date) out.value(value);
            if (min instanceof Date) out.min(min);
            if (max instanceof Date) out.max(max);
            if (typeof step === "number") out.step(step);
            return out;
        },
        email() { return new TextInputAssemblyLine("email"); },
        file() { return new TextInputAssemblyLine("file"); },
        image() { return new InputAssemblyLine("image"); },
        month(year?: number, month?: number) {
            const out = new DateInputAssemblyLine("month");
            if (year !== undefined && month !== undefined) out.value(year, month);
            else if (year !== undefined) out.value(year, new Date().getMonth());
            else if (month !== undefined) out.value(new Date().getFullYear(), month);
            return out;
        },
        number(value?: number, min?: number, max?: number, step?: number) {
            const out = new NumberInputAssemblyLine("number");
            if (typeof value === "number") out.value(value);
            if (typeof min === "number") out.min(min);
            if (typeof max === "number") out.max(max);
            if (typeof step === "number") out.step(step);
            return out;
        },
        password() { return new TextInputAssemblyLine("password"); },
        radio() { return new CheckableInputAssemblyLine("radio"); },
        range(value?: number, min?: number, max?: number, step?: number) {
            const out = new NumberInputAssemblyLine("range");
            if (typeof value === "number") out.value(value);
            else if (typeof min === "number") out.value(min);
            if (typeof min === "number") out.min(min);
            if (typeof max === "number") out.max(max);
            if (typeof step === "number") out.step(step);
            return out;
        },
        reset() { return new ButtonLikeInputAssemblyLine("reset"); },
        search() { return new TextInputAssemblyLine("search"); },
        submit() { return new ButtonLikeInputAssemblyLine("submit"); },
        switch(initial?: boolean, dependants?: string | Element | (string | Element)[], inverted?: boolean) {
            return new SwitchAssemblyLine(initial, dependants, inverted);
        },
        tel() { return new TextInputAssemblyLine("tel"); },
        text(val?: string) {
            const out = new TextInputAssemblyLine("text");
            if (val) out.value(val);
            return out;
        },
        time() { return new RangedInputAssemblyLine("time"); },
        url(value?: string) {
            const out = new TextInputAssemblyLine("url");
            if (value) out.value(value);
            return out;
        },
        week(year?: number, week?: number) {
            const out = new DateInputAssemblyLine("week");
            if (year !== undefined && week !== undefined) out.value(year, week);
            else if (year !== undefined) out.value(year, 1);
            else if (week !== undefined) out.value(new Date().getFullYear(), week);
            return out;
        },
        richText(val?: string, compact?: boolean) {
            const out = new RichTextInputAssemblyLine();
            if (val) out.value(val);
            if (compact !== undefined) out.compact(compact);
            return out;
        },
        gridSize() {
            return new GridSizeInputAssemblyLine();
        }
    };

    public static form() {
        return AssemblyLine.specific("form", [], () => document.createElement("form"));
    }

    public static passwordInput(type?: PasswordInput.Type, name?: string) {
        const out = new PasswordInputAssemblyLine();
        if (type) out.type(type);
        if (name) out.name(name);
        return out;
    }

    public static label(text?: string, forName?: string) {
        const out = AssemblyLine.specific("label", ["htmlFor"], () => document.createElement("label"));
        if (text) out.text(text);
        if (forName) out.htmlFor(forName);
        return out;
    }

    public static button(onClick?: (e: MouseEvent, self: HTMLButtonElement) => void) {
        const out = new AssemblyLine("button");
        if (onClick) out.on("click", onClick);
        return out;
    }

    /** Creates a button based on an icon. */
    public static iconButton(icon: string, onClick: (ev: MouseEvent, button: HTMLParagraphElement) => void, tooltip?: string) {
        return ElementFactory.p(icon)
            .class("icon", "icon-button", "click-action", "no-margin")
            .tooltip(tooltip ? tooltip : null)
            .noFocus()
            .on("click", (ev, self) => {
                if (!self.hasAttribute("disabled")) onClick(ev, self);
            })
    }

    public static textarea(text?: string) {
        const out = AssemblyLine.specific("textarea", ["value", "placeholder", "minLength", "maxLength", "readOnly", "spellcheck", "rows", "cols"], () => document.createElement("textarea"));
        if (text) out.value(text);
        return out;
    }

    public static select<V extends string>(options: V[] | Record<V, string | [string, boolean]> = []) {
        const out = new SelectAssemblyLine<V>();
        return out.options(options);
    }
    public static option(value?: string, selected?: boolean, hidden?: boolean) {
        const out = AssemblyLine.specific("option", ["value", "selected", "hidden"], () => document.createElement("option"));
        if (value !== undefined) out.value(value);
        if (selected !== undefined) out.selected(selected);
        if (hidden !== undefined) out.hidden(hidden);
        return out;
    }
    public static optgroup(label?: string) {
        const out = AssemblyLine.specific("optgroup", ["label"], () => document.createElement("optgroup"));
        if (label !== undefined) out.label(label);
        return out;
    }

    public static iconSelector<V extends string>(...options: [V, string, string?, boolean?][]) {
        const out = new IconSelectorAssemblyLine<V>();
        out.options(...options);
        return out;
    }

    public static hr() { return new AssemblyLine("hr"); }
    public static br() { return new AssemblyLine("br"); }

    public static ul() {
        return AssemblyLine.specific("ul", [], () => document.createElement("ul"));
    }

    public static ol() {
        return AssemblyLine.specific("ol", [], () => document.createElement("ol"));
    }

    public static li(text?: string) {
        const out = AssemblyLine.specific("li", [], () => document.createElement("li"));
        if (text) out.text(text);
        return out;
    }

    public static table(width: number, height: number) {
        return AssemblyLine.specific("table", [], () => document.createElement("table"))
            .children(
                AssemblyLine.specific("tbody", [], () => document.createElement("tbody"))
                    .children(
                        ...NumberUtil.range(0, height).map(() =>
                            AssemblyLine.specific("tr", [], () => document.createElement("tr"))
                                .children(...NumberUtil.range(0, width).map(() => document.createElement("td")))
                        )

                    ),
            );
    }

    // custom elements

    public static folderElement(foldDir?: FolderElement.Direction, closingDelay?: number, hideArrow?: boolean) {
        const out = new FolderElementAssemblyLine();
        if (foldDir) out.foldDir(foldDir);
        if (typeof closingDelay === "number") out.closingDelay(closingDelay);
        if (hideArrow) out.hideArrow(hideArrow);
        return out;
    }

    public static colorPicker(value?: ColorUtil.HexColor) {
        const out = new ColorPickerAssemblyLine();

        if (value) out.value(value);

        return out;
    }

}