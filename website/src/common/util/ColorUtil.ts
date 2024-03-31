import NumberUtil from "./NumberUtil";

/**
 * The ColorUtil helper-class provides standard functions to manipulate and process colors.
 */
abstract class ColorUtil {

    private static DEFAULT_COLOR:ColorUtil.HexColor = "#a8c9f5";
    private static STRING_COLORS:ColorUtil.HexColor[] = [
        "#FF0000",
        "#FF8700",
        "#FFD300",
        "#DEFF0A",
        "#A1FF0A",
        "#0AFF99",
        "#0AEFFF",
        "#147DF5",
        "#580AFF",
        "#BE0AFF"
    ];

    private static isHex(c:ColorUtil.Color): c is ColorUtil.HexColor {
        return typeof c === "string" && c.startsWith('#');
    }

    private static isRGB(c:ColorUtil.Color):c is ColorUtil.RGBColor {
        return Array.isArray(c) && c.length === 3 && c.every(p => 0 <= p && p <= 255);
    }

    private static isRGBString(c:ColorUtil.Color):c is ColorUtil.RGBString {
        return typeof c === "string"
            && c.startsWith("rgb(")
            && c.endsWith(')')
            && c.substring(4, c.length-1) // remove leading and trailing characters
                .split(", ") // split into parts
                .every((p,i,arr) => arr.length === 3 && NumberUtil.isInt(p) && NumberUtil.isBetween(Number.parseInt(p), 0, 255)); // check parts
    }

    /** Converts a color from hex format to RGB format. */
    public static toRGB(c:ColorUtil.Color):ColorUtil.RGBColor {
        if (this.isHex(c)) {
            const color = Number.parseInt(c.substring(1), 16);
            return [(color >> 16) & 0xFF, (color >> 8) & 0xFF, color & 0xFF];
        }
        else if (this.isRGBString(c)) {
            return c.substring(4, c.length-1).split(", ").map(p => Number.parseInt(p)) as ColorUtil.RGBColor;
        }
        else return c; // already RGB
    }
    
    /** Converts a color from RGB format to hex format. */
    public static toHex(c:ColorUtil.Color):ColorUtil.HexColor {
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
    public static getContrast(a:ColorUtil.Color, b:ColorUtil.Color):number {
        [a, b] = [this.toRGB(a), this.toRGB(b)];

        // scale according to RBG visibility
        a = [a[0]*.299, a[1]*.587, a[2]*.114];
        b = [b[0]*.299, b[1]*.587, b[2]*.114];

        return ((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2)**.5;
    }
    
    /**
     * Gives the color which is the most contrasting.
     * @param color color to compare to
     * @param options colors to pick from
     * @returns most contrasting color from ```options```
     */
    public static getMostContrasting(color:ColorUtil.Color, ...options:ColorUtil.Color[]):ColorUtil.HexColor {
        let bestInd = -1;
        let bestContrast = -Infinity;
    
        options.forEach((c,i) => {
            const contrast = this.getContrast(color, c);
    
            if (contrast > bestContrast) [bestInd, bestContrast] = [i, contrast];
        });
    
        return this.toHex(options[bestInd]);
    }

    public static mix(c1:ColorUtil.Color, c2:ColorUtil.Color, c1Ratio:number):ColorUtil.HexColor {
        c1 = this.toRGB(c1);
        c2 = this.toRGB(c2);
        c1Ratio = NumberUtil.clamp(c1Ratio, 0, 1);
        const c2Ratio = 1-c1Ratio;

        const mixed:ColorUtil.RGBColor = [
            Math.floor(c1[0]*c1Ratio + c2[0]*c2Ratio),
            Math.floor(c1[1]*c1Ratio + c2[1]*c2Ratio),
            Math.floor(c1[2]*c1Ratio + c2[2]*c2Ratio)
        ];
        
        return this.toHex(mixed);
    }

    public static getStringColor(cat: string):ColorUtil.HexColor {
        if (!cat) return this.DEFAULT_COLOR;
        cat = cat.toLowerCase();
    
        let ind = 0;
        for (let i = 0; i < cat.length; i++) ind = ((ind << 5) - ind) + cat.charCodeAt(i);
        
        return this.STRING_COLORS[Math.abs(ind) % this.STRING_COLORS.length];
    }

}

namespace ColorUtil {
    export type HexColor = `#${string}`;
    export type RGBColor = [number, number, number];
    export type RGBString = `rgb(${number}, ${number}, ${number})`;
    export type Color = HexColor | RGBColor | RGBString;
}

export default ColorUtil;