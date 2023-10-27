function isReplacedElement(e:HTMLElement) {
    return e instanceof HTMLIFrameElement
        || e instanceof HTMLVideoElement
        || e instanceof HTMLEmbedElement
        || e instanceof HTMLImageElement;
}

// initial search for parallax elements
window.addEventListener("DOMContentLoaded", () => {
    // store initial scroll position
    document.body.style.setProperty("--scroll-x", window.scrollX + "px");
    document.body.style.setProperty("--scroll-y", window.scrollY + "px");

    document.querySelectorAll("*[parallax-factor]").forEach(e => {
        if (e instanceof HTMLElement) {
            const factor = Number.parseFloat(e.getAttribute("parallax-factor")!);
            if (!isNaN(factor)) { // check if valid number
                e.style.setProperty("--parallax-factor", factor.toString());
    
                // get original displacement
                const style = getComputedStyle(e);
                const originalDisplacement = isReplacedElement(e) ? style.objectPosition.split(' ') : style.translate.split(' ');
                
                e.style.setProperty("--original-displacement-x", originalDisplacement[0]);
                e.style.setProperty("--original-displacement-y", originalDisplacement[1]);

                if (e instanceof HTMLImageElement) {
                    const bb = e.getBoundingClientRect();
                    e.style.setProperty("--min-displacement-y", `${bb.height - e.naturalHeight}px`);
                    e.style.setProperty("--max-displacement-y", `calc(100% + ${e.naturalHeight - bb.height}px)`);
                    
                }
                else {
                    e.style.setProperty("--min-displacement-y", "0%");
                    e.style.setProperty("--max-displacement-y", "100%");
                }

                e.setAttribute("parallax-scrolling", "");
            }
        }
    });
});

document.addEventListener("scroll", () => {
    document.body.style.setProperty("--scroll-x", window.scrollX + "px");
    document.body.style.setProperty("--scroll-y", window.scrollY + "px");
});