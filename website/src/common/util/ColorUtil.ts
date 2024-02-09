import NumberUtil from "./NumberUtil";

export type HexColor = `#${string}`;
export type RGBColor = [number, number, number];
export type RGBString = `rgb(${number}, ${number}, ${number})`;
export type Color = HexColor | RGBColor | RGBString;

/** Functions to compute different kinds of distance */
const DISTANCE_METRICS = {
    euclidean(a:number[], b:number[]) {
        const len = Math.max(a.length, b.length);
        let out = 0;
        for (let i = 0; i < len; i ++) out += ((a[i]??0) - (b[i]??0)) ** 2;
        return Math.sqrt(out);
    },
    manhattan(a:number[], b:number[]) {
        const len = Math.max(a.length, b.length);
        let out = 0;
        for (let i = 0; i < len; i ++) out += Math.abs((a[i]??0) - (b[i]??0));
        return out;
    }
};

/**
 * The ColorUtil helper-class provides standard functions to manipulate and process colors.
 */
export default abstract class ColorUtil {

    private static DEFAULT_COLOR:HexColor = "#aaaaaa";
    private static STRING_COLORS:HexColor[] = [
        "#ff8700", // orange
        "#580aff", // purple
        "#ff0000", // red
        "#deff0a", // yellow
        "#a1ff0a", // lime
        "#0aefff", // light blue
        "#147df5", // blue
        "#ffd300", // gold
        "#be0aff", // magenta
        "#0aff99", // mint
    ];

    private static isHex(c:Color): c is HexColor {
        return typeof c === "string" && c.startsWith('#');
    }

    private static isRGB(c:Color):c is RGBColor {
        return Array.isArray(c) && c.length === 3 && c.every(p => 0 <= p && p <= 255);
    }

    private static isRGBString(c:Color):c is RGBString {
        return typeof c === "string"
            && c.startsWith("rgb(")
            && c.endsWith(')')
            && c.substring(4, c.length-1) // remove leading and trailing characters
                .split(", ") // split into parts
                .every((p,i,arr) => arr.length === 3 && NumberUtil.isInt(p) && NumberUtil.isBetween(Number.parseInt(p), 0, 255)); // check parts
    }

    /** Converts a color from hex format to RGB format. */
    public static toRGB(c:Color):RGBColor {
        if (this.isHex(c)) {
            const color = Number.parseInt(c.substring(1), 16);
            return [(color >> 16) & 0xFF, (color >> 8) & 0xFF, color & 0xFF];
        }
        else if (this.isRGBString(c)) {
            return c.substring(4, c.length-1).split(", ").map(p => Number.parseInt(p)) as RGBColor;
        }
        else return c; // already RGB
    }
    
    /** Converts a color from RGB format to hex format. */
    public static toHex(c:Color):HexColor {
        if (this.isRGB(c)) {
            const [r,g,b] = c;
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }
        else if (this.isRGBString(c)) return this.toHex(this.toRGB(c));
        else return c; // already hex
    }

    /**
     * Computes the (non-normalized) contrast between two colors.
     * @param a first color
     * @param b second color
     * @param metric distance metric to use
     * @returns non-normalized contrast between ```a``` and ```b```
     */
    public static getContrast(a:Color, b:Color, metric:(keyof typeof DISTANCE_METRICS)="euclidean") {
        [a, b] = [this.toRGB(a), this.toRGB(b)];
        return DISTANCE_METRICS[metric](a,b);
    }
    
    /**
     * Gives the color which is the most contrasting.
     * @param color color to compare to
     * @param options colors to pick from
     * @returns most contrasting color from ```options```
     */
    public static getMostContrasting(color:Color, ...options:Color[]):HexColor {
        let bestInd = -1;
        let bestContrast = -Infinity;
    
        options.forEach((c,i) => {
            const contrast = this.getContrast(color, c, "euclidean");
    
            if (contrast > bestContrast) [bestInd, bestContrast] = [i, contrast];
        });
    
        return this.toHex(options[bestInd]);
    }

    public static mix(c1:Color, c2:Color, c1Ratio:number):HexColor {
        c1 = this.toRGB(c1);
        c2 = this.toRGB(c2);
        c1Ratio = NumberUtil.clamp(c1Ratio, 0, 1);
        const c2Ratio = 1-c1Ratio;

        const mixed:RGBColor = [
            Math.floor(c1[0]*c1Ratio + c2[0]*c2Ratio),
            Math.floor(c1[1]*c1Ratio + c2[1]*c2Ratio),
            Math.floor(c1[2]*c1Ratio + c2[2]*c2Ratio)
        ];
        
        return this.toHex(mixed);
    }

    public static getStringColor(cat: string):HexColor {
        if (!cat) return this.DEFAULT_COLOR;
        cat = cat.toLowerCase();
    
        let ind = 0;
        for (let i = 0; i < cat.length; i++) ind = ((ind << 5) - ind) + cat.charCodeAt(i);
        
        return this.STRING_COLORS[Math.abs(ind) % this.STRING_COLORS.length];
    }

}