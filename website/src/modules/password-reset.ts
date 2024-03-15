import { sendPasswordResetEmail } from "@firebase/auth";
import Loading from "../common/Loading";
import "./header-and-footer";
import getErrorMessage from "../common/firebase/authentication/error-messages";
import { redirectIfLoggedIn } from "../common/firebase/authentication/auth-based-redirect";
import { FIREBASE_AUTH } from "../common/firebase/init-firebase";
import UserFeedback from "../common/ui/UserFeedback";

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
                sendPasswordResetEmail(FIREBASE_AUTH, email)
                .then(() => {
                    UserFeedback.success("De email is verstuurd. Check voor de zekerheid ook je spam-box.", 5000);
                    setTimeout(() => location.href = "./login.html", 5000);
                })
                .catch(err => {
                    UserFeedback.error(getErrorMessage(err));
                    SEND_EMAIL_BUTTON.disabled = false;
                });
            }
            else UserFeedback.error("Opgegeven e-mailadres is ongeldig."); // email invalid
        }
        else UserFeedback.error("Vul eerst je e-mailadres in."); // email empty
    });
});