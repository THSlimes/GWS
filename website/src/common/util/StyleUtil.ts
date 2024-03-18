abstract class StyleUtil {

    private static toKebabCase(propName:string):string {
        let out = "";
        for (let i = 0; i < propName.length; i ++) {
            const c = propName[i];
            if (c === c.toUpperCase()) out += '-' + c.toLowerCase();
            else out += c;
        }

        return out;
    }

    public static apply<E extends HTMLElement>(styleMap:StyleUtil.StyleMap, elem:E):E {
        for (const k in styleMap) {
            const v = styleMap[k]!;
            elem.style.setProperty(this.toKebabCase(k), v);
        }

        return elem;
    }

}

namespace StyleUtil {
    export type StyleMap = {
        [PN in Exclude<keyof CSSStyleDeclaration, "length"|"parentRule">]?: Extract<CSSStyleDeclaration[PN], string>;
    };
}

export default StyleUtil;