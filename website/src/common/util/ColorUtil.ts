type HexColor = `#${string}`;
type RGBColor = [number, number, number];
type Color = HexColor | RGBColor;

function hexToRGB(hex:HexColor):RGBColor {
    const color = Number.parseInt(hex.substring(1), 16);
    return [(color >> 16) & 0xFF, (color >> 8) & 0xFF, color & 0xFF];
}

function rgbToHex([r,g,b]:RGBColor) {
    return `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`;
}

const DEFAULT_COLOR:HexColor = "#aaaaaa";
const STRING_COLORS:HexColor[] = [
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
export function getStringColor(cat: string):HexColor {
    if (!cat) return DEFAULT_COLOR;
    cat = cat.toLowerCase();

    let ind = 0;
    for (let i = 0; i < cat.length; i++) ind = ((ind << 5) - ind) + cat.charCodeAt(i);
    
    return STRING_COLORS[Math.abs(ind) % STRING_COLORS.length];
}

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

function getContrast(a:RGBColor, b:RGBColor, metric:(keyof typeof DISTANCE_METRICS)="euclidean") {
    return DISTANCE_METRICS[metric](a,b);
}

export function getMostContrasting(color:HexColor, ...others:HexColor[]):HexColor {
    const colorRGB = hexToRGB(color);

    let bestInd = -1;
    let bestContrast = -Infinity;

    others.forEach((c,i) => {
        const contrast = getContrast(colorRGB, hexToRGB(c), "euclidean");

        if (contrast > bestContrast) [bestInd, bestContrast] = [i, contrast];
    });

    return others[bestInd];
}