import * as logger from "firebase-functions/logger";
import * as scheduler from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
admin.initializeApp();
const firestore = admin.firestore();
const auth = admin.auth();

export const revokeNonMemberPermissions = scheduler.onSchedule("every day 00:00", () => {
    return new Promise((resolve, reject) => {
        logger.log("Removing non-member permissions...");

        firestore.collection("users") // get non-member users with permissions
        .where("member_until", "<", admin.firestore.Timestamp.now())
        .get()
        .then(res => {
            const updatePromises:Promise<admin.firestore.WriteResult>[] = [];
            const userIDs:string[] = [];
            res.forEach(doc => {
                if (doc.data().permissions.length !== 0) {
                    updatePromises.push(doc.ref.update({ permissions: [] }));
                    userIDs.push(doc.id);
                }
            });

            Promise.all(updatePromises)
            .then(() => {
                logger.log("Removed permissions from non-members:", userIDs);
                resolve();
            })
            .catch(reject);
        })
        .catch(reject);
    });
});

/** Number of days someone has to not be a member for their data to be deleted. */
const DAYS_BEFORE_DELETION = 365;
export const deleteOldMembers = scheduler.onSchedule("1 of month 00:00", () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_BEFORE_DELETION);

    logger.log(`Deleting old users (from before ${cutoffDate.toString()})...`);

    return new Promise((resolve, reject) => {
        firestore.collection("users") // get long-time non-members
        .where("member_until", "<", admin.firestore.Timestamp.fromDate(cutoffDate))
        .get()
        .then(res => {
            const deletePromises:Promise<any>[] = [];
            const userIDs:string[] = [];

            res.forEach(doc => {
                userIDs.push(doc.id);
                deletePromises.push(doc.ref.delete()); // delete DB entry
            });
            if (userIDs.length !== 0) deletePromises.push(auth.deleteUsers(userIDs)); // delete user accounts

            if (userIDs.length === 0) {
                logger.log("No old users to delete");
                resolve();
            }
            else Promise.all(deletePromises)
            .then(() => {
                logger.log("Deleted old users:", userIDs);
                resolve();
            })
            .catch(reject);
        })
        .catch(reject);
    });
});