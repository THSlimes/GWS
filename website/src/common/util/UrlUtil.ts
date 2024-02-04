type MIMEBaseType = "application" | "audio" | "example" | "font" | "image" | "model" | "text" | "video";

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

    public static getType(url:URL|string):Promise<MIMEBaseType | "unknown"> {
        return new Promise((resolve, reject) => {
            try { url = this.toURL(url); }
            catch { reject("INVALID URL"); }

            const req = new XMLHttpRequest();
            req.timeout = 2500; // 2.5 second timeout
            req.onerror = ev => reject("REQUEST ERROR: UNKNOWN");
            req.ontimeout = ev => reject("REQUEST ERROR: TIMEOUT");
            req.onload = () => {
                if (200 <= req.status && req.status < 300) {
                    const contentType = req.getResponseHeader("Content-Type") ?? "unknown/unknown";
                    resolve(contentType.substring(0, contentType.indexOf('/')) as MIMEBaseType | "unknown");
                }
                else reject(`REQUEST ERROR: ${req.statusText}`);
            };
            req.open("HEAD", url, true);
            req.send();
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