import $ from "jquery";

import "../common/parallax-scrolling";
import "../common/custom-elements/ElementCarousel";

import FirestoreDatabase from "../common/firebase/database/FirestoreDatabase";
import SmartArticle from "../common/custom-elements/SmartArticle";
import { ArticleDatabase, ArticleInfo } from "../common/Database";
import { clamp } from "../common/NumberUtil";

type PageInfo = {
    pageNum: number,
    retrieved:boolean,
    size: number,
    articles: ArticleInfo[]
};
type PageCollection = Record<number, PageInfo>;

const DB:ArticleDatabase = new FirestoreDatabase().articles;
const PAGE_SIZE = 5; // number of articles per page

/** Computes the [latest, earliest] creation dates of the given articles. */
function getPeriod(articles:ArticleInfo[]):[Date, Date] {
    // sort newest to oldest creation dates
    const sorted = articles.map(a => a.created_at).toSorted((a,b) => b.getTime()-a.getTime());
    return [sorted[0], sorted.at(-1)!];
}



window.addEventListener("DOMContentLoaded", async () => {
    const NUM_ARTICLES = await DB.count({ forHomepage:true }); // total number of articles

    // where to put article previews
    const RECENT_MESSAGES_ELEM = document.getElementById("recent-messages")!;
    // navigation buttons
    const FIRST_PAGE_BUTTON = document.getElementById("first-page") as HTMLInputElement;
    const PREV_PAGE_BUTTON = document.getElementById("previous-page") as HTMLInputElement;
    const NEXT_PAGE_BUTTON = document.getElementById("next-page") as HTMLInputElement;
    const LAST_PAGE_BUTTON = document.getElementById("last-page") as HTMLInputElement;
    const PAGE_INDICATOR = document.getElementById("page-indicator") as HTMLParagraphElement;

    // adding button interactivity
    FIRST_PAGE_BUTTON.addEventListener("click", () => insertPage(currPage = 0));
    PREV_PAGE_BUTTON.addEventListener("click", () => insertPage(--currPage));
    NEXT_PAGE_BUTTON.addEventListener("click", () => insertPage(++currPage));
    LAST_PAGE_BUTTON.addEventListener("click", () => insertPage(currPage = NUM_PAGES-1));


    // divide into pages
    const NUM_PAGES = Math.ceil(NUM_ARTICLES / PAGE_SIZE);
    const pages:PageCollection = {};
    for (let i = 0; i < NUM_PAGES; i ++) pages[i] = {
        pageNum: i,
        retrieved: false,
        // last page might have fewer pages
        size: (NUM_ARTICLES % PAGE_SIZE === 0) || (i < NUM_PAGES-1) ? PAGE_SIZE : NUM_ARTICLES % PAGE_SIZE,
        articles: []
    };

    /** Retrieves a page by its index. */
    function getPage(pageNum:number):Promise<PageInfo> {
        pageNum = clamp(Math.floor(pageNum), 0, NUM_PAGES-1); // ensure valid index

        return new Promise(async (resolve, reject) => {
            if (pages[pageNum].retrieved) resolve(pages[pageNum]); // already retrieved
            else if (pageNum === 0) { // get most recent articles
                pages[pageNum].articles = await DB.get(PAGE_SIZE, { forHomepage:true, sortByCreatedAt:"descending" });
                pages[pageNum].retrieved = true;
                resolve(pages[pageNum]);
            }
            else if (pageNum === NUM_PAGES-1) { // get least recent articles
                pages[pageNum].articles = await DB.get(pages[pageNum].size, { forHomepage:true, sortByCreatedAt:"ascending" });
                pages[pageNum].articles.sort((a,b) => b.created_at.getTime() - a.created_at.getTime()); // sort manually
                pages[pageNum].retrieved = true;
                resolve(pages[pageNum]);
            }
            else if (pages[pageNum-1].retrieved) { // get pages from before previous page
                pages[pageNum].articles = await DB.get(pages[pageNum].size, {
                    forHomepage: true,
                    sortByCreatedAt:"descending",
                    before: getPeriod(pages[pageNum-1].articles)[1]
                });
                pages[pageNum].retrieved = true;
                resolve(pages[pageNum]);
            }
            else if (pages[pageNum+1].retrieved) { // get pages from after next page
                pages[pageNum].articles = await DB.get(pages[pageNum].size, {
                    forHomepage: true,
                    sortByCreatedAt:"descending",
                    before: getPeriod(pages[pageNum+1].articles)[0]
                });
                pages[pageNum].retrieved = true;
                resolve(pages[pageNum]);
            }
            else reject("can only retrieve one page at a time");
        });
    }
    
    /** Inserts the articles in a page into the webpage. */
    async function insertPage(pageNum:number) {
        const info = await getPage(pageNum);        
        
        $(RECENT_MESSAGES_ELEM).children("article").remove();
        RECENT_MESSAGES_ELEM.prepend(...info.articles.map(a => SmartArticle.fromInfo(a, true)));

        // updating buttons and page indicator
        FIRST_PAGE_BUTTON.disabled = currPage === 0;
        PREV_PAGE_BUTTON.disabled = currPage === 0;
        NEXT_PAGE_BUTTON.disabled = currPage === NUM_PAGES-1;
        LAST_PAGE_BUTTON.disabled = currPage === NUM_PAGES-1;

        PAGE_INDICATOR.innerText = `Pagina ${pageNum+1} / ${NUM_PAGES}`;
    }

    let currPage = 0;
    insertPage(currPage); // initial load
    
});