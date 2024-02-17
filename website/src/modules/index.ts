import "./header-and-footer";
import "./create-split-view";

import "../common/ui/parallax-scrolling";
import "../common/custom-elements/ElementCarousel";
import "../common/custom-elements/ArticleList";

import SmartArticle from "../common/custom-elements/SmartArticle";
import ArticleDatabase from "../common/firebase/database/articles/ArticleDatabase";
import { FirestoreArticleDatabase } from "../common/firebase/database/articles/FirestoreArticleDatabase";
import { STORAGE } from "../common/firebase/init-firebase";
import { getDownloadURL, listAll, ref } from "@firebase/storage";
import ElementCarousel from "../common/custom-elements/ElementCarousel";
import ElementFactory from "../common/html-element-factory/ElementFactory";
import Placeholder from "../common/custom-elements/Placeholder";
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