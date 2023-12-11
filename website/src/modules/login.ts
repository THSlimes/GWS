// Code for the login page

import "./header-and-footer";
import "./create-split-view";

import { UserCredential, browserLocalPersistence, browserSessionPersistence, signInWithEmailAndPassword } from "@firebase/auth";
import { AUTH } from "../common/firebase/init-firebase";
import { showError, showWarning } from "../common/ui/info-messages";
import getErrorMessage from "../common/firebase/authentication/error-messages";
import { redirectIfLoggedIn } from "../common/firebase/authentication/auth-based-redirect";
import { isLocalUrl } from "../common/util/UrlUtil";

redirectIfLoggedIn("/", true); // can't log in when already logged in

function login(email:string, password:string, stayLoggedIn:boolean=false) {
    return new Promise<UserCredential>(async (resolve, reject) => {
        // set login persistance
        await AUTH.setPersistence(stayLoggedIn ? browserLocalPersistence : browserSessionPersistence);

        // login
        signInWithEmailAndPassword(AUTH, email, password)
        .then(resolve)
        .catch(reject);
    });
}

window.addEventListener("DOMContentLoaded", () => {
    const EMAIL_INPUT = document.getElementById("login-email") as HTMLInputElement;
    const PASSWORD_INPUT = document.getElementById("login-password") as HTMLInputElement;
    const STAY_LOGGED_IN_CHECKBOX = document.getElementById("stay-logged-in") as HTMLInputElement;

    const LOGIN_BUTTON = document.getElementById("login-button") as HTMLButtonElement;

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
                AUTH.updateCurrentUser(userCred.user)
                .then(() => {
                    localStorage.setItem("loggedIn", "true");
                    const returnUrl = new URLSearchParams(window.location.search).get("return-to");
                    if (returnUrl !== null && isLocalUrl(returnUrl)) location.replace(returnUrl);
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