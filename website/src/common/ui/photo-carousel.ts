import { getDownloadURL, listAll, ref } from "@firebase/storage";
import { STORAGE } from "../firebase/init-firebase";
import ElementCarousel from "../custom-elements/ElementCarousel";
import ElementFactory from "../html-element-factory/ElementFactory";

// carousel of images
const CAROUSEL_IMAGES_FOLDER_PATH = "/openbaar/fotos-homepagina";
const IMAGES_FOLDER_REF = ref(STORAGE, CAROUSEL_IMAGES_FOLDER_PATH);
export default function makePhotoCarousel(coverText:string):Promise<ElementCarousel> {
    return new Promise((resolve, reject) => {
        const imageElements:HTMLImageElement[] = [];

        listAll(IMAGES_FOLDER_REF)
        .then(res => res.items)
        .then(imageRefs => {
            for (let i = 0; i < imageRefs.length; i ++) {
                const imgElement = document.createElement("img");
                // if (imgElement.fetchPriority) imgElement.fetchPriority = i === 0 ? "high" : "low";
                imgElement.setAttribute("parallax-factor", ".75");
                imageElements.push(imgElement);
            }

            const out = new ElementCarousel(5000, 800);
            
            out.append(
                ...imageElements,
                ElementFactory.h1(coverText)
                    .id("carousel-name")
                    .class("no-margin")
                    .attr("cover")
                    .attr("parallax-factor", .7)
                    .make(),
                ElementFactory.div().attr("cover").make()
            );
            
            out.id = "photo-carousel";

            imageRefs.forEach((imageRef, i) => {
                getDownloadURL(imageRef)
                .then(downloadURL => {
                    if (i === 0) imageElements[0].addEventListener("load", () => resolve(out));
                    imageElements[i].addEventListener("load", () => imageElements[i].toggleAttribute("loaded", true));
                    imageElements[i].src = downloadURL; // apply image source
                })
                .catch(reject);
            });
        })
        .catch(reject);
    });
}