import $ from "jquery";

import "../common/parallax-scrolling";
import "../common/custom-elements/ElementCarousel";

import FirestoreDatabase from "../common/firebase/FirestoreDatabase";
import SmartArticle from "../common/custom-elements/SmartArticle";

const RECENT_MESSAGES_ELEM = document.getElementById("recent-messages")!;
const PREV_PAGE_BUTTON = RECENT_MESSAGES_ELEM.querySelector(".previous-page")!;
const NEXT_PAGE_BUTTON = RECENT_MESSAGES_ELEM.querySelector(".next-page")!;

const DB = new FirestoreDatabase();

/** [latest, oldest] */
let currentPagePeriod:[Date,Date] = [new Date(), new Date()];
const NUM_ARTICLES = 5;

async function loadArticles(before?:Date, after?:Date) {
    DB.articles.recent(NUM_ARTICLES, {before, after})
    .then(articles => { // initial articles load    
        if (articles.length > 0) {
            currentPagePeriod = [articles[0].created_at, articles.at(-1)!.created_at];
            $(RECENT_MESSAGES_ELEM).children("article").remove();
            RECENT_MESSAGES_ELEM.prepend(...articles.map(a => SmartArticle.fromInfo(a, true)));
        }
    });
}
loadArticles(); // initial load

NEXT_PAGE_BUTTON.addEventListener("click", async function() {
    await loadArticles(currentPagePeriod[1]);
});

PREV_PAGE_BUTTON.addEventListener("click", async function() {
    await loadArticles(undefined, currentPagePeriod[0]);
});