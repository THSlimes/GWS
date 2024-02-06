import DateUtil from "./DateUtil";
import NumberUtil from "./NumberUtil";

type MIMEBaseType = "application" | "audio" | "example" | "font" | "image" | "model" | "text" | "video";
type MimeType = `${MIMEBaseType}/${string}`;
export type FileType = MIMEBaseType | "compressed-folder" | "pdf" | "unknown";
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

export interface FileInfo {
    href:string,
    name:string,
    contentType:string,
    fileType:FileType,
    size?:number,
    lastModified?:Date
}

export default abstract class URLUtil {
    private static toURL(link:string|URL):URL {
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
            link.origin === location.origin;
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
                req.onerror = ev => reject("REQUEST ERROR: UNKNOWN");
                req.ontimeout = ev => reject("REQUEST ERROR: TIMEOUT");
                req.onload = () => {
                    if (200 <= req.status && req.status < 300) {
                        console.log(req.getAllResponseHeaders());

                        const headers = {
                            contentType: req.getResponseHeader("content-type"),
                            contentLength: req.getResponseHeader("content-length"),
                            lastModified: req.getResponseHeader("last-modified")
                        };
                        
                        const href = url.href;
                        const name = url.pathname.substring(url.pathname.lastIndexOf('/') + 1);
                        const contentType = headers.contentType ?? "unknown/unknown";
                        let fileType:FileType;
                        if (COMPRESSED_FOLDER_MIME_TYPES.some(cpmt => contentType.startsWith(cpmt))) fileType = "compressed-folder";
                        else if (contentType.startsWith(PDF_MIME_TYPE)) fileType = "pdf";
                        else fileType = contentType.substring(0, contentType.indexOf('/')) as FileType;

                        const size = headers.contentLength && NumberUtil.isInt(headers.contentLength) ? Number.parseInt(headers.contentLength) : undefined;
                        const lastModified = headers.lastModified && DateUtil.Timestamps.isValid(headers.lastModified) ? new Date(headers.lastModified) : undefined;

                        resolve({ href, name, contentType, fileType, size, lastModified });
                    }
                    else reject(`REQUEST ERROR: ${req.statusText}`);
                };
                req.open("HEAD", url, true);
                req.send();
            }
            catch { reject("INVALID URL"); }
        });
    }

    /** Gets the key-value pairs stored in the URL hash. */
    public static getHashProperties(url:URL|Location=location):Record<string,string> {
        const pairs = url.hash.substring(1).split(',');

        const out:Record<string,string> = {};
        for (const p of pairs) {
            const [k, v] = p.split('=');
            out[k] = v;
        }

        return out;
    }

    public static setHashProperty(key:string, value:string|null):string|null {
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

}