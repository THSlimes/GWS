import { clamp } from "../NumberUtil";
import AssemblyLine, { AnchorElementAssemblyLine } from "./AssemblyLine";
import { ButtonLikeInputAssemblyLine, CheckableInputAssemblyLine, DateInputAssemblyLine, InputAssemblyLine, NumberInputAssemblyLine, RangedInputAssemblyLine, TextInputAssemblyLine } from "./InputAssemblyLine";

/**
 * The ElementFactory helper-class provides static methods that allow
 * for easier creation of HTMLElement objects.
 */
export default abstract class ElementFactory {

    public static header() { return new AssemblyLine("header"); }
    public static footer() { return new AssemblyLine("footer"); }

    public static div() { return new AssemblyLine("div"); }

    /** A heading with the given size. */
    public static heading(size:number, text?:string) {
        size = clamp(Math.floor(size), 1, 6);
        return this[`h${size as 1|2|3|4|5|6}`]();
    }

    public static h1(text?:string) {
        const out = new AssemblyLine("h1");
        return text ? out.text(text) : out;
    }
    public static h2(text?:string) {
        const out = new AssemblyLine("h2");
        return text ? out.text(text) : out;
    }
    public static h3(text?:string) {
        const out = new AssemblyLine("h3");
        return text ? out.text(text) : out;
    }
    public static h4(text?:string) {
        const out = new AssemblyLine("h4");
        return text ? out.text(text) : out;
    }
    public static h5(text?:string) {
        const out = new AssemblyLine("h5");
        return text ? out.text(text) : out;
    }
    public static h6(text?:string) {
        const out = new AssemblyLine("h6");
        return text ? out.text(text) : out;
    }

    public static p(text?:string) {
        const out = new AssemblyLine('p');
        return text ? out.text(text) : out;
    }
    public static span(text?:string) {
        const out = new AssemblyLine('span');
        return text ? out.text(text) : out;
    }
    public static a(href?:string, text?:string) {
        const out = new AnchorElementAssemblyLine();
        if (href) out.href(href);
        return text ? out.text(text) : out;
    }

    public static img(src?:string, alt?:string) {
        const out = AssemblyLine.specific("img", ["src","alt"])
        if (src) out.src(src);
        return alt ? out.alt(alt) : out;
    }
    
    /** Methods for specific input-types. */
    public static readonly input = {
        button(value?:string, onClick?:(val:string)=>void) {
            const out =  new ButtonLikeInputAssemblyLine("button");
            if (value !== undefined) out.value(value);
            return onClick ? out.onClick(onClick) : out;
        },
        checkbox() { return new CheckableInputAssemblyLine("checkbox"); },
        color() { return new InputAssemblyLine("color"); },
        localDatetime() { return new DateInputAssemblyLine("datetime-local"); },
        email() { return new TextInputAssemblyLine("email"); },
        file() { return new TextInputAssemblyLine("file"); },
        image() { return new InputAssemblyLine("image"); },
        month(year?:number, month?: number) {
            const out = new RangedInputAssemblyLine("month");
            if (year !== undefined && month !== undefined) out.value(year, month);
            else if (year !== undefined) out.value(year, new Date().getMonth());
            else if (month !== undefined) out.value(new Date().getFullYear(), month);
            return out;
        },
        number() { return new NumberInputAssemblyLine("number"); },
        password() { return new TextInputAssemblyLine("password"); },
        radio() { return new CheckableInputAssemblyLine("radio"); },
        range() { return new NumberInputAssemblyLine("range"); },
        reset() { return new ButtonLikeInputAssemblyLine("reset"); },
        search() { return new TextInputAssemblyLine("search"); },
        submit() { return new ButtonLikeInputAssemblyLine("submit"); },
        tel() { return new TextInputAssemblyLine("tel"); },
        text() { return new TextInputAssemblyLine("text"); },
        time() { return new RangedInputAssemblyLine("time"); },
        url() { return new TextInputAssemblyLine("url"); }
    };

    public static option() { return AssemblyLine.specific("option", ["value", "selected"]); }

    public static optgroup() { return AssemblyLine.specific("optgroup", ["label"]) }

    public static hr() { return new AssemblyLine("hr"); }
    public static br() { return new AssemblyLine("br"); }

}