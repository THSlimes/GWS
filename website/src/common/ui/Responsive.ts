export type Viewport = "desktop" | "tablet-portrait" | "mobile-portrait";


/**
 * The ```Responsive``` helper-class makes it easier to use responsive web-design.
 */
export default abstract class Responsive {

    /** Default value for is no media-queries match. */
    private static readonly DEFAULT:Viewport = "desktop";
    /** Priority-list of viewport-types and how to detect them. */
    private static MEDIA_QUERIES:[Viewport,MediaQueryList][] = [
        ["mobile-portrait", matchMedia("(max-aspect-ratio: 3 / 5)")],
        ["tablet-portrait", matchMedia("(max-aspect-ratio: 3 / 4)")],
    ];
    
    /** Checks whether the current viewport-type is still correct. */
    private static refresh() {
        const newViewport = this.MEDIA_QUERIES.find(([v,q]) => q.matches)?.[0] ?? this.DEFAULT;
        if (newViewport !== this._current) { // actually changed
            this._current = newViewport;
            this.changeHandlers.forEach(h => h(newViewport));
        }
    }
    private static _current:Viewport;
    /** The current type of viewport */
    public static get current():Viewport { return this._current; }
    /** Determines whether the current viewport-type matches any of the given options. */
    public static isAnyOf(...options:Viewport[]) { return options.includes(this._current); }

    private static readonly changeHandlers:((v:Viewport)=>void)[] = [];
    /** Attaches a new change-handler. (NOTE: does not replace already added ones) */
    public static set onChange(handler:(v:Viewport)=>void) { this.changeHandlers.push(handler); }

    static { // getting initial viewport
        if (matchMedia === undefined) this._current = "desktop";
        else {
            this.MEDIA_QUERIES.forEach(([viewport, query]) => query.onchange = () => this.refresh());
            this.refresh();
        }
    }

}