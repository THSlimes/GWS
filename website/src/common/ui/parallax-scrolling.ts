import Loading from "../Loading";
import ElementUtil from "../util/ElementUtil";

/** Initializes parallax scrolling of the given element. */
function initParallax(elem:HTMLElement) {
    const factor = Number.parseFloat(elem.getAttribute("parallax-factor")!);
    if (!isNaN(factor)) { // check if valid number
        elem.style.setProperty("--parallax-factor", factor.toString());

        // get original displacement
        const style = getComputedStyle(elem);
        const originalDisplacement = ElementUtil.isReplacedElement(elem) ? style.objectPosition.split(' ') : style.translate.split(' ');
        
        elem.style.setProperty("--original-displacement-x", originalDisplacement[0]);
        elem.style.setProperty("--original-displacement-y", originalDisplacement[1]);

        if (elem instanceof HTMLImageElement) {
            const bb = elem.getBoundingClientRect();
            elem.style.setProperty("--min-displacement-y", `${bb.height - elem.naturalHeight}px`);
            elem.style.setProperty("--max-displacement-y", `calc(100% + ${elem.naturalHeight - bb.height}px)`);
            
        }
        else {
            elem.style.setProperty("--min-displacement-y", "0%");
            elem.style.setProperty("--max-displacement-y", "100%");
        }

        elem.setAttribute("parallax-scrolling", "");
    }
}

// initial search for parallax elements
Loading.onDOMContentLoaded()
.then(() => {
    // store initial scroll position
    document.body.style.setProperty("--scroll-x", window.scrollX + "px");
    document.body.style.setProperty("--scroll-y", window.scrollY + "px");

    // for current elements
    document.querySelectorAll("*[parallax-factor]").forEach(e => {
        if (e instanceof HTMLElement) initParallax(e);
    });

    // for future elements
    const mutationObserver = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            if (mutation.type === "childList" && mutation.target instanceof Element) {
                // traverse target and ancestors to find parallax-scrolling elements
                const frontier:Element[] = [mutation.target];
                while (frontier.length) {
                    const elem = frontier.pop()!;
                    if (elem instanceof HTMLElement && elem.hasAttribute("parallax-factor") && !elem.hasAttribute("parallax-scrolling")) initParallax(elem);
                    frontier.push(...Array.from(elem.children));
                }
            }
        }
    }).observe(document.body, { attributes:true, childList:true, subtree:true });
});

document.addEventListener("scroll", () => {
    requestAnimationFrame(() => { // prevent jitter
        document.body.style.setProperty("--scroll-x", window.scrollX + "px");
        document.body.style.setProperty("--scroll-y", window.scrollY + "px");
    });
});