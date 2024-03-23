import { StorageError, getDownloadURL, getMetadata, ref } from "@firebase/storage";
import { onPermissionCheck } from "../firebase/authentication/permission-based-redirect";
import Permissions from "../firebase/database/Permissions";
import { STORAGE } from "../firebase/init-firebase";
import URLUtil, { FileInfo, FileType } from "../util/URLUtil";
import ElementUtil from "../util/ElementUtil";
import { HasSections } from "../util/UtilTypes";
import ElementFactory from "../html-element-factory/ElementFactory";
import { AttachmentOrigin } from "../util/UtilTypes";
import Loading from "../Loading";

export default class MultisourceAttachment extends HTMLElement implements HasSections<"filetypeIcon"|"fileNameLabel"|"fileSizeLabel"|"downloadButton"> {

    private static CAN_DOWNLOAD_PROTECTED_ATTACHMENTS = false;
    static {
        onPermissionCheck(Permissions.Permission.DOWNLOAD_PROTECTED_FILES, canDownload => this.CAN_DOWNLOAD_PROTECTED_ATTACHMENTS = canDownload, true, true);
    }

    private static readonly FILE_SIZE_UNITS = ['B', "kB", "MB", "GB", "TB", "PB", "YB"];
    public static getFileSizeString(numBytes:number):string {
        let unitInd = 0;
        let numUnits = numBytes;
        while (numUnits >= 1000) [unitInd, numUnits] = [unitInd + 1, numUnits / 1000];
    
        return numUnits.toFixed(1) + this.FILE_SIZE_UNITS[unitInd];
    }

    /** Icon names associated with each FileType. */
    private static FILE_TYPE_ICONS:Record<FileType, string> = {
        image: "photo_library",
        application: "collections_bookmark",
        audio: "library_music",
        example: "quiz",
        font: "font_download",
        model: "deployed_code",
        text: "library_books",
        video: "video_library",
        unknown: "quiz",
        "compressed-folder": "folder_zip",
        pdf: "picture_as_pdf"
    };

    private _origin:AttachmentOrigin;
    /** Location where data is queried from. */
    public get origin() { return this._origin; }
    public set origin(newSrc:AttachmentOrigin) {
        if (newSrc !== this._origin) {
            this._origin = newSrc;
            this.setAttribute("origin", newSrc);
            this.refresh();
        }
    }

    private _src:string;
    /** Link/path to the attachment file. */
    public get src() { return this._src; }
    public set src(newHref:string) {
        if (newHref !== this._src) {
            this._src = newHref;
            this.setAttribute("src", newHref);
            this.refresh();
        }
    }

    private refresh():Promise<void> {
        
        const infoPromise = this.origin === "external" ?
            URLUtil.getInfo(this.src) :
            this.origin === "firebase-storage-protected" ?
                MultisourceAttachment.getInfoFromFirebase("beveiligd", this.src) :
                MultisourceAttachment.getInfoFromFirebase("openbaar", this.src);

        return new Promise((resolve, reject) => {
            infoPromise.then(info => {
                this.classList.remove("error");

                this.filetypeIcon.textContent = MultisourceAttachment.FILE_TYPE_ICONS[info.fileType];
                this.fileNameLabel.textContent = info.name;
                this.fileSizeLabel.textContent = info.size ? MultisourceAttachment.getFileSizeString(info.size) : "";
                this.downloadButton.textContent = "download";
                this.downloadButton.title = "Bestand downloaden";
                this.downloadButton.classList.add("click-action")
                this.downloadButton.setAttribute("href", info.href);
                this.downloadButton.setAttribute("download", "");
            })
            .catch(err => {
                this.classList.add("error");
                this.filetypeIcon.textContent = "error";
                this.fileNameLabel.textContent = err instanceof Error ? err.message : "Er ging iets mis";
                this.fileSizeLabel.textContent = "";
                this.downloadButton.textContent = "file_download_off";
                this.downloadButton.title = "";
                this.downloadButton.classList.remove("click-action")
                this.downloadButton.removeAttribute("href");
                this.downloadButton.removeAttribute("download");
            });
        });
        
    }

    public filetypeIcon!:HTMLParagraphElement;
    public fileNameLabel!:HTMLParagraphElement;
    public fileSizeLabel!:HTMLParagraphElement;
    public downloadButton!:HTMLAnchorElement;

    constructor(origin?:AttachmentOrigin, src?:string) {
        super();

        this.initElement();

        this._origin = origin ?? ElementUtil.getAttrAs(this, "origin", AttachmentOrigin.checkType) ?? "firebase-storage-public";
        this._src = src ?? this.getAttribute("src") ?? "";
        this.refresh();
    }

    initElement(): void {
        this.style.display = "flex";
        this.classList.add("flex-columns", "cross-axis-center", "in-section-gap");

        this.filetypeIcon = this.appendChild(
            ElementFactory.p("collections_bookmark")
                .class("icon", "file-type-icon")
                .make()
        );

        this.appendChild(
            ElementFactory.div(undefined, "file-info", "flex-rows")
                .children(
                    this.fileNameLabel = ElementFactory.p("Bestandsnaam")
                        .class("file-name", "no-margin")
                        .make(),
                    this.fileSizeLabel = ElementFactory.p("Bestandsgrootte")
                        .class("file-size", "no-margin")
                        .make(),
                )
                .make()
        );

        this.downloadButton = this.appendChild(
            ElementFactory.a(undefined, "download")
                .openInNewTab(true)
                .tooltip("Bestand downloaden")
                .class("icon", "click-action", "download-icon")
                .make()
        );

    }

    public static getInfoFromFirebase(base:"openbaar"|"beveiligd", ...segments:string[]):Promise<FileInfo> {
        return new Promise((resolve, reject) => {
            if (base === "beveiligd" && !this.CAN_DOWNLOAD_PROTECTED_ATTACHMENTS) {
                reject(new Error("Geen toegang tot bestand", { cause: "missing permissions" }));
            }
            else {
                const fullPath = [base, ...segments].join('/');
                const fileRef = ref(STORAGE, fullPath);

                Promise.all([getMetadata(fileRef), getDownloadURL(fileRef)])
                .then(([metadata, downloadUrl]) => {
                    resolve({
                        href: downloadUrl,
                        name: metadata.name,
                        contentType: metadata.contentType ?? "unknown/unknown",
                        fileType: FileType.fromContentType(metadata.contentType ?? "unknown/unknown"),
                        size: metadata.size,
                        lastModified: new Date(metadata.updated)
                    });
                })
                .catch(err => {
                    if (err instanceof StorageError) switch(err.code) {
                        case "storage/object-not-found":
                            reject(new Error("Kan bestand niet vinden", { cause: "not found" }));
                            break;
                        case "storage/unauthorized":
                            reject(new Error("Geen toegang tot bestand", { cause: "missing permissions" }));
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

Loading.onDOMContentLoaded().then(() => customElements.define("multisource-attachment", MultisourceAttachment));

class AttachmentQueryError extends Error {

    constructor(cause:string, message:string) {
        super(cause);
    }

}