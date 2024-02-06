import { getDownloadURL, getMetadata, ref } from "@firebase/storage";
import { checkPermissions } from "../authentication/permission-based-redirect";
import Permission from "../database/Permission";
import { STORAGE } from "../init-firebase";
import { FileInfo, getFileType } from "../../util/URLUtil";

export default abstract class Attachments {

    private static CAN_DOWNLOAD = false;
    static {
        checkPermissions(Permission.DOWNLOAD_ATTACHMENTS, hasPerms => this.CAN_DOWNLOAD = hasPerms, true, true);
    }

    public static getInfo(base:string, ...segments:string[]):Promise<FileInfo> {
        return new Promise((resolve, reject) => {
            if (!this.CAN_DOWNLOAD) reject("MISSING DOWNLOAD PERMISSIONS");
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