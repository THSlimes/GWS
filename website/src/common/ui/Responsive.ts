import ObjectUtil from "../util/ObjectUtil";

/**
 * The `Responsive` namespace includes functionality that makes it easier to apply responsive web-design.
 */
export namespace Responsive {
    export enum Viewport {
        DESKTOP,
        DESKTOP_SLIM,
        SQUARE,
        TABLET_PORTRAIT,
        MOBILE_PORTRAIT,
        VERY_THIN
    }
    /** Viewport chosen when media queries are unavailable. */
    const DEFAULT_VIEWPORT:Viewport = Viewport.DESKTOP;

    interface Ratio { width:number, height:number };
    /** Viewport aspect ratios from largest to smallest */
    const VIEWPORT_RATIO:Record<Viewport,Ratio> = {
        [Viewport.DESKTOP]: { width: 16, height: 9},
        [Viewport.DESKTOP_SLIM]: { width: 4, height: 3 },
        [Viewport.SQUARE]: { width: 1, height: 1 },
        [Viewport.TABLET_PORTRAIT]: { width: 3, height: 4 },
        [Viewport.MOBILE_PORTRAIT]: { width: 10, height: 16 },
        [Viewport.VERY_THIN]: { width: 1, height: 2 }
    }

    const MEDIA_QUERIES:[Viewport,MediaQueryList][] = ObjectUtil.mapToArray(VIEWPORT_RATIO, (vp, r) => [vp, matchMedia(`(max-aspect-ratio: ${r.width} / ${r.height})`)]);

    let currentViewport:Viewport;
    export function getCurrent() { return currentViewport; }
    function refreshCurrent() {
        const newViewport = matchMedia !== undefined ? MEDIA_QUERIES.findLast(([vp, query]) => query.matches)?.[0] ?? DEFAULT_VIEWPORT : DEFAULT_VIEWPORT;
        if (newViewport !== currentViewport) {
            console.log(`viewport change`, currentViewport, "-->", newViewport);
            const prevViewport = currentViewport;
            currentViewport = newViewport;
            changeHandlers.forEach(handler => handler(newViewport, prevViewport));
            
        }
    }

    type ViewportChangeCallback = (vp:Viewport, prev:Viewport) => void;
    const changeHandlers:ViewportChangeCallback[] = [];
    export function onChange(newCallback:ViewportChangeCallback, callWithCurrent=false):void {
        changeHandlers.push(newCallback);
        if (callWithCurrent) newCallback(currentViewport, currentViewport);
    }
    
    /** Whether the current Viewport is any of the given options. */
    export function is(viewport:Viewport):boolean { return viewport === currentViewport; }
    /** Whether current Viewport matches any of the given ones. */
    export function isAnyOf(...options:Viewport[]):boolean { return options.includes(currentViewport); }
    /** Whether the current Viewport is wider than the given one. */
    export function isWiderThan(viewport:Viewport):boolean { return viewport > currentViewport; }
    /** Whether the current Viewport is wider than or equally as wide as the given one. */
    export function isWiderOrEq(viewport:Viewport):boolean { return viewport >= currentViewport; }
    /** Whether the current Viewport is slimmer than the given one. */
    export function isSlimmerThan(viewport:Viewport):boolean { return viewport < currentViewport; }
    /** Whether the current Viewport is slimmer than or equally as slim as the given one. */
    export function isSlimmerOrEq(viewport:Viewport):boolean { return viewport <= currentViewport; }

    // initialization
    refreshCurrent();
    window.addEventListener("resize", () => refreshCurrent());
}

export default Responsive;
