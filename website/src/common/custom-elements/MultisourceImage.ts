import { StorageError, getDownloadURL, getMetadata, ref } from "@firebase/storage";
import { onPermissionCheck } from "../firebase/authentication/permission-based-redirect";
import Permissions from "../firebase/database/Permissions";
import { STORAGE } from "../firebase/init-firebase";
import ElementUtil from "../util/ElementUtil";
import { HasSections } from "../util/UtilTypes";
import { AttachmentOrigin, isAttachmentOrigin } from "./MultisourceAttachment";
import ElementFactory from "../html-element-factory/ElementFactory";
import Loading from "../Loading";

export default class MultisourceImage extends HTMLElement implements HasSections<"image"|"errorMessage"> {

    private static CAN_DOWNLOAD_PROTECTED_FILES = false;
    static {
        onPermissionCheck(Permissions.Permission.DOWNLOAD_PROTECTED_FILES, canDownload => this.CAN_DOWNLOAD_PROTECTED_FILES = canDownload, true, true);
    }

    private _origin:AttachmentOrigin;
    /** Location where data is queried from. */
    public get origin() { return this._origin; }
    public set origin(newSrc:AttachmentOrigin) {
        if (newSrc !== this._origin) {
            this._origin = newSrc;
            this.setAttribute("src", newSrc);
            this.refresh();
        }
    }

    private _src:string;
    /** Link/path to the attachment file. */
    public get src() { return this._src; }
    public set src(newHref:string) {
        if (newHref !== this._src) {
            this._src = newHref;
            this.setAttribute("href", newHref);
            this.refresh();
        }
    }

    public set alt(newAlt:string) {
        this.image.alt = newAlt;
    }

    private refresh() {
        Loading.markLoadStart(this);

        const infoPromise = this.origin === "external" ?
            new Promise<string>((resolve) => resolve(this.src)) :
            this.origin === "firebase-storage-protected" ?
                MultisourceImage.getSrcFromFirebase("beveiligd", this.src) :
                MultisourceImage.getSrcFromFirebase("openbaar", this.src);
        
        infoPromise.then(url => { // got image url
            this.classList.remove("error");
            Loading.markLoadStart(this.image); // wait for image load
            this.image.addEventListener("load", () => Loading.markLoadEnd(this.image), { once: true });
            this.image.src = url;
            this.image.removeAttribute("hidden");
            this.errorMessage.toggleAttribute("hidden", true);
        })
        .catch(err => { // couldn't get image url
            this.classList.add("error");
            this.image.removeAttribute("src");
            this.image.toggleAttribute("hidden", true);
            this.errorMessage.lastChild!.textContent = err instanceof Error ? err.message : "Er ging iets mis.";
            this.errorMessage.removeAttribute("hidden");
        })
        .finally(() => Loading.markLoadEnd(this));
    }

    public image!:HTMLImageElement;
    public errorMessage!:HTMLDivElement;

    constructor(origin?:AttachmentOrigin, src?:string) {
        super();

        this.initElement();

        this._origin = origin ?? ElementUtil.getAttrAs(this, "origin", isAttachmentOrigin) ?? "firebase-storage-public";
        this._src = src ?? this.getAttribute("src") ?? "";

        this.refresh();
    }

    initElement(): void {
        this.style.display = "flex";
        this.classList.add("flex-rows", "main-axis-center", "cross-axis-center");

        this.image = this.appendChild(ElementFactory.img().attr("hidden").make());
        this.errorMessage = this.appendChild(
            ElementFactory.div(undefined, "error-message", "no-margin", "flex-columns", "main-axis-center", "cross-axis-center", "in-section-gap")
                .attr("hidden")
                .children(
                    ElementFactory.p("broken_image").class("icon"),
                    ElementFactory.p().class("no-margin").make()
                )
                .make()
        );
    }

    private static getSrcFromFirebase(base:"openbaar"|"beveiligd", ...segments:string[]):Promise<string> {
        return new Promise((resolve, reject) => {
            if (base === "beveiligd" && !this.CAN_DOWNLOAD_PROTECTED_FILES) {
                reject(new Error("Geen toegang tot afbeelding", { cause: "missing permissions" }));
            }
            else {
                const fullPath = [base, ...segments].join('/');
                const fileRef = ref(STORAGE, fullPath);

                Promise.all([getMetadata(fileRef), getDownloadURL(fileRef)])
                .then(([metadata, downloadUrl]) => {
                    if (metadata.contentType?.startsWith("image/")) resolve(downloadUrl);
                    else reject(new Error("Bestand is geen afbeelding", { cause: "non-image file" }));
                })
                .catch(err => {

                    if (err instanceof StorageError) switch(err.code) {
                        case "storage/object-not-found":
                            reject(new Error("Kan afbeelding niet vinden", { cause: "not found" }));
                            break;
                        case "storage/unauthorized":
                            reject(new Error("Geen toegang tot afbeelding", { cause: "missing permissions" }));
                            break;
                        default:
                            reject(new Error("Er ging iets mis", { cause: "unknown" }));
                            break;
                    }
                    else reject(err);

                });
            }
        });
    }

}

customElements.define("multisource-image", MultisourceImage);