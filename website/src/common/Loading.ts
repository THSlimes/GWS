import ObjectUtil from "./util/ObjectUtil";
import { Class } from "./util/UtilTypes";

type ElementIDQuery = { [id:string]: Class<HTMLElement> };
type ResolvedElementIDQuery<Query extends ElementIDQuery> = {
    [ID in keyof Query]: InstanceType<Query[ID]>
};

export default abstract class Loading {

    private constructor() {} // prevent extension

    private static checkLoadedInterval:NodeJS.Timeout;
    private static loadingScreen:HTMLElement = document.createElement("div");
    static { // create loading animation overlay (optimized for speed)
        this.loadingScreen.id = "loading-screen";
        document.body.appendChild(this.loadingScreen);
        window.addEventListener("DOMContentLoaded", () => document.body.toggleAttribute("loading", true));

        for (const emoji of ['🐐', '🧶', '🧦']) {
            const p = document.createElement("p");
            p.textContent = emoji;
            this.loadingScreen.appendChild(p);
        }

        this.checkLoadedInterval = setInterval(() => { // periodically check if loaded
            if (this.numLoading === 0) { // loading finished
                document.body.removeAttribute("loading");
                const splitView = document.getElementById("split-view");
                if (splitView) splitView.style.opacity = '1';
                Array.from(document.getElementsByClassName("content")).forEach(c => {
                    if (c instanceof HTMLElement) c.style.opacity = '1';
                });
                this.loadingScreen.classList.add("fading");
                clearInterval(this.checkLoadedInterval);
            }
        }, 50);
    }

    private static currentlyLoading:object[] = [];
    public static get numLoading() { return this.currentlyLoading.length; }
    public static markLoadStart(obj:object) {
        this.currentlyLoading.push(obj);
    }
    public static markLoadEnd(obj:object) {
        const ind = this.currentlyLoading.lastIndexOf(obj);
        if (ind !== -1) this.currentlyLoading.splice(ind, 1);
    }

    private static DOMContentLoaded = false;
    static {
        this.markLoadStart(window);
        window.addEventListener("DOMContentLoaded", () => {
            this.DOMContentLoaded = true;
            this.markLoadEnd(window);
        });
    }

    private static getElementsById<Query extends ElementIDQuery>(query:Query):ResolvedElementIDQuery<Query> {
        const out:Record<string,Element> = {};
        for (const id in query) {
            const elem = document.getElementById(id);
            if (elem === null) throw new Error(`no element with id "${id}" found`);
            else if (!(elem instanceof query[id])) throw new Error(`element with id "${id}" exists, but is ${elem}, not ${query[id].name}`);
            out[id] = elem;
        }

        return out as ResolvedElementIDQuery<Query>;
    }
    public static onDOMContentLoaded<Query extends ElementIDQuery>(query:Query = {} as Query):Promise<ResolvedElementIDQuery<Query>> {
        return new Promise((resolve,reject) => {
            if (this.DOMContentLoaded) try { resolve(this.getElementsById(query)); }
                catch (err) { reject(err); }
            else window.addEventListener("DOMContentLoaded", () => {
                try { resolve(this.getElementsById(query)); }
                catch (err) { reject(err); }
            });
        });
    }

    public static useDynamicContent<T>(dynContentPromise:Promise<T>, loadCallback:(val:T)=>void) {
        this.markLoadStart(dynContentPromise);

        Promise.all([dynContentPromise, this.onDOMContentLoaded])
        .then(([val, _]) => {
            loadCallback(val);
            this.markLoadEnd(dynContentPromise);
        })
        .catch(console.error);
    }

}