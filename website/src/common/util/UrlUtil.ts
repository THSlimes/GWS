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
    
    public static createLinkBackURL(link:string|URL, linkBack:string|URL=location.href):URL {
        link = typeof link === "string" ? this.linkToURL(link) : new URL(link.toString());
        if (typeof linkBack === "string") linkBack = this.linkToURL(linkBack);
    
        link.searchParams.append("return-to", linkBack.toString());

        return link;
    }
    
    public static isLocalUrl(link:string|URL) {
        if (typeof link === "string") link = this.linkToURL(link);
        return link.origin === location.origin;
    }
}