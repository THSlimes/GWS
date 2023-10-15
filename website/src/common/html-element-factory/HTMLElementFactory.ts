import AssemblyLine, { AnchorElementAssemblyLine, ButtonLikeInputAssemblyLine, CheckableInputAssemblyLine, DateInputAssemblyLine, InputAssemblyLine, NumberInputAssemblyLine, RangedInputAssemblyLine, TextInputAssemblyLine } from "./AssemblyLine";

function clamp(n:number, lower=-Infinity, upper=Infinity) {
    return Math.max(lower, Math.min(upper, n));
}

export default abstract class ElementFactory {

    public static header() { return new AssemblyLine("header"); }

    public static div() { return new AssemblyLine("div"); }

    public static heading(size:number) {
        size = clamp(Math.floor(size), 1, 6);
        return this[`h${size as 1|2|3|4|5|6}`]();
    }

    public static h1() { return new AssemblyLine("h1"); }
    public static h2() { return new AssemblyLine("h2"); }
    public static h3() { return new AssemblyLine("h3"); }
    public static h4() { return new AssemblyLine("h4"); }
    public static h5() { return new AssemblyLine("h5"); }
    public static h6() { return new AssemblyLine("h6"); }

    public static p() { return new AssemblyLine('p'); }
    public static span() { return new AssemblyLine('span'); }
    public static a() { return new AnchorElementAssemblyLine(); }
    
    public static readonly input = {
        button() { return new ButtonLikeInputAssemblyLine("button"); },
        checkbox() { return new CheckableInputAssemblyLine("checkbox"); },
        color() { return new InputAssemblyLine("color"); },
        localDatetime() { return new DateInputAssemblyLine("datetime-local"); },
        email() { return new TextInputAssemblyLine("email"); },
        file() { return new TextInputAssemblyLine("file"); },
        image() { return new InputAssemblyLine("image"); },
        month() { return new RangedInputAssemblyLine("month"); },
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