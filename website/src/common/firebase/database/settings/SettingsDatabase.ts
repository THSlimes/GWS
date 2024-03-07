import { AttachmentOrigin } from "../../../custom-elements/MultisourceAttachment";

export type LinkTree = { [name:string]: string | LinkTree };
export namespace LinkTree {
    function getPairs(links:LinkTree):[string,string][] {
        const out:[string,string][] = [];
        for (const name in links) {
            const val = links[name];
            if (typeof val === "string") out.push([name, val]);
            else out.push(...getPairs(val));
        }
        return out;
    }

    export function search(links:LinkTree, query:string):[string,string][] {
        const pairs = getPairs(links);
        return pairs
        .filter(p => {
            const lcName = p[0].toLowerCase();
            const lcQuery = query.toLowerCase();
            return lcName.includes(lcQuery) || lcQuery.includes(lcName);
        })
        .sort((a,b) => a[0].localeCompare(b[0]));
    }
}

export type ImagedLink = { name:string, origin:AttachmentOrigin, src:string, href:string };

/**
 * The SettingsDatabase class provides a way to retrieve site-wide settings
 * from a remote data storage.
 */
export default abstract class SettingsDatabase {

    abstract getNavbarLinks():Promise<LinkTree>;
    abstract setNavbarLinks(newLinks:LinkTree):Promise<void>;

    abstract getSponsorLinks():Promise<ImagedLink[]>;
    abstract setSponsorLinks(links:ImagedLink[]):Promise<void>;

    abstract getSocialMediaLinks():Promise<ImagedLink[]>;
    abstract setSocialMediaLinks(links:ImagedLink[]):Promise<void>;

}