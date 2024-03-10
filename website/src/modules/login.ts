import "./header-and-footer";

import { UserCredential, browserLocalPersistence, browserSessionPersistence, signInWithEmailAndPassword } from "@firebase/auth";
import { FIREBASE_AUTH } from "../common/firebase/init-firebase";
import { showError, showWarning } from "../common/ui/info-messages";
import getErrorMessage from "../common/firebase/authentication/error-messages";
import { redirectIfLoggedIn } from "../common/firebase/authentication/auth-based-redirect";
import Cache from "../common/Cache";
import URLUtil from "../common/util/URLUtil";
import Loading from "../common/Loading";
import Placeholder from "../common/custom-elements/Placeholder";
import makePhotoCarousel from "../common/ui/photo-carousel";

redirectIfLoggedIn("/", true); // can't log in when already logged in

// photo carousel
Loading.useDynamicContent(makePhotoCarousel("Studievereniging Den Geitenwollen Soc."), carousel => {
    Placeholder.replaceWith("photo-carousel", carousel);
});

function login(email:string, password:string, stayLoggedIn:boolean=false) {
    return new Promise<UserCredential>(async (resolve, reject) => {
        FIREBASE_AUTH.setPersistence(stayLoggedIn ? browserLocalPersistence : browserSessionPersistence) // set login persistance
        .then(() => { // login
            signInWithEmailAndPassword(FIREBASE_AUTH, email, password)
            .then(resolve)
            .catch(reject);
        })
        .catch(reject);
    });
}

Loading.onDOMContentLoaded()
.then(() => {
    // login functionality
    const EMAIL_INPUT = document.getElementById("login-email") as HTMLInputElement;
    const PASSWORD_INPUT = document.getElementById("login-password") as HTMLInputElement;
    const SHOW_PASSWORD_BUTTON = document.getElementById("show-password-button") as HTMLElement;
    const STAY_LOGGED_IN_CHECKBOX = document.getElementById("stay-logged-in") as HTMLInputElement;

    const LOGIN_BUTTON = document.getElementById("login-button") as HTMLButtonElement;

    SHOW_PASSWORD_BUTTON.addEventListener("click", () => {
        SHOW_PASSWORD_BUTTON.toggleAttribute("selected");
        if (SHOW_PASSWORD_BUTTON.toggleAttribute("active")) PASSWORD_INPUT.type = "text";
        else PASSWORD_INPUT.type = "password";
    });

    LOGIN_BUTTON.addEventListener("click", () => { // attempt login
        const email = EMAIL_INPUT.value.trim();
        const password = PASSWORD_INPUT.value.trim();

        if (!email) showWarning("Vul een email-adres in.");
        else if (!password) showWarning("Vul een wachtwoord in.")
        else {
            // prevent login spam
            LOGIN_BUTTON.disabled = true;

            login(email, password, STAY_LOGGED_IN_CHECKBOX.checked)
            .then(userCred => {
                FIREBASE_AUTH.updateCurrentUser(userCred.user)
                .then(() => {
                    Cache.set("is-logged-in", true);
                    const returnUrl = new URLSearchParams(window.location.search).get("return-to");
                    if (returnUrl !== null && URLUtil.isLocal(returnUrl)) location.replace(returnUrl);
                    else location.href = '/';
                }) // redirect to homepage
                .catch(() => showError("Er ging iets mis, probeer het later opnieuw."));
            })
            .catch(err => showError(getErrorMessage(err)))
            .finally(() => {
                setTimeout(() => LOGIN_BUTTON.disabled = false, 1000);
            });
        }
    });

});