import EventDatabase from "./EventDatabase";
import FirestoreEventDatebase from "./FirestoreEventDatabase";

abstract class EventDatabaseFactory {

    private constructor() { /** Prevent extension */ }

    public static firebase() { return new FirestoreEventDatebase(); }

    public static fromOrigin(origin:EventDatabaseFactory.Origin):EventDatabase {
        switch (origin) {
            case EventDatabaseFactory.Origin.FIREBASE: return this.firebase();
            default: throw new Error(`can't construct EventDatabase from origin "${origin}".`);
        }
    }

}

namespace EventDatabaseFactory {
    export enum Origin {
        FIREBASE = "firebase"
    }
}

export default EventDatabaseFactory;