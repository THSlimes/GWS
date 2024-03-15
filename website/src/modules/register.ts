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
import Switch from "../common/custom-elements/Switch";

// loading associated article
const ARTICLE_ID = "Inschrijven-Den-Geitenwollen-Soc";
const DB:ArticleDatabase = new FirestoreArticleDatabase();
Loading.useDynamicContent(DB.getById(ARTICLE_ID), articleInfo => { // load article
    if (!articleInfo) console.error(`article with ID "${ARTICLE_ID}" was now found`);
    else Placeholder.replaceWith("article", new SmartArticle(articleInfo, "full"));
});

// get privacy statement link from storage
Loading.useDynamicContent(MultisourceAttachment.getInfoFromFirebase("openbaar", "privacy-statement.pdf"), fileInfo => {
    const anchorElem = document.getElementById("privacy-statement-link") as HTMLAnchorElement;
    anchorElem.href = fileInfo.href;
});



interface RegistrationFormData {
    name: { first_name:string, infix:string, family_name:string },
    email:string,
    password: { password:string, confirmation:string },
    phone_number:string,
    birth_date:Date|null,
    study:string,
    student_number:string,
    bank_account: { iban:string, bic:string, holder:string }
    allow_social_media: { public:boolean, private:boolean },
    receive_news_letter:boolean,
    add_to_whatsapp:boolean,
    accept_privacy_statement:boolean,
    allow_auto_transactions:boolean
}

let getFormData:()=>RegistrationFormData = () => { throw new Error("function to be implemented after load."); }

const FORM_INPUTS_QUERY = {
    "first-name": HTMLInputElement,
    "infix": HTMLInputElement,
    "family-name": HTMLInputElement,
    "email": HTMLInputElement,
    "password": HTMLInputElement,
    "confirm-password": HTMLInputElement,
    "phone-number": HTMLInputElement,
    "birth-date": HTMLInputElement,
    "study": HTMLInputElement,
    "student-number": HTMLInputElement,
    "iban": HTMLInputElement,
    "bic": HTMLInputElement,
    "bank-account-name": HTMLInputElement,
    "receive-news-letter": Switch,
    "allow-public-photos": Switch,
    "allow-private-photos": Switch,
    "add-to-whatsapp": Switch,
    "accept-privacy-statement": Switch,
    "allow-bank-transactions": Switch
};
Loading.onDOMContentLoaded(FORM_INPUTS_QUERY)
.then(elements => {
    getFormData = () => {
        return {
            name: { first_name: elements["first-name"].value, infix: elements.infix.value, family_name: elements["family-name"].value },
            email: elements.email.value,
            password: { password: elements.password.value, confirmation: elements["confirm-password"].value },
            phone_number: elements["phone-number"].value,
            birth_date: elements["birth-date"].valueAsDate,
            study: elements.study.value,
            student_number: elements.study.value,
            bank_account: { iban: elements.iban.value, bic: elements.bic.value, holder: elements["bank-account-name"].value },
            receive_news_letter: elements["receive-news-letter"].value,
            allow_social_media: { public: elements["allow-public-photos"].value, private: elements["allow-private-photos"].value },
            add_to_whatsapp: elements["add-to-whatsapp"].value,
            accept_privacy_statement: elements["accept-privacy-statement"].value,
            allow_auto_transactions: elements["allow-bank-transactions"].value
        };
    }
});

interface RegistrationFormDataValidity {
    name: { first_name:boolean, infix:boolean, family_name:boolean },
    email:boolean,
    password: {
        is_min_length:boolean,
        has_capital_letter:boolean,
        has_number:boolean,
        has_special_char:boolean,
        password:boolean,
        confirmation:boolean
    },
    phone_number:boolean,
    birth_date:boolean,
    study:boolean,
    student_number:boolean,
    bank_account: { iban:boolean, bic:boolean, holder:boolean }
    receive_news_letter:boolean,
    allow_social_media: { public:boolean, private:boolean },
    add_to_whatsapp:boolean,
    accept_privacy_statement:boolean,
    allow_auto_transactions:boolean
}

const LEGAL_NAME_REGEX:RegExp = /^[A-Za-zÀ-öø-ȳ\.]+([ \-`'\/,][A-Za-zÀ-öø-ȳ\.]+)*$/;

/** @see https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript */
const EMAIL_REGEX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const MAX_BIRTH_DATE = new Date();
MAX_BIRTH_DATE.setFullYear(MAX_BIRTH_DATE.getFullYear()-18);

const NUMBER_REGEX = /[0-9]+/;

const BIC_REGEX = /^[A-Z]{4}[A-Z]{2}[0-9A-Z]{2}([0-9A-Z]{3})?$/;

/** Check whether the registration form has been filled in correctly. */
function getFormValidity(data:RegistrationFormData):{ status:boolean, components:RegistrationFormDataValidity, message:string } {
    const password_is_min_length = data.password.password.length >= 8;
    const password_has_capital_letter = data.password.password.split("").some(c => /[A-ZÀ-öø-ȳ]/.test(c) && c === c.toLocaleUpperCase());
    const password_has_number = /[0-9]/.test(data.password.password);
    const password_has_special_char = !/^[a-zA-Z0-9]*$/.test(data.password.password);

    const components:RegistrationFormDataValidity = {
        name: {
            first_name: data.name.first_name.length > 0 && LEGAL_NAME_REGEX.test(data.name.first_name),
            infix: LEGAL_NAME_REGEX.test(data.name.infix),
            family_name: data.name.family_name.length > 0 && LEGAL_NAME_REGEX.test(data.name.family_name)
        },
        email: data.email.length > 0 && EMAIL_REGEX.test(data.email),
        password: {
            is_min_length: password_is_min_length,
            has_capital_letter: password_has_capital_letter,
            has_number: password_has_number,
            has_special_char: password_has_special_char,
            password: password_is_min_length && password_has_capital_letter && password_has_number && password_has_special_char,
            confirmation: data.password.confirmation === data.password.password
        },
        phone_number: data.phone_number.length === 0 || /^[+\- 0-9]+$/.test(data.phone_number),
        birth_date: data.birth_date !== null && data.birth_date.getTime() <= MAX_BIRTH_DATE.getTime(),
        study: data.study.length > 0,
        student_number: data.student_number.length === 0 || data.student_number.startsWith('S'),
        bank_account: {
            iban: IBAN.isValid(data.bank_account.iban),
            bic: BIC_REGEX.test(data.bank_account.bic),
            holder: LEGAL_NAME_REGEX.test(data.bank_account.holder)
        },
        receive_news_letter: true,
        allow_social_media: { public: true, private: true },
        add_to_whatsapp: !data.add_to_whatsapp || data.phone_number.length !== 0,
        accept_privacy_statement: data.accept_privacy_statement,
        allow_auto_transactions: data.allow_auto_transactions
    };

    let message = "";

    if (!components.name.first_name) message = data.name.first_name ? "Voornaam is ongeldig." : "Voornaam is verplicht.";
    else if (!components.name.infix) message = "Tussenvoegsel is ongeldig.";
    else if (!components.name.family_name) message = data.name.family_name ? "Achternaam is ongeldig." : "Achternaam is verplicht.";
    else if (!components.email) message = data.email ? "E-mailadres is ongeldig." : "E-mailadres is verplicht.";
    else if (!components.password.is_min_length) message = "Wachtwoord is niet lang genoeg.";
    else if (!components.password.has_capital_letter) message = "Wachtwoord moet een hoofdletter bevatten.";
    else if (!components.password.has_number) message = "Wachtwoord moet een cijfer bevatten.";
    else if (!components.password.has_special_char) message = "Wachtwoord moet een speciaal teken (bijv. !, & of $) bevatten.";
    else if (!components.password.password) message = "Wachtwoord is ongeldig";
    else if (!components.password.confirmation) message = "Wachtwoord en herhaalwachtwoord moeten hetzelfde zijn.";
    else if (!components.phone_number) message = "Telefoonnummer is ongeldig.";
    else if (!components.birth_date) message = data.birth_date !== null ? "Je moet minstens 18 jaar zijn om je via de website in te schrijven." : "Geboortedatum is verplicht.";
    else if (!components.study) message = "Studie is verplicht.";
    else if (!components.student_number) message = `Studentnummer moet met een "S" beginnen.`;
    else if (!components.bank_account.iban) message = "IBAN is ongeldig.";
    else if (!components.bank_account.bic) message = "BIC is ongeldig.";
    else if (!components.bank_account.holder) message = "Naam van rekeninghouder is ongeldig.";
    else if (!components.add_to_whatsapp && data.add_to_whatsapp) message = "Geef een nummer om toe te voegen aan de Whatsapp groep.";
    else if (!data.accept_privacy_statement) message = "Je moet met het privacy statement akkoord gaan om je in te kunnen schrijven.";
    else if (!data.allow_auto_transactions) message = "Je moet met de automatische incasso's akkoord gaan om je in te kunnen schrijven.";


    return { status: message.length === 0, components, message };
}

Loading.onDOMContentLoaded({
    "form": HTMLFormElement,
    ...FORM_INPUTS_QUERY,
    "password-min-length": HTMLSpanElement,
    "password-has-capital": HTMLSpanElement,
    "password-has-number": HTMLSpanElement,
    "password-has-special-char": HTMLSpanElement
})
.then(elements => {
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

    elements.form.addEventListener("input", () => {
        const components = getFormValidity(getFormData()).components;

        elements["first-name"].toggleAttribute("invalid", !components.name.first_name);
        elements.infix.toggleAttribute("invalid", !components.name.infix);
        elements["family-name"].toggleAttribute("invalid", !components.name.family_name);
    
        elements.email.toggleAttribute("invalid", !components.email);
        elements["password-min-length"].toggleAttribute("invalid", !components.password.is_min_length);
        elements["password-has-capital"].toggleAttribute("invalid", !components.password.has_capital_letter);
        elements["password-has-number"].toggleAttribute("invalid", !components.password.has_number);
        elements["password-has-special-char"].toggleAttribute("invalid", !components.password.has_special_char);
        elements.password.toggleAttribute("invalid", !components.password.password);
        elements["confirm-password"].toggleAttribute("invalid", !components.password.confirmation);
    
        elements["phone-number"].toggleAttribute("invalid", !components.phone_number);
        elements["birth-date"].toggleAttribute("invalid", !components.birth_date);
        elements.study.toggleAttribute("invalid", !components.study);
        elements["student-number"].toggleAttribute("invalid", !components.student_number);
    
        elements.iban.toggleAttribute("invalid", !components.bank_account.iban);
        elements.bic.toggleAttribute("invalid", !components.bank_account.bic);
        elements["bank-account-name"].toggleAttribute("invalid", !components.bank_account.holder);
    });
})
.catch(console.error);