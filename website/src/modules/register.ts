import Loading from "../common/Loading"
import SmartArticle from "../common/custom-elements/SmartArticle";
import ArticleDatabase from "../common/firebase/database/articles/ArticleDatabase";
import { FirestoreArticleDatabase } from "../common/firebase/database/articles/FirestoreArticleDatabase";
import * as IBAN from "iban";

import "./header-and-footer";
import "./create-split-view";
import Placeholder from "../common/custom-elements/Placeholder";
import "../common/custom-elements/Switch";
import MultisourceAttachment from "../common/custom-elements/MultisourceAttachment";
import { onAuth } from "../common/firebase/init-firebase";

const ARTICLE_ID = "Inschrijven-Den-Geitenwollen-Soc";
const DB:ArticleDatabase = new FirestoreArticleDatabase();
Loading.useDynamicContent(DB.getById(ARTICLE_ID), articleInfo => { // load article
    if (!articleInfo) console.error(`article with ID "${ARTICLE_ID}" was now found`);
    else {
        const article = Placeholder.replaceWith("article", new SmartArticle(articleInfo, "full"));
    }
});

// get privacy statement link from storage
Loading.useDynamicContent(MultisourceAttachment.getInfoFromFirebase("openbaar", "privacy-statement.pdf"), fileInfo => {
    const anchorElem = document.getElementById("privacy-statement-link") as HTMLAnchorElement;
    anchorElem.href = fileInfo.href;
});


const LEGAL_NAME_REGEX:RegExp = /^[A-Za-zÀ-öø-ȳ\.]+([ \-`'\/,][A-Za-zÀ-öø-ȳ\.]+)*$/;

/** @see https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript */
const EMAIL_REGEX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const MAX_BIRTH_DATE = new Date();
MAX_BIRTH_DATE.setFullYear(MAX_BIRTH_DATE.getFullYear()-18);

const NUMBER_REGEX = /[0-9]+/;

const BIC_REGEX = /^[A-Z]{4}[A-Z]{2}[0-9A-Z]{2}([0-9A-Z]{3})?$/;

Loading.onDOMContentLoaded({
    "first-name": HTMLInputElement,
    "infix": HTMLInputElement,
    "family-name": HTMLInputElement,
    "email": HTMLInputElement,
    "password": HTMLInputElement,
    "password-min-length": HTMLSpanElement,
    "password-has-capital": HTMLSpanElement,
    "password-has-number": HTMLSpanElement,
    "password-has-special-char": HTMLSpanElement,
    "show-password-button": HTMLElement,
    "confirm-password": HTMLInputElement,
    "show-confirm-password-button": HTMLElement,
    "birth-date": HTMLInputElement,
    "student-number": HTMLInputElement,
    "iban": HTMLInputElement,
    "bic":HTMLInputElement,
    "bank-account-name": HTMLInputElement
})
.then(elements => {
    // show name validity
    elements["first-name"].addEventListener("input", () => {
        elements["first-name"].toggleAttribute("invalid", !LEGAL_NAME_REGEX.test(elements["first-name"].value.trim()))
    });
    elements["infix"].addEventListener("input", () => {
        elements["infix"].toggleAttribute("invalid", !(LEGAL_NAME_REGEX.test(elements["infix"].value.trim()) && elements.infix.value.trim()))
    });
    elements["family-name"].addEventListener("input", () => {
        elements["family-name"].toggleAttribute("invalid", !LEGAL_NAME_REGEX.test(elements["family-name"].value.trim()))
    });

    // show email validity
    elements.email.addEventListener("input", () => {
        elements.email.toggleAttribute("invalid", !EMAIL_REGEX.test(elements.email.value));
    });

    // password validity
    elements.password.addEventListener("input", () => {
        const password = elements.password.value.trim();
        const isMinLength = password.length >= 8;
        elements["password-min-length"].toggleAttribute("invalid", !isMinLength);
        const hasCapital = password.split("").some(c => /[A-ZÀ-öø-ȳ]/.test(c) && c === c.toLocaleUpperCase());
        elements["password-has-capital"].toggleAttribute("invalid", !hasCapital);
        const hasNumber = /[0-9]/.test(password);
        elements["password-has-number"].toggleAttribute("invalid", !hasNumber);
        const hasSpecialChar = !/^[a-zA-Z0-9]*$/.test(password);
        elements["password-has-special-char"].toggleAttribute("invalid", !hasSpecialChar);

        elements.password.toggleAttribute("invalid", [isMinLength, hasCapital, hasNumber, hasSpecialChar].some(req => !req));
    });

    // show password
    elements["show-password-button"].addEventListener("click", () => {
        elements.password.type = elements["show-password-button"].toggleAttribute("selected") ? "text" : "password";
    });

    // check password equality
    elements["confirm-password"].addEventListener("input", () => {
        elements["confirm-password"].toggleAttribute("invalid", elements["confirm-password"].value.trim() !== elements.password.value.trim());
    });

    // show confirmation password
    elements["show-confirm-password-button"].addEventListener("click", () => {
        elements["confirm-password"].type = elements["show-confirm-password-button"].toggleAttribute("selected") ? "text" : "password";
    });

    // members must be at least 18 years old
    let max = MAX_BIRTH_DATE.toISOString();
    max = max.substring(0, max.indexOf('T'));
    elements["birth-date"].max = max;
    elements["birth-date"].addEventListener("change", () => {
        if (elements["birth-date"].valueAsNumber > MAX_BIRTH_DATE.getTime()) {
            let newValue = MAX_BIRTH_DATE.toISOString();
            newValue = newValue.substring(0, newValue.indexOf('T'))
            elements["birth-date"].value = newValue;
        }
    });

    // student numbers must start with an 'S', followed by numbers
    elements["student-number"].addEventListener("input", () => {
        const oldValue = elements["student-number"].value;
        elements["student-number"].value = 'S' + oldValue.split("").filter(c => NUMBER_REGEX.test(c)).join("");
    });

    // check IBAN validity
    elements.iban.addEventListener("input", () => elements.iban.toggleAttribute("invalid", !IBAN.isValid(elements.iban.value)));

    // check BIC code validity
    elements.bic.addEventListener("input", () => {
        elements.bic.value = elements.bic.value.toUpperCase();
        elements.bic.toggleAttribute("invalid", !BIC_REGEX.test(elements.bic.value));
    });

    // check card holder name validity
    elements["bank-account-name"].addEventListener("input", () => {
        elements["bank-account-name"].toggleAttribute("invalid", !LEGAL_NAME_REGEX.test(elements["bank-account-name"].value.trim()));
    });
})
.catch(console.error);