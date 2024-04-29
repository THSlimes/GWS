import { Class } from "./util/UtilTypes";

const LOADING_SCREEN_STYLE = `@font-face{font-family:"Noto Color Emoji";font-style:normal;font-weight:400;font-display:swap;src:url("../fonts/emojis/Yq6P-KqIXTD0t4D9z1ESnKM3-HpFabsE4tq3luCC7p-aXxcn.0.woff2") format("woff2");unicode-range:U+1f1e6-1f1ff}@font-face{font-family:"Noto Color Emoji";font-style:normal;font-weight:400;font-display:swap;src:url("../fonts/emojis/Yq6P-KqIXTD0t4D9z1ESnKM3-HpFabsE4tq3luCC7p-aXxcn.1.woff2") format("woff2");unicode-range:U+200d,U+2620,U+26a7,U+fe0f,U+1f308,U+1f38c,U+1f3c1,U+1f3f3-1f3f4,U+1f6a9,U+e0062-e0063,U+e0065,U+e0067,U+e006c,U+e006e,U+e0073-e0074,U+e0077,U+e007f}@font-face{font-family:"Noto Color Emoji";font-style:normal;font-weight:400;font-display:swap;src:url("../fonts/emojis/Yq6P-KqIXTD0t4D9z1ESnKM3-HpFabsE4tq3luCC7p-aXxcn.2.woff2") format("woff2");unicode-range:U+23,U+2a,U+30-39,U+a9,U+ae,U+200d,U+203c,U+2049,U+20e3,U+2122,U+2139,U+2194-2199,U+21a9-21aa,U+23cf,U+23e9-23ef,U+23f8-23fa,U+24c2,U+25aa-25ab,U+25b6,U+25c0,U+25fb-25fe,U+2611,U+2622-2623,U+2626,U+262a,U+262e-262f,U+2638,U+2640,U+2642,U+2648-2653,U+2660,U+2663,U+2665-2666,U+2668,U+267b,U+267e-267f,U+2695,U+269b-269c,U+26a0,U+26a7,U+26aa-26ab,U+26ce,U+26d4,U+2705,U+2714,U+2716,U+271d,U+2721,U+2733-2734,U+2747,U+274c,U+274e,U+2753-2755,U+2757,U+2764,U+2795-2797,U+27a1,U+27b0,U+27bf,U+2934-2935,U+2b05-2b07,U+2b1b-2b1c,U+2b55,U+3030,U+303d,U+3297,U+3299,U+fe0f,U+1f170-1f171,U+1f17e-1f17f,U+1f18e,U+1f191-1f19a,U+1f201-1f202,U+1f21a,U+1f22f,U+1f232-1f23a,U+1f250-1f251,U+1f310,U+1f3a6,U+1f3b5-1f3b6,U+1f3bc,U+1f3e7,U+1f441,U+1f499-1f49c,U+1f49f-1f4a0,U+1f4a2,U+1f4ac-1f4ad,U+1f4b1-1f4b2,U+1f4b9,U+1f4db,U+1f4f2-1f4f6,U+1f500-1f50a,U+1f515,U+1f518-1f524,U+1f52f-1f53d,U+1f549,U+1f54e,U+1f5a4,U+1f5e8,U+1f5ef,U+1f6ab,U+1f6ad-1f6b1,U+1f6b3,U+1f6b7-1f6bc,U+1f6be,U+1f6c2-1f6c5,U+1f6d0-1f6d1,U+1f6d7,U+1f6dc,U+1f7e0-1f7eb,U+1f7f0,U+1f90d-1f90e,U+1f9e1,U+1fa75-1fa77,U+1faaf}@font-face{font-family:"Noto Color Emoji";font-style:normal;font-weight:400;font-display:swap;src:url("../fonts/emojis/Yq6P-KqIXTD0t4D9z1ESnKM3-HpFabsE4tq3luCC7p-aXxcn.3.woff2") format("woff2");unicode-range:U+231a-231b,U+2328,U+23f0-23f3,U+2602,U+260e,U+2692,U+2694,U+2696-2697,U+2699,U+26b0-26b1,U+26cf,U+26d1,U+26d3,U+2702,U+2709,U+270f,U+2712,U+fe0f,U+1f302,U+1f321,U+1f392-1f393,U+1f3a9,U+1f3bd,U+1f3ee,U+1f3f7,U+1f3fa,U+1f451-1f462,U+1f484,U+1f489-1f48a,U+1f48c-1f48e,U+1f4a1,U+1f4a3,U+1f4b0,U+1f4b3-1f4b8,U+1f4bb-1f4da,U+1f4dc-1f4f1,U+1f4ff,U+1f50b-1f514,U+1f516-1f517,U+1f526-1f529,U+1f52c-1f52e,U+1f550-1f567,U+1f56f-1f570,U+1f576,U+1f587,U+1f58a-1f58d,U+1f5a5,U+1f5a8,U+1f5b1-1f5b2,U+1f5c2-1f5c4,U+1f5d1-1f5d3,U+1f5dc-1f5de,U+1f5e1,U+1f5f3,U+1f6aa,U+1f6ac,U+1f6bd,U+1f6bf,U+1f6c1,U+1f6cb,U+1f6cd-1f6cf,U+1f6d2,U+1f6e0-1f6e1,U+1f6f0,U+1f97b-1f97f,U+1f9af,U+1f9ba,U+1f9e2-1f9e6,U+1f9ea-1f9ec,U+1f9ee-1f9f4,U+1f9f7-1f9ff,U+1fa71-1fa74,U+1fa79-1fa7b,U+1fa86,U+1fa91-1fa93,U+1fa96,U+1fa99-1faa0,U+1faa2-1faa7,U+1faaa-1faae}@font-face{font-family:"Noto Color Emoji";font-style:normal;font-weight:400;font-display:swap;src:url("../fonts/emojis/Yq6P-KqIXTD0t4D9z1ESnKM3-HpFabsE4tq3luCC7p-aXxcn.4.woff2") format("woff2");unicode-range:U+265f,U+26bd-26be,U+26f3,U+26f8,U+fe0f,U+1f004,U+1f0cf,U+1f380-1f384,U+1f386-1f38b,U+1f38d-1f391,U+1f396-1f397,U+1f399-1f39b,U+1f39e-1f39f,U+1f3a3-1f3a5,U+1f3a7-1f3a9,U+1f3ab-1f3b4,U+1f3b7-1f3bb,U+1f3bd-1f3c0,U+1f3c5-1f3c6,U+1f3c8-1f3c9,U+1f3cf-1f3d3,U+1f3f8-1f3f9,U+1f47e,U+1f4e2,U+1f4f7-1f4fd,U+1f52b,U+1f579,U+1f58c-1f58d,U+1f5bc,U+1f6f7,U+1f6f9,U+1f6fc,U+1f93f,U+1f941,U+1f945,U+1f947-1f94f,U+1f9e7-1f9e9,U+1f9f5-1f9f6,U+1fa70-1fa71,U+1fa80-1fa81,U+1fa83-1fa85,U+1fa87-1fa88,U+1fa94-1fa95,U+1fa97-1fa98,U+1faa1,U+1faa9}@font-face{font-family:"Noto Color Emoji";font-style:normal;font-weight:400;font-display:swap;src:url("../fonts/emojis/Yq6P-KqIXTD0t4D9z1ESnKM3-HpFabsE4tq3luCC7p-aXxcn.5.woff2") format("woff2");unicode-range:U+2693,U+26e9-26ea,U+26f1-26f2,U+26f4-26f5,U+26fa,U+26fd,U+2708,U+fe0f,U+1f301,U+1f303,U+1f306-1f307,U+1f309,U+1f310,U+1f3a0-1f3a2,U+1f3aa,U+1f3cd-1f3ce,U+1f3d5,U+1f3d7-1f3db,U+1f3df-1f3e6,U+1f3e8-1f3ed,U+1f3ef-1f3f0,U+1f488,U+1f492,U+1f4ba,U+1f54b-1f54d,U+1f5fa-1f5ff,U+1f680-1f6a2,U+1f6a4-1f6a8,U+1f6b2,U+1f6d1,U+1f6d5-1f6d6,U+1f6dd-1f6df,U+1f6e2-1f6e5,U+1f6e9,U+1f6eb-1f6ec,U+1f6f3-1f6f6,U+1f6f8,U+1f6fa-1f6fb,U+1f9bc-1f9bd,U+1f9ed,U+1f9f3,U+1fa7c}@font-face{font-family:"Noto Color Emoji";font-style:normal;font-weight:400;font-display:swap;src:url("../fonts/emojis/Yq6P-KqIXTD0t4D9z1ESnKM3-HpFabsE4tq3luCC7p-aXxcn.6.woff2") format("woff2");unicode-range:U+2615,U+fe0f,U+1f32d-1f330,U+1f336,U+1f33d,U+1f345-1f37f,U+1f382,U+1f52a,U+1f942-1f944,U+1f950-1f96f,U+1f99e,U+1f9aa,U+1f9c0-1f9cb,U+1fad0-1fadb}@font-face{font-family:"Noto Color Emoji";font-style:normal;font-weight:400;font-display:swap;src:url("../fonts/emojis/Yq6P-KqIXTD0t4D9z1ESnKM3-HpFabsE4tq3luCC7p-aXxcn.7.woff2") format("woff2");unicode-range:U+200d,U+2600-2601,U+2603-2604,U+2614,U+2618,U+26a1,U+26c4-26c5,U+26c8,U+26f0,U+2728,U+2744,U+2b1b,U+2b50,U+fe0f,U+1f300,U+1f304-1f305,U+1f308,U+1f30a-1f30f,U+1f311-1f321,U+1f324-1f32c,U+1f331-1f335,U+1f337-1f33c,U+1f33e-1f344,U+1f3d4,U+1f3d6,U+1f3dc-1f3de,U+1f3f5,U+1f400-1f43f,U+1f490,U+1f4a7,U+1f4ab,U+1f4ae,U+1f525,U+1f54a,U+1f573,U+1f577-1f578,U+1f648-1f64a,U+1f940,U+1f980-1f9ae,U+1f9ba,U+1fa90,U+1faa8,U+1fab0-1fabd,U+1fabf,U+1face-1facf,U+1fae7}@font-face{font-family:"Noto Color Emoji";font-style:normal;font-weight:400;font-display:swap;src:url("../fonts/emojis/Yq6P-KqIXTD0t4D9z1ESnKM3-HpFabsE4tq3luCC7p-aXxcn.8.woff2") format("woff2");unicode-range:U+200d,U+2640,U+2642,U+2695-2696,U+26f7,U+26f9,U+2708,U+2764,U+fe0f,U+1f33e,U+1f373,U+1f37c,U+1f384-1f385,U+1f393,U+1f3a4,U+1f3a8,U+1f3c2-1f3c4,U+1f3c7,U+1f3ca-1f3cc,U+1f3eb,U+1f3ed,U+1f3fb-1f3ff,U+1f466-1f478,U+1f47c,U+1f481-1f483,U+1f486-1f487,U+1f48b,U+1f48f,U+1f491,U+1f4bb-1f4bc,U+1f527,U+1f52c,U+1f574-1f575,U+1f57a,U+1f645-1f647,U+1f64b,U+1f64d-1f64e,U+1f680,U+1f692,U+1f6a3,U+1f6b4-1f6b6,U+1f6c0,U+1f6cc,U+1f91d,U+1f926,U+1f930-1f931,U+1f934-1f93a,U+1f93c-1f93e,U+1f977,U+1f9af-1f9b3,U+1f9b8-1f9b9,U+1f9bc-1f9bd,U+1f9cc-1f9cf,U+1f9d1-1f9df,U+1fa82,U+1fac3-1fac5}@font-face{font-family:"Noto Color Emoji";font-style:normal;font-weight:400;font-display:swap;src:url("../fonts/emojis/Yq6P-KqIXTD0t4D9z1ESnKM3-HpFabsE4tq3luCC7p-aXxcn.9.woff2") format("woff2");unicode-range:U+200d,U+261d,U+2620,U+2639-263a,U+2665,U+270a-270d,U+2728,U+2763-2764,U+2b50,U+fe0f,U+1f31a-1f31f,U+1f32b,U+1f383,U+1f389,U+1f3fb-1f3ff,U+1f440-1f450,U+1f463-1f465,U+1f479-1f47b,U+1f47d-1f480,U+1f485,U+1f48b-1f48c,U+1f493-1f49f,U+1f4a4-1f4a6,U+1f4a8-1f4ab,U+1f4af,U+1f525,U+1f573,U+1f590,U+1f595-1f596,U+1f5a4,U+1f5e3,U+1f600-1f644,U+1f648-1f64a,U+1f64c,U+1f64f,U+1f90c-1f925,U+1f927-1f92f,U+1f932-1f933,U+1f970-1f976,U+1f978-1f97a,U+1f9a0,U+1f9b4-1f9b7,U+1f9bb,U+1f9be-1f9bf,U+1f9d0,U+1f9e0-1f9e1,U+1fa75-1fa79,U+1fac0-1fac2,U+1fae0-1fae6,U+1fae8,U+1faf0-1faf8}@font-face{font-family:"Noto Color Emoji";font-style:normal;font-weight:400;font-display:swap;src:url("../fonts/emojis/Yq6P-KqIXTD0t4D9z1ESnKM3-HpFabsE4tq3luCC7p-aXxcn.10.woff2") format("woff2");unicode-range:U+200d,U+2194-2195,U+2640,U+2642,U+26d3,U+27a1,U+fe0f,U+1f344,U+1f34b,U+1f3c3,U+1f3fb-1f3ff,U+1f426,U+1f468-1f469,U+1f4a5,U+1f525,U+1f642,U+1f6b6,U+1f7e9,U+1f7eb,U+1f9af,U+1f9bc-1f9bd,U+1f9ce,U+1f9d1-1f9d2}:root{--google-font-color-notocoloremoji:colrv1}#loading-screen{position:fixed;top:0px;left:0px;width:100vw;height:100vh;display:flex;flex-direction:row;justify-content:center;align-items:center;gap:1em;font-size:4em;background:#fff;background:radial-gradient(circle, rgb(255, 255, 255) 0%, rgb(255, 255, 255) 66%, rgb(226, 226, 226) 100%);user-select:none;z-index:999}#loading-screen>*{font-size:4rem;user-select:none;font-family:"Noto Color Emoji" !important}#loading-screen>*:nth-child(3n-2){animation:jiggle 1s linear 0ms infinite normal forwards}#loading-screen>*:nth-child(3n-1){animation:jiggle 1s linear -333ms infinite normal forwards}#loading-screen>*:nth-child(3n){animation:jiggle 1s linear -666ms infinite normal forwards}#loading-screen.fading{animation:fade-out 200ms ease-out 0ms 1 normal both}@keyframes jiggle{0%,50%,100%{transform:translateY(0rem)}10%{transform:translateY(1.1755705046rem)}20%{transform:translateY(1.9021130326rem)}30%{transform:translateY(1.9021130326rem)}40%{transform:translateY(1.1755705046rem)}60%{transform:translateY(-1.1755705046rem)}70%{transform:translateY(-1.9021130326rem)}80%{transform:translateY(-1.9021130326rem)}90%{transform:translateY(-1.1755705046rem)}}@keyframes fade-out{0%{opacity:1}100%{opacity:0;display:none;pointer-events:none}}@media(max-width: 500px){#loading-screen{gap:.5em}}`;

/** Randomly orders the given array. */
function shuffle<T>(arr:T[]):T[] { return arr.sort(() => Math.random() - .5); }
/** Picks an element of the given array at random. */
function pick<T>(...arr:T[]):T { return arr[Math.floor(Math.random() * arr.length)]; }

/**
 * The Loading helper-class handles functionality of the loading-screen
 */
export default abstract class Loading {

    /** Config of what emojis to show and when to show them. */
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
        [[4, 27], () => { // king's day
            const [a, b] = [pick('🧡', '🟠', '🔶'), pick('👑', '🫅')];
            return [a, b, a];
        }],
        [[5, 4], () => ['🧡', '🕊️', '🧡']],
        [[5, 5], pick(
            () => ['🇳🇱', '🇳🇱', '🇳🇱'],
            () => ['🎉', '🇳🇱', '🎉'],
            () => ['🧡', '🇳🇱', '🧡'],
        )],
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
            () => ['🎅🏼', '🎁', '👟', '🥾'], // sinterklaas kapoentje
            () => ['👀', '👴🏼','🚢', '🚂'], // zie ginds komt de stoomboot
            () => ['👂', '🍃', '🌳', '🐎'], // hoor de wind waait door de bomen
            () => ['🧑', '🚲', '💥', '🚶‍♂️'] // piet ging uit fietsen
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
    /** Emojis to show if no rule from `EMOJI_CONFIG` applies. */
    private static readonly DEFAULT_EMOJIS:(() => string[]) = () => ['🐐', '🧶', '🧦'];

    private constructor() {} // prevent extension

    private static checkLoadedInterval:NodeJS.Timeout;
    private static loadingScreen:HTMLElement = document.createElement("div");
    static { // create loading animation overlay (optimized for speed)
        this.loadingScreen.id = "loading-screen";
        const styleElem = document.createElement("style");
        styleElem.innerHTML = LOADING_SCREEN_STYLE;
        this.loadingScreen.appendChild(styleElem);
        window.addEventListener("DOMContentLoaded", () => document.body.toggleAttribute("loading", true));

        document.body.appendChild(this.loadingScreen);

        const now = new Date();
        const [month, day] = [now.getMonth() + 1, now.getDate()];
        const emojiGen = this.EMOJI_CONFIG.find(emc => emc[0][0] === month && emc[0][1] === day)?.[1] ?? this.DEFAULT_EMOJIS
        for (const emoji of emojiGen()) {
            const p = document.createElement("p");
            p.textContent = emoji;
            this.loadingScreen.appendChild(p);
        }

        const loadStart = Date.now();
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
                console.log(`Loading done: ${Date.now() - loadStart}ms`);
            }
        }, 50);
    }

    private static currentlyLoading:object[] = [];
    /** Number of things that are currently loading. */
    public static get numLoading() { return this.currentlyLoading.length; }
    /** Signifies that something starts loading. */
    public static markLoadStart(obj:object) { this.currentlyLoading.push(obj); }
    /** Signifies that something is done loading. */
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

    /**
     * Gets multiple elements from the page by their ID, while checking their types.
     * @param query a mapping from element IDs to the type of HTMLElement they are
     * @returns a mapping of element IDs to the elements with those IDs
     */
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
    /**
     * Gives a Promise that resolves with a mapping of elements IDs to the elements with those IDs.
     * @param query same as `Loading.getElementsById`
     */
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

    /**
     * Waits until both DOMContent is loaded and the given Promise resolves, then runs the callback.
     * @param dynContentPromise Promise that queries some dynamic content
     * @param loadCallback callback for successful loading
     * @param onFail callback when `dynContentPromise` fails
     */
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
    /** Mapping of element IDs to their type of HTMLElement */
    export type IDQuery = { [id:string]: Class<HTMLElement> };
    /** Mapping of element IDs to the elements with those IDs  */
    export type ResolvedIDQuery<Query extends IDQuery> = {
        [ID in keyof Query]: InstanceType<Query[ID]>
    };
}