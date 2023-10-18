import $ from "jquery";

import "../common/parallax-scrolling";
import "../common/custom-elements/ElementCarousel";

import FirestoreDatabase from "../common/firebase/FirestoreDatabase";
import SmartArticle from "../common/custom-elements/SmartArticle";
import { ArticleInfo } from "../common/Database";
import { clamp } from "../common/NumberUtil";

const RECENT_MESSAGES_ELEM = document.getElementById("recent-messages")!;

const FIRST_PAGE_BUTTON = document.getElementById("first-page") as HTMLInputElement;
const PREV_PAGE_BUTTON = document.getElementById("previous-page") as HTMLInputElement;
const NEXT_PAGE_BUTTON = document.getElementById("next-page") as HTMLInputElement;
const LAST_PAGE_BUTTON = document.getElementById("last-page") as HTMLInputElement;
const PAGE_INDICATOR = document.getElementById("page-indicator") as HTMLParagraphElement;

const DB = new FirestoreDatabase();

async function init() {
    const PAGE_SIZE = 5;
    const NUM_ARTICLES = await DB.articles.getCount();
    const NUM_PAGES = Math.ceil((NUM_ARTICLES)/PAGE_SIZE);
    
    let currPage = 0;
    const pages:Record<number, ArticleInfo[]> = {};
    
    type PageInfo = { articles:ArticleInfo[], hasNext:boolean, hasPrevious:boolean };
    function getPage(pageNum:number):Promise<PageInfo> {
        pageNum = clamp(Math.floor(pageNum), 0, NUM_PAGES-1); // failsafe
    
        return new Promise<PageInfo>((resolve, reject) => {
            if (pageNum in pages) resolve({ // page already retrieved
                articles: pages[pageNum],
                hasPrevious: pageNum-1 >= 0,
                hasNext: pageNum+1 < NUM_PAGES
            });
            else DB.articles.getRecent(PAGE_SIZE, {startAfter: NUM_ARTICLES-pageNum*PAGE_SIZE})
            .then(articles => {                
                pages[pageNum] = articles; // store for later
                resolve({
                    articles,
                    hasPrevious: pageNum-1 >= 0,
                    hasNext: pageNum+1 < NUM_PAGES
                });
            })
            .catch(reject);
        });
    }

    async function insertPage(pageNum:number) {
        const info = await getPage(pageNum);        
        $(RECENT_MESSAGES_ELEM).children("article").remove();
        RECENT_MESSAGES_ELEM.prepend(...info.articles.map(a => SmartArticle.fromInfo(a, true)));
        currPage = pageNum;

        // updating buttons and page indicator
        FIRST_PAGE_BUTTON.disabled = currPage === 0;
        PREV_PAGE_BUTTON.disabled = currPage === 0;
        NEXT_PAGE_BUTTON.disabled = currPage === NUM_PAGES-1;
        LAST_PAGE_BUTTON.disabled = currPage === NUM_PAGES-1;

        PAGE_INDICATOR.innerText = `Pagina ${currPage+1} / ${NUM_PAGES}`;
    }
    insertPage(0);

    FIRST_PAGE_BUTTON.addEventListener("click", () => insertPage(0));
    PREV_PAGE_BUTTON.addEventListener("click", () => insertPage(currPage-1));
    NEXT_PAGE_BUTTON.addEventListener("click", () => insertPage(currPage+1));
    LAST_PAGE_BUTTON.addEventListener("click", () => insertPage(NUM_PAGES-1));
}

init();