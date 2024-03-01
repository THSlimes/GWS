export type LinkTree = { [name:string]: string | LinkTree };

/**
 * The SettingsDatabase class provides a way to retrieve site-wide settings
 * from a remote data storage.
 */
export default abstract class SettingsDatabase {

    abstract getNavbarLinks():Promise<LinkTree>;
    abstract setNavbarLinks(newLinks:LinkTree):Promise<void>;

}