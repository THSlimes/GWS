import GridSizeInput from "../custom-elements/GridSizeInput";
import AssemblyLine from "./AssemblyLine";

export default class GridSizeInputAssemblyLine extends AssemblyLine<"grid-size-input", GridSizeInput> {

    constructor() {
        super("grid-size-input", () => new GridSizeInput());
    }

}