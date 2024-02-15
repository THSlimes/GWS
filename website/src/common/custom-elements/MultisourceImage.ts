import { StorageError, getDownloadURL, getMetadata, ref } from "@firebase/storage";
import { checkPermissions } from "../firebase/authentication/permission-based-redirect";
import Permission from "../firebase/database/Permission";
import { STORAGE } from "../firebase/init-firebase";
import ElementUtil, { HasSections } from "../util/ElementUtil";
import { AttachmentOrigin, isAttachmentOrigin } from "./MultisourceAttachment";
import ElementFactory from "../html-element-factory/ElementFactory";

export default class MultisourceImage extends HTMLElement implements HasSections<"image"|"errorMessage"> {

    private static CAN_DOWNLOAD_PROTECTED_FILES = false;
    static {
        checkPermissions(Permission.DOWNLOAD_PROTECTED_FILES, hasPerms => this.CAN_DOWNLOAD_PROTECTED_FILES = hasPerms, true, true);
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

    private refresh() {
        const infoPromise = this.origin === "external" ?
            new Promise<string>((resolve) => resolve(this.src)) :
            this.origin === "firebase-storage-protected" ?
                MultisourceImage.getSrcFromFirebase("beveiligd", this.src) :
                MultisourceImage.getSrcFromFirebase("openbaar", this.src);
        
        infoPromise.then(url => { // got image url
            this.classList.remove("error");
            this.image.src = url;
            this.image.style.display = "block";
            this.errorMessage.style.display = "none";
        })
        .catch(err => { // couldn't get image url
            this.classList.add("error");
            this.image.removeAttribute("src");
            this.image.style.display = "none";
            this.errorMessage.lastChild!.textContent = err instanceof Error ? err.message : "Er ging iets mis.";
            this.errorMessage.style.display = "flex";
        });
    }

    public image!:HTMLImageElement;
    public errorMessage!:HTMLDivElement;

    constructor(source?:AttachmentOrigin, href?:string) {
        super();

        this.initElement();

        this._origin = source ?? ElementUtil.getAttrAs(this, "src", isAttachmentOrigin) ?? "firebase-storage-public";
        this._src = source ?? this.getAttribute("href") ?? "";
        this.refresh();
    }

    initElement(): void {
        this.style.display = "flex";
        this.classList.add("center-content");

        this.image = this.appendChild(ElementFactory.img().make());
        this.errorMessage = this.appendChild(
            ElementFactory.div(undefined, "error-message", "no-margin", "flex-columns", "main-axis-center", "cross-axis-center", "in-section-gap")
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

window.addEventListener("DOMContentLoaded", () => customElements.define("multisource-image", MultisourceImage));