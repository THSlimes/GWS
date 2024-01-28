export default abstract class URLUtil {
    private static linkToURL(link:string):URL {
        try {
            return new URL(link); // is normal url
        }
        catch {
            if (link.startsWith('/')) return new URL(location.origin + link); // is absolute path
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
        link = typeof link === "string" ? this.linkToURL(link) : new URL(link.toString());
        if (typeof linkBack === "string") linkBack = this.linkToURL(linkBack);
    
        link.searchParams.append("return-to", linkBack.toString());

        return link;
    }
    
    public static isLocal(link:string|URL) {
        if (typeof link === "string") link = this.linkToURL(link);
        return link.origin === location.origin;
    }

    /** Gets the key-value pairs stored in the URL hash. */
    public static getHashProperties():Record<string,string> {
        const pairs = location.hash.substring(1).split(',');

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