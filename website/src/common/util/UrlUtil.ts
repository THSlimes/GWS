import DateUtil from "./DateUtil";
import NumberUtil from "./NumberUtil";

export type FileType = FileType.MIMEBaseType | "compressed-folder" | "pdf" | "unknown";
export namespace FileType {
    export type MIMEBaseType = "application" | "audio" | "example" | "font" | "image" | "model" | "text" | "video";
    type MimeType = `${MIMEBaseType}/${string}`;

    const COMPRESSED_FOLDER_MIME_TYPES:MimeType[] = [
        "application/x-freearc",
        "application/x-bzip",
        "application/x-bzip2",
        "application/gzip",
        "application/vnd.rar",
        "application/x-tar",
        "application/zip",
        "application/x-7z-compressed"
    ];
    const PDF_MIME_TYPE:MimeType = "application/pdf";

    export function fromContentType(contentType:string):FileType {
        if (COMPRESSED_FOLDER_MIME_TYPES.some(cpmt => contentType.startsWith(cpmt))) return "compressed-folder";
        else if (contentType.startsWith(PDF_MIME_TYPE)) return "pdf";
        else return contentType.substring(0, contentType.indexOf('/')) as FileType;
    }
}

export interface FileInfo {
    href:string,
    name:string,
    contentType:string,
    fileType:FileType,
    size?:number,
    lastModified?:Date
}

export default abstract class URLUtil {
    public static toURL(link:string|URL):URL {
        if (link instanceof URL) return link;
        try {
            return new URL(link); // is normal url
        }
        catch {
            if (!link) return new URL(location.href);
            else if (link.startsWith('/')) return new URL(location.origin + link); // is absolute path
            else { // is local path
                if (link.startsWith('./')) link = link.substring(2);
        
                const folderPath = location.href.substring(0, location.href.lastIndexOf('/'));
                
                return new URL(`${folderPath}/${link}`);
            }

        }
    }
    
    /**
     * Creates a URL with the `return-to` parameter set.
     * @param link url to link to
     * @param linkBack url to return after action on redirect-page is complete
     * @returns URL with `linkBack` set as the `return-to` parameter
     */
    public static createLinkBackURL(link:string|URL, linkBack:string|URL=location.href):URL {
        link = this.toURL(link);
        linkBack = this.toURL(linkBack);
    
        link.searchParams.append("return-to", linkBack.toString());

        return link;
    }
    
    public static isLocal(link:string|URL) {
        try {
            link = this.toURL(link);
            return link.origin === location.origin;
        }
        catch { return false; }
    }

    public static getType(url:URL|string):Promise<FileType> {
        return new Promise((resolve, reject) => {
            this.getInfo(url)
            .then(info => resolve(info.fileType))
            .catch(reject);
        });
    }

    public static getInfo(link:URL|string):Promise<FileInfo> {
        return new Promise((resolve, reject) => {
            try {
                const url = this.toURL(link);

                const req = new XMLHttpRequest();
                req.timeout = 2500; // 2.5 second timeout
                req.onerror = ev => reject(req.status === 404 ?
                    new Error("Kan bestand niet vinden", { cause: "not found" }) :
                    new Error("Er ging iets mis", { cause: "unknown" })
                );
                req.ontimeout = ev => reject(new Error("Kan bestand niet vinden", { cause: "timeout" }));
                req.onload = () => {
                    if (200 <= req.status && req.status < 300) {
                        
                        const headers = {
                            contentType: req.getResponseHeader("content-type"),
                            contentLength: req.getResponseHeader("content-length"),
                            lastModified: req.getResponseHeader("last-modified")
                        };
                        
                        const href = url.href;
                        const name = url.pathname.substring(url.pathname.lastIndexOf('/') + 1);
                        const contentType = headers.contentType ?? "unknown/unknown";
                        let fileType = FileType.fromContentType(contentType);
                        const size = headers.contentLength && NumberUtil.isInt(headers.contentLength) ? Number.parseInt(headers.contentLength) : undefined;
                        const lastModified = headers.lastModified && DateUtil.Timestamps.isValid(headers.lastModified) ? new Date(headers.lastModified) : undefined;

                        resolve({ href, name, contentType, fileType, size, lastModified });
                    }
                    else reject(new Error("Er ging iets mis", { cause: "unknown" }));
                };
                req.open("HEAD", url, true);
                req.send();
            }
            catch { reject(new Error("URL is ongeldig", { cause: "invalid url" })); }
        });
    }

    /** Gets the key-value pairs stored in the URL hash. */
    public static getHashProperties(url:URL|Location=location):Record<string,string> {
        const pairs = url.hash.substring(1).split(',').filter(s => s.length !== 0);

        const out:Record<string,string> = {};
        for (const p of pairs) {
            const [k, v] = p.split('=');
            out[k] = v;
        }

        return out;
    }

    public static setHashProperty(key:string, value:string|null):string|null {
        console.trace(key, value);
        const pairs = this.getHashProperties();
        const out = pairs[key] ?? null; // get original value

        // assign new value
        if (value === null) delete pairs[key];
        else pairs[key] = value;
        
        let hash = "#";
        for (const k in pairs) hash += (hash.length > 1 ? ',' : "") + `${k}=${pairs[k]}`;
        history.replaceState(null, "", hash);

        return out;
    }

    public static getLinkIcon(link:URL|string):string {
        try {
            const url = URLUtil.toURL(link);
            
            if (!URLUtil.isLocal(url)) return "open_in_new";
            else if (['/', "", "/index"].includes(url.pathname)) return "home";
            else if (url.pathname.startsWith("/inloggen")) return "login";
            else if (url.pathname.startsWith("/artikel")) return "newsmode";
            else if (url.pathname.startsWith("/agenda")) return url.searchParams.has("id") ? "event_note" : "calendar_month";
            else if (url.pathname.startsWith("/administratiepaneel")) return "admin_panel_settings";
            else return "link";

        }
        catch { return "error"; }
    }

}