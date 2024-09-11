import Loading from "../common/Loading";
import "./header-and-footer";
import { FIREBASE_AUTH } from "../common/firebase/init-firebase";
import UserFeedback from "../common/ui/UserFeedback";
import getErrorMessage from "../common/firebase/authentication/error-messages";
import { signInWithEmailAndPassword, verifyBeforeUpdateEmail } from "@firebase/auth";


/** @see https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript */
const EMAIL_REGEX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

Loading.onDOMContentLoaded({
    "current-email-input": HTMLInputElement,
    "password-input": HTMLInputElement,

    "new-email-confirmation-input": HTMLInputElement,
    "new-email-input": HTMLInputElement,

    "update-email-button": HTMLButtonElement,
})
    .then(elements => {
        elements["update-email-button"].addEventListener("click", ev => {
            ev.preventDefault();

            const currentEmail = elements["current-email-input"].value.trim();
            const password = elements["password-input"].value.trim();

            const newEmail = elements["new-email-input"].value.trim();
            const newEmailConfirmation = elements["new-email-confirmation-input"].value.trim();

            if (!currentEmail) UserFeedback.error("Vul je huidige e-mailadres in."); // no current email given
            else if (!password) UserFeedback.error("Vul je wachtwoord in."); // no password given
            if (!newEmail) UserFeedback.error("Vul een nieuw e-mailadres in."); // no new email given
            else if (!newEmailConfirmation) UserFeedback.error("Vul het nieuwe e-mailadres nogmaals in."); // no new email confirmation given
            else if (!EMAIL_REGEX.test(newEmail)) UserFeedback.error("Het nieuwe e-mailadres is ongeldig."); // new email is invalid
            else if (newEmail !== newEmailConfirmation) UserFeedback.error("Herhaal-email is niet hetzelfde."); // new email confirmation does not match
            else {
                elements["update-email-button"].disabled = true;

                signInWithEmailAndPassword(FIREBASE_AUTH, currentEmail, password)
                    .then(userCredential => verifyBeforeUpdateEmail(userCredential.user, newEmail))
                    .then(() => {
                        UserFeedback.success("De bevestigings-e-mail is verstuurd!");
                        setTimeout(() => location.href = '/', 5000);
                    })
                    .catch(err => {
                        UserFeedback.error(getErrorMessage(err));
                        elements["update-email-button"].disabled = false;
                    });
            }
        });
    });