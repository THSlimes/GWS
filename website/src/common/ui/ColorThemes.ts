// export enum ColorTheme {
//     LIGHT = "light",
//     DARK = "dark"
// }

// export default abstract class ColorThemes {

//     private static readonly THEMES:Record<ColorTheme, Record<string, string>> = {
//         [ColorTheme.LIGHT]: {
//             "--lightest": "white",
//             "--darkest": "black",
//             "--dark": "#111111",
//             "--text": "rgb(35, 52, 82)",
//             "--accent": "#d65050",
//             "--shadow": "rgba(0, 0 , 0, .125)"
//         },
//         [ColorTheme.DARK]: {
//             "--lightest": "#111111",
//             "--darkest": "white",
//             "--dark": "#eeeeee",
//             "--text": "rgb(220, 203, 173)",
//             "--accent": "#d65050",
//             "--shadow": "rgba(255, 255 , 255, .125)",
//         }
//     };
//     static { Object.freeze(this.THEMES); }

//     private static _theme:ColorTheme;
//     public static get theme() { return this._theme; }
//     public static set theme(newTheme:ColorTheme) {
//         if (this._theme !== newTheme) {
//             const theme = this.THEMES[newTheme];
//             for (let n in theme) document.body.style.setProperty(n, theme[n]);
    
//             this._theme = newTheme;
//             localStorage.setItem("theme", newTheme);
            
//         }
//     }
//     public static cycle():ColorTheme {
//         const themeNames = Object.keys(this.THEMES);
//         const nextTheme = themeNames[(themeNames.indexOf(this._theme) + 1) % themeNames.length];
//         return this.theme = nextTheme as ColorTheme;
//     }

//     static { // apply while loading
//         let stored = localStorage.getItem("theme");
//         stored ??= (matchMedia && matchMedia("(prefers-color-scheme: dark)").matches) ? ColorTheme.DARK : ColorTheme.LIGHT;
                
//         this.theme = Object.values(ColorTheme).includes(stored as any) ? stored as ColorTheme : ColorTheme.LIGHT;
//     }
// }