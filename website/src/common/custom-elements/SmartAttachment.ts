import { getDownloadURL, getMetadata, ref } from "@firebase/storage";
import { checkPermissions } from "../firebase/authentication/permission-based-redirect";
import Permission from "../firebase/database/Permission";
import { STORAGE } from "../firebase/init-firebase";
import URLUtil, { FileInfo, FileType, getFileType } from "../util/URLUtil";
import ElementUtil, { HasSections } from "../util/ElementUtil";
import ElementFactory from "../html-element-factory/ElementFactory";

export type AttachmentSource = "firebase-storage" | "external";

export default class SmartAttachment extends HTMLElement implements HasSections<"filetypeIcon"|"fileNameLabel"|"fileSizeLabel"|"downloadButton"> {

    private static CAN_DOWNLOAD_FROM_FIREBASE = false;
    static {
        checkPermissions(Permission.DOWNLOAD_ATTACHMENTS, hasPerms => this.CAN_DOWNLOAD_FROM_FIREBASE = hasPerms, true, true);
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

    private _src:AttachmentSource;
    /** Location where data is queried from. */
    public get src() { return this._src; }
    public set src(newSrc:AttachmentSource) {
        if (newSrc !== this._src) {
            this._src = newSrc;
            this.setAttribute("src", newSrc);
            this.refresh();
        }
    }

    private _href:string;
    /** Link/path to the attachment file. */
    public get href() { return this._href; }
    public set href(newHref:string) {
        if (newHref !== this._href) {
            this._href = newHref;
            this.setAttribute("href", newHref);
            this.refresh();
        }
    }

    private refresh():Promise<void> {
        const infoPromise = this.src === "firebase-storage" ?
            SmartAttachment.getInfoFromFirebase(this.href) :
            URLUtil.getInfo(this.href);

        return new Promise((resolve, reject) => {
            infoPromise.then(info => {
                this.classList.remove("error");

                this.filetypeIcon.textContent = SmartAttachment.FILE_TYPE_ICONS[info.fileType];
                this.fileNameLabel.textContent = info.name;
                this.fileSizeLabel.textContent = info.size ? SmartAttachment.getFileSizeString(info.size) : "";
                this.downloadButton.textContent = "download";
                this.downloadButton.title = "Bestand downloaden";
                this.downloadButton.classList.add("click-action")
                this.downloadButton.setAttribute("href", info.href);
                this.downloadButton.setAttribute("download", "");
            })
            .catch(err => {
                this.classList.add("error");

                this.filetypeIcon.textContent = "error";
                this.fileNameLabel.textContent = "Kan bestand niet vinden";
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

    constructor(source?:AttachmentSource, href?:string) {
        super();

        this.initElement();

        this._src = source ?? ElementUtil.getAttrAs(this, "src", str => str === "firebase-storage" || str === "external") ?? "firebase-storage";
        this._href = source ?? this.getAttribute("href") ?? "";
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

    private static getInfoFromFirebase(base:string, ...segments:string[]):Promise<FileInfo> {
        return new Promise((resolve, reject) => {
            if (!this.CAN_DOWNLOAD_FROM_FIREBASE) reject("MISSING DOWNLOAD PERMISSIONS");
            else {
                const fullPath = "attachments/" + [base, ...segments].join('/');
                const fileRef = ref(STORAGE, fullPath);

                Promise.all([getMetadata(fileRef), getDownloadURL(fileRef)])
                .then(([metadata, downloadUrl]) => {
                    resolve({
                        href: downloadUrl,
                        name: metadata.name,
                        contentType: metadata.contentType ?? "unknown/unknown",
                        fileType: getFileType(metadata.contentType ?? "unknown/unknown"),
                        size: metadata.size,
                        lastModified: new Date(metadata.updated)
                    });
                })
                .catch(reject);
            }
        });
    }

}

customElements.define("smart-attachment", SmartAttachment);