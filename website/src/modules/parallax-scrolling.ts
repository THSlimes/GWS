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
        if (!isNaN(factor)) {
            const computedStyle = window.getComputedStyle(e);
            if (isReplacedElement(e)) { // use original object-position value
                const objPos = computedStyle.objectPosition.split(' ');
                parallaxElements.push([e, factor, true, [objPos[0]??"0px", objPos[1]??"0px"]]);
            }
            else { // use original translate value
                const translate = computedStyle.translate.split(' ');
                parallaxElements.push([e, factor, true, [translate[0]??"0px", translate[1]??"0px"]]);
            }
        }
    }
});

document.addEventListener("scroll", () => {
    parallaxElements.forEach(e => {
        const offset = window.scrollY * (e[1] - 1);
        console.log(e[3]);
        
        
        if (e[2]) e[0].style.objectPosition = `${e[3][0]} calc(${e[3][1]} + ${offset}px)`;
        else e[0].style.translate = `${e[3][0]} calc(${e[3][1]} + ${offset}px)`;
    });
});