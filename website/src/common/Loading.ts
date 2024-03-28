import { Class } from "./util/UtilTypes";

function shuffle<T>(arr:T[]):T[] { return arr.sort(() => Math.random() - .5); }
function pick<T>(...arr:T[]):T { return arr[Math.floor(Math.random() * arr.length)]; }

export default abstract class Loading {

    private static readonly EMOJI_CONFIG:[[number,number], () => string[]][] = [
        [[1, 1], () => { // new years
            const numbers = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
            const indices = new Date().getFullYear().toString().split("").map(n => Number.parseInt(n));
            return ['🎉', ...indices.map(i => numbers[i]), '🎉'];
        }],
        [[2, 5], () => shuffle(['🥳', '🎂', '🍰', '🎈', '🎉', '🎊', '🪅']).slice(0,3)], // anniversary
        [[2, 14], pick( // valentines day
            () => pick(
                [pick('👨🏻', '👨🏼', '👨🏽', '👨🏾', '👨🏿'), '❤️', pick('👨🏻', '👨🏼', '👨🏽', '👨🏾', '👨🏿')],
                [pick('👨🏻', '👨🏼', '👨🏽', '👨🏾', '👨🏿'), '❤️', pick('👩🏻', '👩🏼', '👩🏽', '👩🏾', '👩🏿')],
                [pick('👩🏻', '👩🏼', '👩🏽', '👩🏾', '👩🏿'), '❤️', pick('👨🏻', '👨🏼', '👨🏽', '👨🏾', '👨🏿')],
                [pick('👩🏻', '👩🏼', '👩🏽', '👩🏾', '👩🏿'), '❤️', pick('👩🏻', '👩🏼', '👩🏽', '👩🏾', '👩🏿')]
            ),
            () => ['❤️‍🔥', '❤️‍🔥', '❤️‍🔥'],
            () => ['🥰', '😍', '😘'],
            () => ['🐐', '🫶', '🐐'],
        )],
        [[4, 1], () => Math.random() <= .1 ? ['🤡', '🤡', '🤡'] : this.DEFAULT_EMOJIS()], // april fools
        [[6, 28], pick( // pride day
            () => ['🏳️‍🌈', '🌈', '🏳️‍🌈'],
            () => ['❤️', '🧡', '💛', '💚', '💙', '💜'],
            () => pick(
                ['🩵', '🩷', '🤍', '🩷', '🩵'],
                ['💛', '🤍', '💜', '🖤'],
                ['🖤', '🩶', '🤍', '💜'],
                ['🩷', '💜', '💙'],
                ['🩷', '💛', '🩵'],
                ['🧡', '🤍', '🩷'],
                ['💚', '🤍', '🩷'],
                ['💚', '🤍', '💙'],
            ),
            () => pick(
                [pick('👨🏻', '👨🏼', '👨🏽', '👨🏾', '👨🏿'), '❤️', pick('👨🏻', '👨🏼', '👨🏽', '👨🏾', '👨🏿')],
                [pick('👩🏻', '👩🏼', '👩🏽', '👩🏾', '👩🏿'), '❤️', pick('👩🏻', '👩🏼', '👩🏽', '👩🏾', '👩🏿')]
            )
        )],
        [[12, 5], pick( // sinterklaas
            () => ['🐎', '🏘️', '🎁'],
            () => ['🛥️', '🎁', '🧸']
        )],
        [[12, 25], pick( // Christmas
            () => ['🎁', '🎄', '🎁'],
            () => shuffle(['❄️', '☃️', '🫎']),
            () => ['🎅', '🎄', '🤶'],
            () => ['🧦', '🌟', '🧦']
        )],
        [[12, 31], pick( // new years eve
            () => ['🎆', '🎇', '🎆'],
            () => ['🎇', '🎆', '🎇'],
            () => ['🕛', '🍾', '🥂'],
            () => ['🎊', '📆', '🎊'],
            () => ['🌉', '🎆', '🌉']
        )]
    ];
    private static readonly DEFAULT_EMOJIS:(() => string[]) = () => ['🐐', '🧶', '🧦'];

    private constructor() {} // prevent extension

    private static checkLoadedInterval:NodeJS.Timeout;
    private static loadingScreen:HTMLElement = document.createElement("div");
    static { // create loading animation overlay (optimized for speed)
        this.loadingScreen.id = "loading-screen";
        document.body.appendChild(this.loadingScreen);
        window.addEventListener("DOMContentLoaded", () => document.body.toggleAttribute("loading", true));

        const now = new Date();
        const [month, day] = [now.getMonth() + 1, now.getDate()];
        const emojiGen = this.EMOJI_CONFIG.find(emc => emc[0][0] === month && emc[0][1] === day)?.[1] ?? this.DEFAULT_EMOJIS
        for (const emoji of emojiGen()) {
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

    public static getElementsById<Query extends Loading.IDQuery>(query:Query):Loading.ResolvedIDQuery<Query> {
        const out:Record<string,Element> = {};
        for (const id in query) {
            const elem = document.getElementById(id);
            if (elem === null) throw new Error(`no element with id "${id}" found`);
            else if (!(elem instanceof query[id])) throw new Error(`element with id "${id}" exists, but is ${elem}, not ${query[id].name}`);
            out[id] = elem;
        }

        return out as Loading.ResolvedIDQuery<Query>;
    }
    public static onDOMContentLoaded<Query extends Loading.IDQuery>(query:Query = {} as Query):Promise<Loading.ResolvedIDQuery<Query>> {
        return new Promise((resolve,reject) => {
            if (this.DOMContentLoaded) try { resolve(this.getElementsById(query)); }
                catch (err) { reject(err); }
            else window.addEventListener("DOMContentLoaded", () => {
                try { resolve(this.getElementsById(query)); }
                catch (err) { reject(err); }
            });
        });
    }

    public static useDynamicContent<T>(dynContentPromise:Promise<T>, loadCallback:(val:T)=>void, onFail=(err:any)=>console.error(err)) {
        this.markLoadStart(dynContentPromise);

        Promise.all([dynContentPromise, this.onDOMContentLoaded])
        .then(([val, _]) => {
            loadCallback(val);
            this.markLoadEnd(dynContentPromise);
        })
        .catch(err => onFail(err));
    }

}

namespace Loading {
    export type IDQuery = { [id:string]: Class<HTMLElement> };
    export type ResolvedIDQuery<Query extends IDQuery> = {
        [ID in keyof Query]: InstanceType<Query[ID]>
    };
}