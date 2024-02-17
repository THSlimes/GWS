import $ from "jquery";

import "./header-and-footer";
import "./create-split-view";

import "../common/ui/parallax-scrolling";
import "../common/custom-elements/ElementCarousel";

import SmartArticle from "../common/custom-elements/SmartArticle";
import ArticleDatabase, { ArticleInfo } from "../common/firebase/database/articles/ArticleDatabase";
import { FirestoreArticleDatabase } from "../common/firebase/database/articles/FirestoreArticleDatabase";
import { STORAGE } from "../common/firebase/init-firebase";
import { getDownloadURL, listAll, ref } from "@firebase/storage";
import ElementCarousel from "../common/custom-elements/ElementCarousel";
import ElementFactory from "../common/html-element-factory/ElementFactory";
import Placeholder from "../common/custom-elements/Placeholder";
import NumberUtil from "../common/util/NumberUtil";
import ArticlePaginator from "../common/firebase/database/articles/ArticlePaginator";
import NodeUtil from "../common/util/NodeUtil";

// INSERTING CAROUSEL IMAGES

const CAROUSEL_IMAGES_FOLDER_PATH = "/openbaar/fotos-homepagina";

const CAROUSEL_IMAGES:Record<number,HTMLImageElement> = {};

function createCarouselImg(url:string, priority:"high"|"low"|"auto"="auto"):HTMLImageElement {
    return ElementFactory.img(url, "Afbeelding")
        .attrs({ "parallax-factor": .75, "fetchPriority": priority })
        .on("load", (e, self) => self.setAttribute("loaded",""))
        .onMake(self => {
            if (self.complete) self.setAttribute("loaded","");
        })
        .make();
}

const carouselImagesFolder = ref(STORAGE, CAROUSEL_IMAGES_FOLDER_PATH);
listAll(carouselImagesFolder)
.then(photoRefs => {
    photoRefs.items.forEach((photoRef, i) => {
        getDownloadURL(photoRef)
        .then(url => {
            CAROUSEL_IMAGES[i] = createCarouselImg(url, i === 0 ? "high" : "low");
            CAROUSEL.prepend(CAROUSEL_IMAGES[i]);

            for (let i in CAROUSEL_IMAGES) {
                CAROUSEL.currentIndex.toString() === i ? CAROUSEL_IMAGES[i].removeAttribute("hide") : CAROUSEL_IMAGES[i].setAttribute("hide", "");
            }
            CAROUSEL.revolvingElements.splice(0, Infinity, ...Object.values(CAROUSEL_IMAGES));
        })
        .catch(console.warn);
    });
})
.catch(console.warn);

// creating as soon as possible
const CAROUSEL = new ElementCarousel(5000, 800);
CAROUSEL.append(
    ElementFactory.h1("Studievereniging Den Geitenwollen Soc.")
        .id("carousel-name")
        .attrs({ "cover": "", "parallax-factor": .7 })
        .make(),
    ElementFactory.div().attr("cover").make()
);
CAROUSEL.id = "photo-carousel";

window.addEventListener("DOMContentLoaded", () => { // inserting after page load
    Placeholder.replaceWith("photo-carousel", CAROUSEL);
});

// RETRIEVING ARTICLES

const DB:ArticleDatabase = new FirestoreArticleDatabase();
const PAGE_SIZE = 5; // number of articles per page

let currentPageIndex = 0;

const ARTICLE_PAGINATOR = new ArticlePaginator(DB, PAGE_SIZE, { forHomepage: true, forMembers: false }, "descending");

window.addEventListener("DOMContentLoaded", () => {
    // getting ui elements from page
    const CURRENT_PAGE = document.getElementById("current-page") as HTMLDivElement;

    const FIRST_PAGE_BUTTON = document.getElementById("first-page") as HTMLInputElement;
    const PREVIOUS_PAGE_BUTTON = document.getElementById("previous-page") as HTMLInputElement;
    const NEXT_PAGE_BUTTON = document.getElementById("next-page") as HTMLInputElement;
    const LAST_PAGE_BUTTON = document.getElementById("last-page") as HTMLInputElement;

    const PAGE_NUMBER = document.getElementById("page-number") as HTMLSpanElement;

    ARTICLE_PAGINATOR.getSize()
    .then(sizes => {// adding button functionality
        FIRST_PAGE_BUTTON.addEventListener("click", () => loadPage(currentPageIndex = 0, true).catch(console.error));
        PREVIOUS_PAGE_BUTTON.addEventListener("click", () => loadPage(currentPageIndex = Math.max(0, currentPageIndex - 1), true).catch(console.error));
        NEXT_PAGE_BUTTON.addEventListener("click", () => loadPage(currentPageIndex = Math.min(sizes.numPages-1, currentPageIndex + 1), true).catch(console.error));
        LAST_PAGE_BUTTON.addEventListener("click", () => loadPage(currentPageIndex = sizes.numPages-1, true).catch(console.error));
    })
    .catch(console.error);

    function loadPage(pageIndex:number, scrollToTop=false):Promise<void> {
        NodeUtil.empty(CURRENT_PAGE); // clear old articles
        
        return new Promise((resolve, reject) => {
            ARTICLE_PAGINATOR.getPage(pageIndex)
            .then(info => {
                CURRENT_PAGE.append(...info.articles.map(a => new SmartArticle(a, true))); // add article elements

                ARTICLE_PAGINATOR.getSize()
                .then(sizes => {
                    PAGE_NUMBER.textContent = `${pageIndex + 1}/${sizes.numPages}`;

                    if (scrollToTop) window.scrollBy({ top: CURRENT_PAGE.getBoundingClientRect().top, behavior: "smooth" });
                    FIRST_PAGE_BUTTON.disabled = PREVIOUS_PAGE_BUTTON.disabled = pageIndex === 0;
                    LAST_PAGE_BUTTON.disabled = NEXT_PAGE_BUTTON.disabled = pageIndex === sizes.numPages - 1;
                })
                .catch(console.error);
            })
            .catch(reject);
        });
    }

    // initial load
    loadPage(currentPageIndex)
    .catch(console.error);

});