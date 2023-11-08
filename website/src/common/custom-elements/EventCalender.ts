import $ from "jquery";
import ElementFactory from "../html-element-factory/ElementFactory";
import { EventDatabase, EventInfo } from "../firebase/database/database-def";
import { EventNote } from "./EventNote";
import { dayEarlierThan, earliest, isBetweenDays, isSameDay, isWeekend, latest, timespansDaysOverlap, timespansOverlap } from "../util/DateUtil";
import { daysOverlap } from "../util/DateUtil";
import { spanInDays } from "../util/DateUtil";

function computeNonOverlappingOffsets(events:EventInfo[]) {
    events.sort((a,b) => a.starts_at.getTime() - b.starts_at.getTime());
    const out:Record<string, number> = {};
    events.forEach(e => {
        out[e.id] = 0;
        while (events.some(other => e !== other && daysOverlap(e, other) && out[e.id] === out[other.id])) out[e.id]++;
    }); // initialize
    
    return out;
}

const DAY_ABBREVIATIONS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

type CalenderViewMode = "week" | "month" | "list";

type CalenderEvent = {};
type DayCell = { element:HTMLDivElement, date:Date, events:CalenderEvent[] };

export default class EventCalender extends HTMLElement {

    private readonly db:EventDatabase;
    private readonly retrievedRange = { from:new Date(), to:new Date() };
    private readonly events:Record<string,EventInfo> = {}; // id to data mapping
    private getEvents(from:Date, to:Date):Promise<EventInfo[]> {

        return new Promise((resolve,reject) => {
            if (this.retrievedRange.from.getTime() <= from.getTime() && to.getTime() <= this.retrievedRange.to.getTime()) {
                // entire range already retrieved
                console.log("from cache");
                resolve(Object.values(this.events).filter(e => timespansOverlap(from, to, e.starts_at, e.ends_at)));
            }
            else { // have to retrieve some events
                console.log("from DB");
                
                this.db.getRange(from, to)
                .then(newEvents => {
                    newEvents.forEach(e => this.events[e.id] = e); // save for later
                    // update range
                    this.retrievedRange.from = earliest(this.retrievedRange.from, from);
                    this.retrievedRange.to = latest(this.retrievedRange.to, to);
                    resolve(newEvents);
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

    private dayCellContainer:HTMLDivElement = this.appendChild(ElementFactory.div().class("day-cell-container").make());

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
        $(this.dayCellContainer).empty(); // clear grid

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
                    this.dayCellContainer.appendChild(ElementFactory.p(v).class("day-name").style({"grid-area": `1 / ${i+1} / 2 / ${i+2}`}).make());
                });

                // find previous Monday
                while (date.getDay() !== 1) date.setDate(date.getDate() - 1);
                firstDate = new Date(date);
                firstDate.setHours(0,0,0,0);

                // insert day-cells
                for (let i = 0; i < 7; i ++) {
                    newDays.push({
                        element: ElementFactory.div()
                            .class(
                                "day-cell",
                                isSameDay(date, new Date()) ? "today" : null,
                                isWeekend(date) ? "weekend" : null
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
                lastDate.setHours(0,0,0,0-1);
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
                    this.dayCellContainer.appendChild(ElementFactory.p(v).class("day-name").style({"grid-area": `1 / ${i+1} / 2 / ${i+2}`}).make());
                });

                // find first day to display
                date.setHours(0,0,0,0); // set time to midnight
                date.setDate(1); // get first day of month
                while (date.getDay() !== 1) date.setDate(date.getDate()-1); // get first Monday before
                firstDate = new Date(date);
                firstDate.setHours(0,0,0,0);

                // insert day-cells
                for (let i = 0; i < 42; i ++) { // 6 weeks are displayed
                    const x = i % 7 + 1;
                    const y = Math.floor(i / 7) + 2;
                    
                    newDays.push({
                        element: ElementFactory.div()
                            .class(
                                "day-cell",
                                isSameDay(date, new Date()) ? "today" : null,
                                isWeekend(date) ? "weekend" : null,
                                date.getMonth() !== dateCopy.getMonth() ? "different-month" : null
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
                lastDate.setHours(0,0,0,-1);
                break;
            case "list":
                throw new Error("Not implemented yet");
                break;
        }

        this.dayCellContainer.append(...newDays.map(d=>d.element)); // append new day-cells

        // insert event-notes
        console.log("firstDate:", firstDate);
        console.log("lastDate: ", lastDate);
        
        this.getEvents(firstDate, lastDate)
        .then(events => {
            console.log(events);
            
            const offsets = computeNonOverlappingOffsets(events);
            this.dayCellContainer.style.setProperty("--max-overlap", (Math.max(0, ...Object.values(offsets)) + 1).toString());

            events.forEach(e => {
                let cellInd = newDays.findIndex(dc => isBetweenDays(dc.date, e.starts_at, e.ends_at));
                if (cellInd !== -1) {
                    let daysLeft = spanInDays(newDays[cellInd].date, e.ends_at);
                    for (let w = 1; daysLeft >= 1 && cellInd < newDays.length; w ++) {
                        newDays[cellInd].element.style.zIndex = (newDays.length - cellInd + 1).toString();
                        const note = newDays[cellInd].element.appendChild(new EventNote(e));
                        note.classList.add("click-action");
                        note.style.setProperty("--length", daysLeft.toString());
                        note.style.setProperty("--offset", offsets[e.id].toString());
                        if (dayEarlierThan(e.starts_at, newDays[cellInd].date)) note.classList.add("starts-in-earlier-week");
                        
                        do { // find next Monday
                            cellInd++;
                            daysLeft--;
                        } while (daysLeft >= 1 && cellInd < newDays.length && newDays[cellInd].date.getDay() !== 1);
                    }
                }
            });
        })
        .catch(console.error);
    }

}

customElements.define("event-calender", EventCalender);