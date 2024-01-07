import $ from "jquery";
import ElementFactory from "../html-element-factory/ElementFactory";
import EventDatabase, { EventInfo } from "../firebase/database/events/EventDatabase";
import { DetailLevel, EventNote } from "./EventNote";
import { DATE_FORMATS, dayEarlierThan, earliest, firstDayBefore, getDayRange, isBetweenDays, isSameDay, isWeekend, justBefore, latest, timespansDaysOverlap, timespansOverlap } from "../util/DateUtil";
import { daysOverlap } from "../util/DateUtil";
import { spanInDays } from "../util/DateUtil";
import CachingEventDatebase from "../firebase/database/events/CachingEventDatebase";
import { isAtScrollBottom, isAtScrollTop, whenInsertedIn } from "../util/ElementUtil";
import IconSelector from "./IconSelector";
import Responsive from "../ui/Responsive";

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

function findMaxOverlap(date: Date, events: EventInfo[], offsets: Record<string, number>): number {
    let group = events.filter(e => isBetweenDays(date, e.starts_at, e.ends_at)); // seed group

    while (true) { // iterate
        const nextGroup = events.filter(e => group.some(o => e.daysOverlapsWith(o)));
        if (nextGroup.length === group.length) return Math.max(...group.map(e => offsets[e.id])); // done
        group = nextGroup;
    }
}

function doTranspose(viewMode:calendarViewMode) {
    return viewMode === "week" && Responsive.isAnyOf("mobile-portrait");
}

type calendarViewMode = "week" | "month" | "list";
const VIEWMODE_LODS:Record<calendarViewMode, DetailLevel> = {
    week: "normal",
    month: "normal",
    list: "normal"
};

type calendarEvent = {};
type DayCell = { element:HTMLDivElement, date:Date, events:calendarEvent[] };
type DayCellTypes = "today" | "weekend" | "different-month";
const DC_TYPE_DETECTORS:Record<DayCellTypes, (cellDate:Date, viewDate:Date) => boolean> = {
    today: (cellDate, viewDate) => isSameDay(new Date(), cellDate),
    weekend: cellDate => cellDate.getDay() === 0 || cellDate.getDay() === 6,
    "different-month": (cellDate, viewDate) => cellDate.getFullYear() !== viewDate.getFullYear() || cellDate.getMonth() !== viewDate.getMonth()
};
type DayCellCreationOptions = {
    markedTypes?: DayCellTypes[],
    gridArea?:[number,number,number,number]
}

export default class EventCalendar extends HTMLElement {

    private static FULLSCREEN_EVENT_CONTAINER = ElementFactory.div("fullscreen-event-container", "center-content").attr("hidden").make();
    static { // add container to body
        window.addEventListener("DOMContentLoaded", () => document.body.appendChild(this.FULLSCREEN_EVENT_CONTAINER));
        this.FULLSCREEN_EVENT_CONTAINER.addEventListener("click", e => {
            if (e.target === this.FULLSCREEN_EVENT_CONTAINER) this.closeFullscreenNote();
        });
    }
    public static expandNote(event:EventInfo|EventNote) {
        const fsNote = event instanceof EventNote ? event.copy("full", true) : new EventNote(event, "full", true);
        $(this.FULLSCREEN_EVENT_CONTAINER).empty().append(fsNote);
        this.FULLSCREEN_EVENT_CONTAINER.removeAttribute("hidden");
        document.body.classList.add("no-scroll");

        return fsNote;
    }
    public static closeFullscreenNote() {
        document.body.classList.remove("no-scroll");
        this.FULLSCREEN_EVENT_CONTAINER.setAttribute("hidden", "");
    }

    private readonly db:CachingEventDatebase;

    private static readonly LIST_VIEW_INITIAL_TIMESPAN_DAYS = 30;
    private _viewMode:calendarViewMode;
    set viewMode(newViewMode:calendarViewMode) {
        if (this._viewMode !== newViewMode) {
            this._viewMode = newViewMode;
            this.populate(this._lookingAt, this._viewMode);
        }
    }

    private controls:HTMLDivElement = this.appendChild(ElementFactory.div().class("controls", "center-content", "main-axis-space-between").make());

    private _lookingAt:Date = new Date();
    public set lookingAt(newDate:Date) {
        if (newDate.getTime() !== this._lookingAt.getTime()) {
            this._lookingAt = newDate;
            this.populate(this._lookingAt, this._viewMode);
        }
    }
    public toToday() { this.lookingAt = new Date(); }

    private dayCellContainer:HTMLDivElement = this.appendChild(ElementFactory.div(undefined, "day-cell-container").make());

    private static readonly LOAD_MORE_SCROLL_TOLERANCE = 2.5;
    private static readonly LOAD_MORE_TIMESPAN_DAYS = 15;
    private scrollEventListener?:(e:Event)=>void;

    constructor(db:Exclude<EventDatabase,CachingEventDatebase>, date=new Date(), viewMode:calendarViewMode="month") {
        super();

        this.db = db instanceof CachingEventDatebase ? db : new CachingEventDatebase(db);

        this.classList.add("flex-rows", "main-axis-start");
        
        this._lookingAt = date;
        this._viewMode = viewMode;
        this.populate(this._lookingAt, this._viewMode);
    }

    private static createDayCell(cellDate:Date, viewDate:Date, viewMode:calendarViewMode, options:DayCellCreationOptions={}):DayCell {
        return {
            element: ElementFactory.div()
            .class(
                "day-cell",
                ...(options.markedTypes ?? []).map(mt => DC_TYPE_DETECTORS[mt](cellDate,viewDate) ? mt : null)
            )
            .style({
                "grid-area": options.gridArea ? options.gridArea.join(" / ") : "unset"
            })
            .children(
                ElementFactory.p(
                    viewMode === "list" ?
                        DATE_FORMATS.DAY.LONG(cellDate) :
                        cellDate.getDate().toString()
                )
                .class("day-number")
            )
            .make(),
            date: cellDate,
            events: []
        }
    }

    private static indexToGridArea(i:number):[number,number,number,number] {
        const [x,y] = [i % 7 + 1, Math.floor(i / 7) + 2];
        return [y, x, y+1, x+1];
    }
    private static createDayCells(viewDate:Date, viewMode:calendarViewMode):DayCell[] {
        let firstDate = new Date(viewDate);
        if (viewMode === "month") firstDate.setDate(1); // first day of month
        if (viewMode === "month" || viewMode === "week") firstDate = firstDayBefore(firstDate, "Monday");
        
        const numDays = viewMode === "month" ? 42 : viewMode === "week" ? 7 : EventCalendar.LIST_VIEW_INITIAL_TIMESPAN_DAYS;
        return getDayRange(firstDate,numDays).map((d, i) => EventCalendar.createDayCell(d, viewDate, viewMode, {
                gridArea: viewMode === "month" ?
                    this.indexToGridArea(i) :
                    viewMode === "week" ?
                        doTranspose(viewMode) ?
                            [i+1, 2, i+2, 8] :
                            [2, i+1, 8, i+2] :
                        undefined,
                markedTypes: viewMode === "month" ? ["today", "weekend", "different-month"] : ["today", "weekend"]
            })
        );
    }
    private extendDayCells(dayCells:DayCell[], from:Date, to:Date, checkCount:"before"|"after"):Promise<[DayCell[],number]> {
        const extensionCells:DayCell[] = getDayRange(from, to).map((d,i) => {
            return EventCalendar.createDayCell(d, new Date(), "list", { markedTypes: ["today","weekend"] })
        });
        dayCells.unshift(...extensionCells);

        return new Promise((resolve,reject) => {
            Promise.all([this.db.getRange(from,to), this.db.count({range: checkCount === "before" ? {to} : {from}})])
            .then(([events, numLeft]) => {
                this.insertEventNotes(events, extensionCells, "list");
                resolve([extensionCells, numLeft]);
            })
            .catch(reject);
        });
    }

    private populate(date:Date, viewMode:calendarViewMode) {
        date = new Date(date); // use copy instead
        const dateCopy = new Date(date); // make copy for controls

        $(this.controls).empty(); // clear controls
        $(this.dayCellContainer).empty(); // clear grid
        if (this.scrollEventListener) this.dayCellContainer.removeEventListener("scroll", this.scrollEventListener);
        if (doTranspose(viewMode)) this.dayCellContainer.setAttribute("transpose", "");
        else this.dayCellContainer.removeAttribute("transpose");

        const newDays:DayCell[] = EventCalendar.createDayCells(date,viewMode);
        let firstDate = newDays[0].date;
        let lastDate = newDays.at(-1)!.date;

        this.setAttribute("display", viewMode);

        // add viewmode controls
        const vmSelector = new IconSelector(
            ["week", "calendar_view_week", "Week", viewMode === "week"],
            ["month", "calendar_view_month", "Maand", viewMode === "month"],
            ["list", "calendar_view_day", "Lijst", viewMode === "list"]
        );
        vmSelector.classList.add("viewmode-controls");
        vmSelector.addEventListener("change", () => this.viewMode = vmSelector.value);
        this.controls.appendChild(vmSelector);

        switch (viewMode) {
            case "week":
                this.controls.prepend( // add controls
                    ElementFactory.div(undefined, "timespan-controls", "center-content")
                        .children(
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
                        )
                        .make()
                );

                // add day names
                DAY_ABBREVIATIONS.forEach((v,i) => {
                    this.dayCellContainer.appendChild(
                        ElementFactory.p(v).class("day-name").style({
                            "grid-area": doTranspose(viewMode) ? `${i + 1} / 1 / ${i + 2} / 2` : `1 / ${i+1} / 2 / ${i+2}`
                        }
                    ).make());
                });

                this.dayCellContainer.append(...newDays.map(d=>d.element)); // append new day-cells
                break;
            case "month":
                this.controls.prepend( // add controls
                    ElementFactory.div(undefined, "timespan-controls", "center-content")
                        .children(
                            ElementFactory.input.button("navigate_before", () => {
                                dateCopy.setMonth(dateCopy.getMonth() - 1, 1);
                                this.populate(dateCopy, this._viewMode);
                            }).class("nav-button", "icon").make(),
                            ElementFactory.input.month(dateCopy.getFullYear(), dateCopy.getMonth())
                                .class("period-input")
                                .onValueChanged(v => this.lookingAt = new Date(v))
                                .make(),
                            ElementFactory.input.button("navigate_next", () => {
                                dateCopy.setMonth(dateCopy.getMonth()+1, 1);
                                this.populate(dateCopy, this._viewMode);
                            }).class("nav-button", "icon").make()
                        )
                        .make()
                );

                DAY_ABBREVIATIONS.forEach((v,i) => { // add day names
                    this.dayCellContainer.appendChild(ElementFactory.p(v).class("day-name").style({"grid-area": `1 / ${i+1} / 2 / ${i+2}`}).make());
                });

                this.dayCellContainer.append(...newDays.map(d=>d.element)); // append new day-cells
                break;
            case "list":
                this.controls.prepend(
                    ElementFactory.h3("Aanstaande activiteiten").make()
                );

                // adding load before/after triggers
                const loadBefore = ElementFactory.div(undefined, "center-content", "load-more", "load-before").make();
                this.dayCellContainer.prepend(loadBefore);

                this.dayCellContainer.append(...newDays.map(d=>d.element)); // append new day-cells

                const loadAfter = this.dayCellContainer.appendChild(ElementFactory.div(undefined, "center-content", "load-more", "load-after").make());

                whenInsertedIn(this.dayCellContainer, document.body)
                .then(() => {
                    this.dayCellContainer.scrollBy(0, 2);
                    
                    let prevScrollTop = this.dayCellContainer.scrollTop;

                    let [loadingBefore, loadingAfter] = [false, false];
                    this.scrollEventListener = () => {
                        const scrollDelta = prevScrollTop - this.dayCellContainer.scrollTop;
                        prevScrollTop = this.dayCellContainer.scrollTop;
                        
                        if (scrollDelta > 0 && isAtScrollTop(this.dayCellContainer, EventCalendar.LOAD_MORE_SCROLL_TOLERANCE)) {
                            if (!loadingBefore) {
                                loadingBefore = true;
                                const prevFirstDate = new Date(firstDate);
                                firstDate.setDate(firstDate.getDate() - EventCalendar.LOAD_MORE_TIMESPAN_DAYS);
                                this.extendDayCells(newDays, firstDate, prevFirstDate, "before")
                                .then(([extensionCells, numLeft]) => {
                                    this.dayCellContainer.prepend(...extensionCells.filter(ec => ec.events.length !== 0).map(ec => ec.element));
                                    this.dayCellContainer.prepend(loadBefore);
                                    const scrollY = extensionCells.map(dc => dc.element).filter(e => this.dayCellContainer.contains(e)).reduce((prev,curr) => prev + curr.clientHeight, 0);
                                    this.dayCellContainer.scrollTo(0, scrollY - 2);
                                    
                                    if (numLeft === 0) {
                                        loadBefore.innerText = `Geen activiteiten voor ${DATE_FORMATS.DAY.LONG(newDays.find(ec => ec.events.length !== 0)!.date)}`;
                                        loadBefore.classList.add("no-more");
                                    }
                                    else loadingBefore = false;
                                })
                                .catch(console.warn);
                            }
                        }
                        else if (scrollDelta < 0 && isAtScrollBottom(this.dayCellContainer, EventCalendar.LOAD_MORE_SCROLL_TOLERANCE)) {
                            if (!loadingAfter) {
                                loadingAfter = true;
                                const prevLastDate = new Date(lastDate);
                                lastDate.setDate(lastDate.getDate() + EventCalendar.LOAD_MORE_TIMESPAN_DAYS);
                                this.extendDayCells(newDays, prevLastDate, lastDate, "after")
                                .then(([extensionCells, numLeft]) => {
                                    this.dayCellContainer.append(...extensionCells.filter(ec => ec.events.length !== 0).map(ec => ec.element));
                                    this.dayCellContainer.append(loadAfter);
                                    const scrollY = extensionCells.map(dc => dc.element).filter(e => this.dayCellContainer.contains(e)).reduce((prev,curr) => prev + curr.clientHeight, 0);
                                    
                                    if (numLeft === 0) {
                                        loadAfter.innerText = `Geen activiteiten na ${DATE_FORMATS.DAY.LONG(newDays.findLast(ec => ec.events.length !== 0)!.date)}`;
                                        loadAfter.classList.add("no-more");
                                    }
                                    else loadingAfter = false;
                                })
                                .catch(console.warn);
                            }
                            
                        }

                    }
                    this.dayCellContainer.addEventListener("scroll", this.scrollEventListener);
                });
                break;
        }

        // insert event-notes
        this.db.getRange(firstDate, lastDate)
        .then(events => this.insertEventNotes(events, newDays, viewMode))
        .catch(console.error);
    }

    private insertEventNotes(events:EventInfo[], dayCells:DayCell[], viewMode:calendarViewMode) {
        switch (viewMode) {
            case "week":
            case "month":
                const offsets = computeNonOverlappingOffsets(events);
                // this.dayCellContainer.style.setProperty("--max-overlap", (Math.max(0, ...Object.values(offsets)) + 1).toString());
    
                events.forEach(e => {
                    let cellInd = dayCells.findIndex(dc => isBetweenDays(dc.date, e.starts_at, e.ends_at));
                    if (cellInd !== -1) {
                        let daysLeft = spanInDays(dayCells[cellInd].date, e.ends_at);
                        for (let w = 1; daysLeft >= 1 && cellInd < dayCells.length; w ++) {
                            dayCells[cellInd].events.push(e);
                            dayCells[cellInd].element.style.zIndex = (dayCells.length - cellInd + 1).toString();
                            const note = dayCells[cellInd].element.appendChild(new EventNote(e, VIEWMODE_LODS[viewMode]));
                            note.classList.add("click-action");
                            note.style.setProperty("--length", daysLeft.toString());
                            note.style.setProperty("--offset", offsets[e.id].toString());
                            if (dayEarlierThan(e.starts_at, dayCells[cellInd].date)) note.classList.add("starts-in-earlier-week");
    
                            note.addEventListener("click", () => EventCalendar.expandNote(note) );
                            
                            do { // find next Monday
                                cellInd++;
                                daysLeft--;
                            } while (daysLeft >= 1 && cellInd < dayCells.length && dayCells[cellInd].date.getDay() !== 1);
                        }
                    }
                });

                dayCells.forEach(dc => {
                    dc.element.style.setProperty("--max-overlap", (findMaxOverlap(dc.date, events, offsets) + 1).toString());
                });
                break;
            case "list":
                events.forEach(e => {
                    let cellInd = dayCells.findIndex(dc => isBetweenDays(dc.date, e.starts_at, e.ends_at));
                    
                    if (cellInd !== -1) {
                        let daysLeft = spanInDays(dayCells[cellInd].date, e.ends_at);
                        while (cellInd < dayCells.length && daysLeft >= 1) {
                            dayCells[cellInd].events.push(e);
                            const note = dayCells[cellInd].element.appendChild(new EventNote(e, VIEWMODE_LODS[viewMode]));
                            note.classList.add("click-action");
                            note.style.setProperty("--length", '1');
                            note.addEventListener("click", () => EventCalendar.expandNote(note) );

                            cellInd++;
                            daysLeft--;
                        }
                    }
                });

                dayCells.forEach(dc => {
                    if (dc.events.length === 0) dc.element.parentElement?.removeChild(dc.element);
                });

                const loadersHeight = this.dayCellContainer.scrollHeight - dayCells.reduce((prev,curr) => prev + curr.element.scrollHeight, 0);
                

                break;
        }
    }

}

customElements.define("event-calendar", EventCalendar);