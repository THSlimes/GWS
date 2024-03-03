import { AttachmentOrigin } from "../../../custom-elements/MultisourceAttachment";

export type LinkTree = { [name:string]: string | LinkTree };

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