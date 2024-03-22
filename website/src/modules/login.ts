import "./header-and-footer";

import { UserCredential, browserLocalPersistence, browserSessionPersistence, signInWithEmailAndPassword } from "@firebase/auth";
import { FIREBASE_AUTH, onAuth } from "../common/firebase/init-firebase";
import getErrorMessage from "../common/firebase/authentication/error-messages";
import { redirectIfLoggedIn } from "../common/firebase/authentication/auth-based-redirect";
import Cache from "../common/Cache";
import URLUtil from "../common/util/URLUtil";
import Loading from "../common/Loading";
import Placeholder from "../common/custom-elements/Placeholder";
import makePhotoCarousel from "../common/ui/photo-carousel";
import UserFeedback from "../common/ui/UserFeedback";

redirectIfLoggedIn("/", true); // can't log in when already logged in

// photo carousel
Loading.useDynamicContent(makePhotoCarousel("Studievereniging Den Geitenwollen Soc."), carousel => {
    Placeholder.replaceWith("photo-carousel", carousel);
});

function login(email:string, password:string, stayLoggedIn:boolean=false) {
    return new Promise<UserCredential>(async (resolve, reject) => {
        FIREBASE_AUTH.setPersistence(browserLocalPersistence) // set login persistance
        .then(() => { // login
            signInWithEmailAndPassword(FIREBASE_AUTH, email, password)
            .then(user => {
                Cache.set("do-login-expiry", !stayLoggedIn);
                resolve(user);
            })
            .catch(reject);
        })
        .catch(reject);
    });
}

Loading.onDOMContentLoaded({
    "login-email": HTMLInputElement,
    "login-password": HTMLInputElement,
    "show-password-button": HTMLElement,
    "stay-logged-in": HTMLInputElement,
    "login-button": HTMLButtonElement
})
.then(elements => { // login functionality
    elements["show-password-button"].addEventListener("click", () => {
        elements["show-password-button"].toggleAttribute("selected");
        if (elements["show-password-button"].toggleAttribute("active")) elements["login-password"].type = "text";
        else elements["login-password"].type = "password";
    });

    elements["login-button"].addEventListener("click", () => { // attempt login
        const email = elements["login-email"].value.trim();
        const password = elements["login-password"].value.trim();

        if (!email) UserFeedback.warning("Vul een e-mailadres in.");
        else if (!password) UserFeedback.warning("Vul een wachtwoord in.")
        else {
            // prevent login spam
            elements["login-button"].disabled = true;

            login(email, password, elements["stay-logged-in"].checked)
            .then(userCred => {
                FIREBASE_AUTH.updateCurrentUser(userCred.user)
                .then(() => {
                    Cache.set("is-logged-in", true, elements["stay-logged-in"].checked ? undefined : Date.now() + 60000);
                    const returnUrl = new URLSearchParams(window.location.search).get("return-to");
                    if (returnUrl !== null && URLUtil.isLocal(returnUrl)) location.replace(returnUrl);
                    else location.href = '/';
                }) // redirect to homepage
                .catch(() => UserFeedback.error("Er ging iets mis, probeer het later opnieuw."));
            })
            .catch(err => UserFeedback.error(getErrorMessage(err)))
            .finally(() => {
                setTimeout(() => elements["login-button"].disabled = false, 1000);
            });
        }
    });

});