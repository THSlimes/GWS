type ServicePrefix = "auth";
type ErrorCode = `${ServicePrefix}/${string}`;

const ERROR_MESSAGES:Record<ErrorCode,string> = {
    "auth/invalid-login-credentials": "Onjuiste inloggegevens, check je email-adres en/of wachtwoord.",
    "auth/email-already-exists": "Er is al een account geregistreerd met dat email-adres, gebruik a.u.b. een andere.",
    "auth/insufficient-permission": "Je hebt geen toestemming om dit te doen.",
    "auth/invalid-email": "Het gegeven email-adres is ongeldig.",
    "auth/too-many-requests": "Te veel inlogpogingen, probeer het later opnieuw."
};

/** Translates an error-code into a user-friendly error message. */
export default function getErrorMessage(code?:string):string {
    return ERROR_MESSAGES[code as ErrorCode] ?? "Er ging iets mis, probeer het later opnieuw.";
}