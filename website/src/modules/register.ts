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



/** @see https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript */
const EMAIL_REGEX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const MAX_BIRTH_DATE = new Date();
MAX_BIRTH_DATE.setFullYear(MAX_BIRTH_DATE.getFullYear()-18);

const NUMBER_REGEX = /[0-9]+/;

const BIC_REGEX = /^[A-Z]{4}[A-Z]{2}[0-9A-Z]{2}([0-9A-Z]{3}){0,1}$/;

Loading.onDOMContentLoaded({ "email": HTMLInputElement, "birth-date": HTMLInputElement, "student-number": HTMLInputElement, "iban": HTMLInputElement, "bic":HTMLInputElement })
.then(elements => {
    // show email validity
    elements.email.addEventListener("input", () => {
        elements.email.toggleAttribute("invalid", !EMAIL_REGEX.test(elements.email.value));
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
})
.catch(console.error);