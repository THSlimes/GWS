import { collection, doc, documentId, getCountFromServer, getDoc, getDocs, limit, orderBy, query, QueryConstraint, QueryDocumentSnapshot, Timestamp, where, writeBatch } from "@firebase/firestore";
import { FIRESTORE } from "../../init-firebase";
import IBSubmissionDatabase, { IBSubmissionInfo, IBSubmissionQueryFilter } from "./IBSubmissionDatabase";

class FirestoreIBSubmissionDatabase extends IBSubmissionDatabase {

    private static readonly COLLECTION = collection(FIRESTORE, "idea-box-submissions").withConverter({
        toFirestore(submission:IBSubmissionInfo):FirestoreIBSubmissionDatabase.IBSubmission {
            return {
                author: submission.author,
                created_at: Timestamp.fromDate(submission.created_at),
                subject: submission.subject,
                body: submission.body
            };
        },
        fromFirestore(snapshot: QueryDocumentSnapshot<FirestoreIBSubmissionDatabase.IBSubmission, IBSubmissionInfo>):IBSubmissionInfo {
            const data = snapshot.data();
            
            return new IBSubmissionInfo(
                snapshot.id,
                data.author,
                data.created_at.toDate(),
                data.subject,
                data.body
            );
        }
    });

    
    override get(options?: IBSubmissionQueryFilter | undefined): Promise<IBSubmissionInfo[]> {
        return FirestoreIBSubmissionDatabase.getSubmissions({ ...options });
    }

    override count(options?:IBSubmissionQueryFilter): Promise<number> {
        return FirestoreIBSubmissionDatabase.getSubmissions({ ...options }, true);
    }

    override doWrite(...records:IBSubmissionInfo[]): Promise<number> {
        const batch = writeBatch(FIRESTORE);
        for (const rec of records) {
            batch.set(doc(FIRESTORE, "idea-box-submissions", rec.id), FirestoreIBSubmissionDatabase.COLLECTION.converter!.toFirestore(rec));
        }

        return batch.commit()
            .then(() => records.length);
    }

    override doDelete(...records:IBSubmissionInfo[]): Promise<number> {
        const batch = writeBatch(FIRESTORE);
        for (const rec of records) batch.delete(doc(FIRESTORE, "idea-box-submissions", rec.id));
        
        return batch.commit()
            .then(() => records.length);
    }

    public override getById(id:string):Promise<IBSubmissionInfo|undefined> {
        const docRef = doc(FirestoreIBSubmissionDatabase.COLLECTION, id);
        return getDoc(docRef)
            .then(snapshot => snapshot.exists() ? snapshot.data() : undefined);
    }

    private static getSubmissions(options:IBSubmissionQueryFilter, doCount?: false): Promise<IBSubmissionInfo[]>;
    private static getSubmissions(options:IBSubmissionQueryFilter, doCount?: true): Promise<number>;
    private static getSubmissions(options:IBSubmissionQueryFilter, doCount = false): Promise<IBSubmissionInfo[] | number> {
        const constraints: QueryConstraint[] = []; // convert options into constraints

        // general
        if (options.limit) constraints.push(limit(options.limit));
        if (options.id) constraints.push(where(documentId(), "==", options.id));
        if (options.notId) constraints.push(where(documentId(), "!=", options.notId));

        // article-specific
        if (options.sortByCreatedAt) constraints.push(orderBy("created_at", options.sortByCreatedAt === "ascending" ? "asc" : "desc"));
        if (options.before) constraints.push(where("created_at", '<', Timestamp.fromDate(options.before)));
        if (options.after) constraints.push(where("created_at", '>', Timestamp.fromDate(options.after)));
        if (options.isAnonymous !== undefined) constraints.push(where("author", options.isAnonymous ? "==" : "!=", "anonymous"));

        const q = query(this.COLLECTION, ...constraints); // create query
        return doCount ?
            getCountFromServer(q)
                .then(res => res.data().count) :
            getDocs(q)
            .then(snapshot => {
                const out:IBSubmissionInfo[] = [];
                snapshot.forEach(doc => out.push(doc.data()));
                return out;
            });
    }
}

namespace FirestoreIBSubmissionDatabase {
    export interface IBSubmission {
        author:"anonymous" | { id:string, name:string },
        created_at:Timestamp,
        subject:string,
        body:string
    }
}

export default FirestoreIBSubmissionDatabase;