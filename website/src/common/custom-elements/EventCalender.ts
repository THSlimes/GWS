import $ from "jquery";
import ElementFactory from "../html-element-factory/ElementFactory";
import { EventDatabase, EventInfo } from "../firebase/database/database-def";
import { EventNote } from "./EventNote";
import { dayEarlierThan, earliest, isBetweenDays, isSameDay, isWeekend, latest, timespansDaysOverlap, timespansOverlap } from "../util/DateUtil";
import { daysOverlap } from "../util/DateUtil";
import { spanInDays } from "../util/DateUtil";

const DAY_ABBREVIATIONS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

/**
 * Computes an id -> height offset mapping where no events which overlap have the same height offset.
 * @param events events to generate offsets for
 * @returns non-overlapping id -> height offset mapping
 */
function computeNonOverlappingOffsets(events:EventInfo[]) {
    events.sort((a,b) => a.starts_at.getTime() - b.starts_at.getTime());
    const out:Record<string, number> = {};
    events.forEach(e => {
        out[e.id] = 0;
        while (events.some(other => e !== other && daysOverlap(e, other) && out[e.id] === out[other.id])) out[e.id]++;
    }); // initialize
    
    return out;
}


type CalenderViewMode = "week" | "month" | "list";

type CalenderEvent = {};
type DayCell = { element:HTMLDivElement, date:Date, events:CalenderEvent[] };

export default class EventCalender extends HTMLElement {

    private static FULLSCREEN_EVENT_CONTAINER = ElementFactory.div("fullscreen-event-container", "center-content").attr("hidden").make();
    static { // add container to body
        window.addEventListener("DOMContentLoaded", () => document.body.appendChild(this.FULLSCREEN_EVENT_CONTAINER));
        this.FULLSCREEN_EVENT_CONTAINER.addEventListener("click", e => {
            if (e.target === this.FULLSCREEN_EVENT_CONTAINER) this.closeFullscreenNote();
        });
    }
    public static expandNote(event:EventInfo|EventNote) {
        const fsNote = event instanceof EventNote ? event.copy(true) : new EventNote(event, true);
        $(this.FULLSCREEN_EVENT_CONTAINER).empty().append(fsNote);
        this.FULLSCREEN_EVENT_CONTAINER.removeAttribute("hidden");
        document.body.classList.add("no-scroll");

        return fsNote;
    }
    public static closeFullscreenNote() {
        document.body.classList.remove("no-scroll");
        this.FULLSCREEN_EVENT_CONTAINER.setAttribute("hidden", "");
    }

    private readonly db:EventDatabase;
    private readonly retrievedRange = { from:new Date(), to:new Date() };
    private readonly events:Record<string,EventInfo> = {}; // id to data mapping
    private getEvents(from:Date, to:Date):Promise<EventInfo[]> {

        return new Promise((resolve,reject) => {
            if (this.retrievedRange.from.getTime() <= from.getTime() && to.getTime() <= this.retrievedRange.to.getTime()) {
                // entire range already retrieved
                resolve(Object.values(this.events).filter(e => timespansOverlap(from, to, e.starts_at, e.ends_at)));
            }
            else { // have to retrieve some events
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

        this.setAttribute("display", viewMode);

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
                this.dayCellContainer.appendChild(ElementFactory.p("Aanstaande evenementen").class("day-name").make());
                firstDate = new Date(date);
                firstDate.setHours(0,0,0,0);

                // load one month initially
                for (let i = 0; i <= 31; i ++) {
                    newDays.push({
                        element: ElementFactory.div()
                            .class(
                                "day-cell",
                                isSameDay(date, new Date()) ? "today" : null,
                                isWeekend(date) ? "weekend" : null
                            )
                            .children(
                                ElementFactory.p(date.toLocaleDateString(navigator.languages, {weekday:"long", day:"numeric", month:"long"})).class("day-number")
                            )
                            .make(),
                        date: new Date(date),
                        events: []
                    });
                    date.setDate(date.getDate() + 1);
                }

                lastDate = new Date(date);
                lastDate.setHours(0,0,0,-1);
                break;
        }

        this.dayCellContainer.append(...newDays.map(d=>d.element)); // append new day-cells

        // insert event-notes
        
        this.getEvents(firstDate, lastDate)
        .then(events => this.insertEventNotes(events, newDays, viewMode))
        .catch(console.error);
    }

    private insertEventNotes(events:EventInfo[], dayCells:DayCell[], viewMode:CalenderViewMode) {
        switch (viewMode) {
            case "week":
            case "month":
                const offsets = computeNonOverlappingOffsets(events);
                this.dayCellContainer.style.setProperty("--max-overlap", (Math.max(0, ...Object.values(offsets)) + 1).toString());
    
                events.forEach(e => {
                    let cellInd = dayCells.findIndex(dc => isBetweenDays(dc.date, e.starts_at, e.ends_at));
                    if (cellInd !== -1) {
                        let daysLeft = spanInDays(dayCells[cellInd].date, e.ends_at);
                        for (let w = 1; daysLeft >= 1 && cellInd < dayCells.length; w ++) {
                            dayCells[cellInd].events.push(e);
                            dayCells[cellInd].element.style.zIndex = (dayCells.length - cellInd + 1).toString();
                            const note = dayCells[cellInd].element.appendChild(new EventNote(e));
                            note.classList.add("click-action");
                            note.style.setProperty("--length", daysLeft.toString());
                            note.style.setProperty("--offset", offsets[e.id].toString());
                            if (dayEarlierThan(e.starts_at, dayCells[cellInd].date)) note.classList.add("starts-in-earlier-week");
    
                            note.addEventListener("click", () => EventCalender.expandNote(note) );
                            
                            do { // find next Monday
                                cellInd++;
                                daysLeft--;
                            } while (daysLeft >= 1 && cellInd < dayCells.length && dayCells[cellInd].date.getDay() !== 1);
                        }
                    }
                });
                break;
            case "list":
                events.forEach(e => {
                    let cellInd = dayCells.findIndex(dc => isBetweenDays(dc.date, e.starts_at, e.ends_at));
                    
                    if (cellInd !== -1) {
                        let daysLeft = spanInDays(dayCells[cellInd].date, e.ends_at);
                        while (cellInd < dayCells.length && daysLeft >= 1) {
                            dayCells[cellInd].events.push(e);
                            const note = dayCells[cellInd].element.appendChild(new EventNote(e));
                            note.classList.add("click-action");
                            note.style.setProperty("--length", '1');
                            note.addEventListener("click", () => EventCalender.expandNote(note) );

                            cellInd++;
                            daysLeft--;
                        }
                    }
                });

                dayCells.forEach(dc => dc.element.style.display = dc.events.length === 0 ? "none" : "");
                break;
        }
    }

}

customElements.define("event-calender", EventCalender);