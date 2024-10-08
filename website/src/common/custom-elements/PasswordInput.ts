import ElementFactory from "../html-element-factory/ElementFactory";
import { HasSections } from "../util/UtilTypes";

class PasswordInput extends HTMLElement implements HasSections<"input" | "button"> {

    public get type(): PasswordInput.Type {
        return this.getAttribute("type") as PasswordInput.Type ?? PasswordInput.Type.CURRENT;
    }
    public set type(newType) {
        this.setAttribute("type", newType);
        this.input.autocomplete = newType;
    }

    public get value(): string {
        return this.input.value;
    }
    public set value(newVal) {
        this.input.value = newVal;
    }

    public get name(): string {
        return this.input.name;
    }
    public set name(newName) {
        this.input.name = newName;
    }


    public input!: HTMLInputElement;
    public button!: HTMLElement;

    constructor(type = PasswordInput.Type.CURRENT, name?: string) {
        super();

        this.initElement();
        this.type = type;
        if (name) this.input.name = name;
    }

    public initElement(): void {
        this.classList.add("flex-columns", "center-content", "in-section-gap");

        this.input = this.appendChild(
            ElementFactory.input.password()
                .autocomplete(this.type)
                .size(32)
                .make()
        );

        this.button = this.appendChild(
            ElementFactory.iconButton("visibility_off", (_, self) => {
                if (this.toggleAttribute("show")) {
                    self.textContent = "visibility";
                    self.toggleAttribute("selected", true);
                    this.input.type = "text";
                }
                else {
                    self.textContent = "visibility_off";
                    self.toggleAttribute("selected", false);
                    this.input.type = "password";
                }

                this.input.blur();
            }, "Wachtwoord tonen/verbergen")
                .attr("can-unselect")
                .make()
        );
    }

}

namespace PasswordInput {

    export enum Type {
        NEW = "new-password",
        CURRENT = "current-password"
    }

}

customElements.define("password-input", PasswordInput);
export default PasswordInput;