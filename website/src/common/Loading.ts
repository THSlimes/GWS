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
            if (this.numLoading === 0) {
                document.body.removeAttribute("loading");
                this.loadingScreen.classList.add("fading")
                clearInterval(this.checkLoadedInterval);
            }
        }, 25);
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
    public static onDOMContentLoaded() {
        return new Promise<void>(resolve => {
            if (this.DOMContentLoaded) resolve();
            else window.addEventListener("DOMContentLoaded", () => resolve());
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