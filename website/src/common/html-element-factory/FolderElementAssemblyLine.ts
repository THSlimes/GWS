import FolderElement, { FoldingDirection } from "../custom-elements/FolderElement";
import AssemblyLine from "./AssemblyLine";

export default class FolderElementAssemblyLine extends AssemblyLine<"folder-element", FolderElement> {

    constructor() {
        super("folder-element", () => new FolderElement());
    }

    protected _foldDir?:FoldingDirection;
    public foldDir(foldDir:FoldingDirection):this {
        this._foldDir = foldDir;
        return this;
    }

    protected _arrowHidden?:boolean;
    public hideArrow(isHidden:boolean=true):this {
        this._arrowHidden = isHidden;
        return this;
    }

    protected _closingDelay?:number;
    public closingDelay(delay:number):this {
        this._closingDelay = delay;
        return this;
    }

    protected _heading?:HTMLElement|AssemblyLine<any>;
    public heading(heading:HTMLElement|AssemblyLine<any>):this {
        this._heading = heading;
        return this;
    }

    public make():FolderElement {
        const out = super.make() as FolderElement;

        if (this._foldDir) out.foldDir = this._foldDir;
        out.arrowHidden = this._arrowHidden ?? false;
        if (this._closingDelay) out.closingDelay = this._closingDelay;
        if (this._heading) out.heading = this._heading instanceof AssemblyLine ? this._heading.make() : this._heading;

        return out;
    }

}