import { getAuth, sendPasswordResetEmail } from "@firebase/auth";
import Loading from "../common/Loading";
import { showError, showSuccess } from "../common/ui/info-messages";
import "./header-and-footer";
import getErrorMessage from "../common/firebase/authentication/error-messages";
import { redirectIfLoggedIn } from "../common/firebase/authentication/auth-based-redirect";

redirectIfLoggedIn("/", true); // can't log in when already logged in

/** @see https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript */
const EMAIL_REGEX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

Loading.onDOMContentLoaded()
.then(() => {
    const SEND_EMAIL_BUTTON = document.getElementById("send-email-button") as HTMLButtonElement;
    const EMAIL_INPUT = document.getElementById("email-input") as HTMLInputElement;

    SEND_EMAIL_BUTTON.addEventListener("click", ev => {
        ev.preventDefault();

        const email = EMAIL_INPUT.value.trim();
        if (email) {
            if (EMAIL_REGEX.test(email)) {
                SEND_EMAIL_BUTTON.disabled = true;
                sendPasswordResetEmail(getAuth(), email)
                .then(() => {
                    showSuccess("De email is verstuurd. Check voor de zekerheid ook je spam-box.", 5000);
                    setTimeout(() => location.href = "./login.html", 5000);
                })
                .catch(err => {
                    showError(getErrorMessage(err));
                    SEND_EMAIL_BUTTON.disabled = false;
                });
            }
            else showError("Opgegeven e-mailadres is ongeldig."); // email invalid
        }
        else showError("Vul eerst je e-mailadres in."); // email empty
    });
});