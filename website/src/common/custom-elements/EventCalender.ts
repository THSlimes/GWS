import $ from "jquery";
import ElementFactory from "../html-element-factory/ElementFactory";
import { EventDatabase, EventInfo } from "../firebase/database/database-def";

function isSameDay(a:Date, b:Date) {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() == b.getMonth()
        && a.getDate() === b.getDate()
}

function isBetweenDays(date:Date, start:Date, end:Date) {
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    start = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    end = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

const DAY_ABBREVIATIONS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

type CalenderViewMode = "week" | "month" | "list";

type CalenderEvent = {};
type DayCell = { element:HTMLDivElement, date:Date, events:CalenderEvent[] };

export default class EventCalender extends HTMLElement {

    private readonly db:EventDatabase;
    private readonly events:Record<number, Record<number, EventInfo[]>> = {};
    private getEvents(year:number, monthInd:number):Promise<EventInfo[]> {
        return new Promise((resolve, reject) => {
            if (year in this.events && monthInd in this.events[year]) {
                resolve(this.events[year][monthInd]); // already retrieved events
            }
            else { // get from database
                const before = new Date(year, (monthInd + 1) % 12);
                const after = new Date(year, monthInd);
                after.setMilliseconds(-1);

                this.db.getRange(before, after)
                .then(events => {
                    events.sort((a,b) => a.starts_at.getTime() - b.starts_at.getTime())
                    if (!(year in this.events)) this.events[year] = {};
                    this.events[year][monthInd] = events; // store for later
                    resolve(events);
                })
                .catch(reject);
            }
        });
    }

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

    constructor(db:EventDatabase, date=new Date(), viewMode:CalenderViewMode="month") {
        super();
        this.classList.add("boxed");

        this.db = db;
        
        this._lookingAt = date;
        this._viewMode = viewMode;
        this.populate(this._lookingAt, this._viewMode);
    }

    private populate(date:Date, viewMode:CalenderViewMode) {
        date = new Date(date); // use copy instead
        const dateCopy = new Date(date); // make copy for controls

        $(this.controls).empty(); // clear controls
        $(this.dayCells).empty(); // clear grid

        const newDays:DayCell[] = [];
        let firstDate:Date;
        let lastDate:Date;

        switch (viewMode) {
            case "week":
                this.controls.append( // add controls
                    ElementFactory.input.button("navigate_before", () => {
                        dateCopy.setDate(dateCopy.getDate() - 7);
                        this.populate(dateCopy, this._viewMode);
                    }).class("nav-button", "icon").make(),
                    ElementFactory.input.date(dateCopy.getFullYear(), dateCopy.getMonth(), dateCopy.getDate())
                        .class("period-input")
                        .onValueChanged(v => this.lookingAt = new Date(v))
                        .make(),
                    ElementFactory.input.button("navigate_next", () => {
                        dateCopy.setDate(dateCopy.getDate() + 7);
                        this.populate(dateCopy, this._viewMode);
                    }).class("nav-button", "icon").make()
                );

                // add day names
                DAY_ABBREVIATIONS.forEach((v,i) => {
                    this.dayCells.appendChild(ElementFactory.p(v).class("day-name").style({"grid-area": `1 / ${i+1} / 2 / ${i+2}`}).make());
                });

                // find previous Monday
                while (date.getDay() !== 1) date.setDate(date.getDate() - 1);

                firstDate = new Date(date);

                for (let i = 0; i < 7; i ++) {
                    newDays.push({
                        element: ElementFactory.div()
                            .class(
                                "day-cell",
                                date.getMonth() !== date.getMonth() ? "different-month" : null,
                                isSameDay(date, new Date()) ? "today" : null
                            )
                            .style({ "grid-area": `2 / ${i+1} / 8 / ${i+2}` })
                            .children(
                                ElementFactory.p(date.getDate().toString()).class("day-number")
                            )
                            .make(),
                        date: new Date(date),
                        events: []
                    });
                    
                    date.setDate(date.getDate() + 1);
                }

                lastDate = new Date(date);
                break;
            case "month":
                this.controls.append( // add controls
                    ElementFactory.input.button("navigate_before", () => {
                        dateCopy.setMonth(dateCopy.getMonth() - 1);
                        this.populate(dateCopy, this._viewMode);
                    }).class("nav-button", "icon").make(),
                    ElementFactory.input.month(dateCopy.getFullYear(), dateCopy.getMonth())
                        .class("period-input")
                        .onValueChanged(v => this.lookingAt = new Date(v))
                        .make(),
                    ElementFactory.input.button("navigate_next", () => {
                        dateCopy.setMonth(dateCopy.getMonth()+1);
                        this.populate(dateCopy, this._viewMode);
                    }).class("nav-button", "icon").make()
                );

                // add day names
                DAY_ABBREVIATIONS.forEach((v,i) => {
                    this.dayCells.appendChild(ElementFactory.p(v).class("day-name").style({"grid-area": `1 / ${i+1} / 2 / ${i+2}`}).make());
                });

                // find first day to display
                date.setHours(0,0,0,0); // set time to midnight
                date.setDate(1); // get first day of month
                while (date.getDay() !== 1) date.setDate(date.getDate()-1); // get first Monday before

                firstDate = new Date(date);

                // insert day cells
                for (let i = 0; i < 42; i ++) { // 6 weeks are displayed
                    const x = i % 7 + 1;
                    const y = Math.floor(i / 7) + 2;
                    
                    newDays.push({
                        element: ElementFactory.div()
                            .class(
                                "day-cell",
                                date.getMonth() !== date.getMonth() ? "different-month" : null,
                                isSameDay(date, new Date()) ? "today" : null
                            )
                            .style({ "grid-area": `${y} / ${x} / ${y + 1} / ${x + 1}` })
                            .children(
                                ElementFactory.p(date.getDate().toString()).class("day-number")
                            )
                            .make(),
                        date: new Date(date),
                        events: []
                    });
                    date.setDate(date.getDate()+1); // increment date
                }

                lastDate = new Date(date);

                break;
            case "list":
                throw new Error("Not implemented yet");
                break;
        }

        this.dayCells.append(...newDays.map(d=>d.element)); // append in correct order

        // populate day-cells with events
        for (let y = firstDate.getFullYear(); y <= lastDate.getFullYear(); y ++) {
            for (let m = firstDate.getMonth(); m <= lastDate.getMonth(); m ++) {
                this.getEvents(y,m)
                .then(events => {
                    for (const dayCell of newDays) {
                        const onDay = events.filter(e => isBetweenDays(dayCell.date, e.starts_at, e.ends_at));
                        dayCell.events = onDay;
                        dayCell.element.append(...onDay.map(e => ElementFactory.div()
                            .class("event-note")
                            .children(
                                ElementFactory.h5(isSameDay(dayCell.date, e.starts_at) || dayCell.date.getDay() === 1 ? e.name : "\u200c")
                            )
                            .make()
                        ));
                    }
                })
                .catch(console.log)
            }
        }
    }

}

customElements.define("event-calender", EventCalender);