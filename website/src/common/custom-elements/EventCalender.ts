import $ from "jquery";
import ElementFactory from "../html-element-factory/ElementFactory";

const DAY_ABBREVIATIONS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

type CalenderViewMode = "week" | "month" | "list";

type CalenderEvent = {};
type DayCell = { element:HTMLDivElement, date:Date, events:CalenderEvent[] };

export default class EventCalender extends HTMLElement {

    private _viewMode:CalenderViewMode;
    set viewMode(newViewMode:CalenderViewMode) {
        if (this._viewMode !== newViewMode) {
            this._viewMode = newViewMode;
            this.populate(this._lookingAt, this._viewMode);
        }
    }

    private controls:HTMLDivElement = this.appendChild(ElementFactory.div().class("controls", "flex-columns", "main-axis-center", "cross-axis-center").make());

    private _lookingAt:Date = new Date();
    public set lookingAt(newDate:Date) {
        if (newDate.getTime() !== this._lookingAt.getTime()) {
            this._lookingAt = newDate;
            this.populate(this._lookingAt, this._viewMode);
        }
    }
    public toToday() { this.lookingAt = new Date(); }

    private dayCells:HTMLDivElement = this.appendChild(ElementFactory.div().class("day-cells").make());
    private days:DayCell[] = [];

    constructor(date=new Date(), viewMode:CalenderViewMode="month") {
        super();
        
        this._lookingAt = date;
        this._viewMode = viewMode;
        this.populate(this._lookingAt, this._viewMode);
    }

    private populate(date:Date, viewMode:CalenderViewMode) {
        date = new Date(date); // use copy instead

        $(this.controls).empty(); // clear controls
        $(this.dayCells).empty(); // clear grid
        this.days = [];

        switch (viewMode) {
            case "week": throw new Error("not implemented");
            case "month":
                // add controls
                this.controls.append(
                    ElementFactory.input.button("navigate_before", () => {
                        date.setMonth(date.getMonth()-1);
                        this.populate(date, this._viewMode);
                    }).class("nav-button", "icon").make(),
                    ElementFactory.input.month(date.getFullYear(), date.getMonth())
                        .class("month-input")
                        .onValueChanged(v => this.lookingAt = new Date(v))
                        .make(),
                    ElementFactory.input.button("navigate_next", () => {
                        date.setMonth(date.getMonth()+1);
                        this.populate(date, this._viewMode);
                    }).class("nav-button", "icon").make(),
                );

                // add day names
                DAY_ABBREVIATIONS.forEach((v,i) => {
                    this.dayCells.appendChild(ElementFactory.p(v).class("day-name").style({"grid-area": `1 / ${i+1} / 2 / ${i+2}`}).make());
                });

                // find first day to display
                let d = new Date(date);
                d.setHours(0,0,0,0); // set time to midnight
                d.setDate(1); // get first day of month
                while (d.getDay() !== 1) d.setDate(d.getDate()-1); // get first Monday before

                // insert day cells
                for (let i = 0; i < 42; i ++) { // 6 weeks are displayed
                    const x = i % 7 + 1;
                    const y = Math.floor(i / 7) + 2;
                    
                    let dayCell:DayCell = { // create cell
                        element: ElementFactory.div()
                            .class(
                                "day-cell",
                                d.getMonth() !== date.getMonth() ? "different-month" : null,
                                d.getDate() === new Date().getDate() && d.getMonth() === new Date().getMonth() ? "today" : null
                            )
                            .style({"grid-area": `${y} / ${x} / ${y+1} / ${x+1}`})
                            .children(
                                ElementFactory.p(d.getDate().toString()).class("day-number")
                            )
                            .make(),
                        date: new Date(d),
                        events: []
                    };
                    this.days.push(dayCell);
                    d.setDate(d.getDate()+1); // increment date
                }
                this.dayCells.append(...this.days.map(d=>d.element)); // append in correct order

                break;
            case "list": throw new Error("not implemented");
        }
    }

}

customElements.define("event-calender", EventCalender);