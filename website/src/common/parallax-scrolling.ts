/**
 * This codes provides all elements with an attribute that enables
 * parallax scrolling.
 */

/** Data about parallax-scrolling objects. */
const parallaxElements:[HTMLElement,number,boolean,[string,string]][] = [];

function isReplacedElement(e:HTMLElement) {
    return e instanceof HTMLIFrameElement
        || e instanceof HTMLVideoElement
        || e instanceof HTMLEmbedElement
        || e instanceof HTMLImageElement;
}

// initial search for parallax elements
document.querySelectorAll("*[parallax-factor]").forEach(e => {
    if (e instanceof HTMLElement) {
        const factor = Number.parseFloat(e.getAttribute("parallax-factor")!);
        if (!isNaN(factor)) { // check if valid number
            const computedStyle = window.getComputedStyle(e);
            if (isReplacedElement(e)) { // with replaced objects, the ```object-position``` property is changed instead
                // use original object-position value
                const objPos = computedStyle.objectPosition.split(' ');
                parallaxElements.push([e, factor, true, [objPos[0]??"0px", objPos[1]??"0px"]]);
            }
            else {
                // use original translate value
                const translate = computedStyle.translate.split(' ');
                parallaxElements.push([e, factor, true, [translate[0]??"0px", translate[1]??"0px"]]);
            }
        }
    }
});

document.addEventListener("scroll", () => {
    parallaxElements.forEach(e => { // apply parallax offset
        const offset = window.scrollY * (e[1] - 1);
                
        if (e[2]) e[0].style.objectPosition = `${e[3][0]} calc(${e[3][1]} + ${offset}px)`;
        else e[0].style.translate = `${e[3][0]} calc(${e[3][1]} + ${offset}px)`;
    });
});