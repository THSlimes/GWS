import Switch from "../custom-elements/Switch";
import AssemblyLine from "./AssemblyLine";

export default class SwitchAssemblyLine extends AssemblyLine<"switch-input",Switch> {

    constructor(initial?:boolean, dependants?:string|Element|(string|Element)[], inverted?:boolean) {
        super("switch-input", () => new Switch(initial, dependants, inverted));
    }

}