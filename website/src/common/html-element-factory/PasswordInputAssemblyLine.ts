import PasswordInput from "../custom-elements/PasswordInput";
import AssemblyLine from "./AssemblyLine";

export default class PasswordInputAssemblyLine extends AssemblyLine<"password-input", PasswordInput> {

    constructor() {
        super("password-input", () => new PasswordInput());
    }

    private validationPredicate?: (value: string) => boolean | string;
    public validateValue(predicate: (value: string) => boolean | string) {
        this.validationPredicate = predicate;
        return this;
    }

    private _type?: PasswordInput.Type;
    public type(type: PasswordInput.Type) {
        this._type = type;
        return this;
    }

    private _name?: string;
    public name(name: string) {
        this._name = name;
        return this;
    }

    public override make(): PasswordInput {
        const out = super.make();

        if (this._type) out.type = this._type;
        if (this._name) out.name = this._name;

        if (this.validationPredicate) {
            const pred = this.validationPredicate;
            const validateCB = () => {
                const validity = pred(out.value);
                if (typeof validity === "string") {
                    out.setAttribute("invalid", validity);
                    out.input.setAttribute("invalid", validity);
                }
                else {
                    out.toggleAttribute("invalid", !validity);
                    out.input.toggleAttribute("invalid", !validity);
                }
            }
            out.addEventListener("input", validateCB);
            out.addEventListener("change", validateCB);
            validateCB();
        }

        return out;
    }

}