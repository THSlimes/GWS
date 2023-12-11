
const LOCAL__URI_PATH_REGEX = /^(\.\/)?([a-zA-Z0-9]*\/[a-zA-Z0-9\.]*)+$/g;
function linkToURL(link:string):URL {
    if (link.startsWith('/')) return new URL(location.origin + link); // is absolute path
    else if (LOCAL__URI_PATH_REGEX.test(link)) return new URL(`${location.origin}/${link}`); // is local path
    else return new URL(link);
}

export function createLinkBackURL(link:string|URL, linkBack:string|URL):URL {
    link = typeof link === "string" ? linkToURL(link) : new URL(link);
    if (typeof linkBack === "string") linkBack = linkToURL(linkBack);

    link.searchParams.append("return-to", linkBack.toString());
    return link;
}

export function isLocalUrl(link:string|URL) {
    if (typeof link === "string") link = linkToURL(link);
    return link.origin === location.origin;
}