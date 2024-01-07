import { FirebaseError } from "firebase/app";

const DEFAULT_ERROR_MESSAGE = "Er ging iets mis, probeer het later opnieuw.";
const ERROR_MESSAGES = {
    "auth/invalid-login-credentials": "Onjuiste inloggegevens, check je email-adres en/of wachtwoord.",
    "auth/email-already-exists": "Er is al een account geregistreerd met dat email-adres, gebruik a.u.b. een andere.",
    "auth/insufficient-permission": "Je hebt geen toestemming om dit te doen.",
    "auth/invalid-email": "Het gegeven email-adres is ongeldig.",
    "auth/too-many-requests": "Te veel inlogpogingen, probeer het later opnieuw.",

    "already-exists": "Bestand bestaat al.",
    "cancelled": "Geannuleerd.",
    "not-found": "Het opgevraagde bestand bestaat niet (meer).",
    "permission-denied": "Je bent niet gemachtigd om dit uit te voeren.",
    "unauthenticated": "Je identiteit kon niet geverifieerd worden. Probeer (opnieuw) in te loggen.",
    "unavailable": "Onze database is momenteel niet beschikbaar, probeer het later opnieuw.",
    "unknown": DEFAULT_ERROR_MESSAGE,
};
type ErrorCode = keyof typeof ERROR_MESSAGES;

/** Translates an error-code into a user-friendly error message. */
export default function getErrorMessage(err?:any):string {
    if (!err || !(err instanceof FirebaseError)) return DEFAULT_ERROR_MESSAGE;
    return err.code in ERROR_MESSAGES ? ERROR_MESSAGES[err.code as ErrorCode] : DEFAULT_ERROR_MESSAGE
}

export function runOnErrorCode(expectedCode:ErrorCode, funct:(err:FirebaseError)=>void):(err?:FirebaseError)=>void {
    return (err) => {
        if (err && err instanceof FirebaseError && err.code === expectedCode) funct(err);
    }
}