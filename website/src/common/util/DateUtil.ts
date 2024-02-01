import { EventInfo } from "../firebase/database/events/EventDatabase";
import ObjectUtil from "./ObjectUtil";

type WeekDay = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
const WEEK_DAY_INDICES:Record<WeekDay,number> = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sunday: 0
};
Object.freeze(WEEK_DAY_INDICES);

type Timespan = [Date,Date];

export default abstract class DateUtil {

    /** The earliest possible representable Date. */
    public static get FIRST() { return new Date(-8640000000000000); }
    /** The latest possible representable Date. */
    public static get LAST() { return new Date(8640000000000000); }

    /** Methods related to days. */
    public static readonly Days = {
        /** Finds the first of a certain weekday before the given Date. */
        firstBefore(d:Date, day:WeekDay):Date {
            const ind = WEEK_DAY_INDICES[day];
        
            const out = new Date(d);
            while (out.getDay() !== ind) out.setDate(out.getDate() - 1);
            out.setHours(0,0,0,0);
        
            return out;
        },

        /** Finds the first of a certain weekday after the given Date. */
        firstAfter(d:Date, day:WeekDay):Date {
            const ind = WEEK_DAY_INDICES[day];
        
            const out = new Date(d);
            while (out.getDay() !== ind) out.setDate(out.getDate() + 1);
            out.setHours(0,0,0,0);
        
            return out;
        },

        /** Wether the two given Dates fall on the same date. */
        isSame(a:Date, b:Date):boolean {
            return a.getFullYear() === b.getFullYear()
                && a.getMonth() === b.getMonth()
                && a.getDate() === b.getDate();
        },

        /** Whether the given date is on Saturday or Sunday. */
        isWeekend(d:Date) {
            return d.getDay() === 0 || d.getDay() === 6;
        },

        /**
         * Determines whether ```date``` is between the dates which ```start``` and ```end``` fall in.
         * @param date
         * @param start Date within starting date
         * @param end Date within ending date
         * @returns true ```date``` falls between the dates of ```start``` and ```end```
         */
        isBetween(date: Date, start: Date, end: Date) {
            [date, start, end] = [date, start, end].map(DateUtil.Timestamps.copy);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return date >= start && date <= end;
        },

        /**
         * Determines whether the day 'a' falls in is an earlier one than that of 'b'.
         * @param a Date 'a'
         * @param b Date 'b'
         * @returns true if day of 'a' < day of 'b'
         */
        earlierThan(a:Date, b:Date) {
            return a.getFullYear() < b.getFullYear()
                || (a.getFullYear() === b.getFullYear() && a.getMonth() < b.getMonth())
                || (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() < b.getDate());
        },

        /** Determines whether the day 'a' falls in is the same or an earlier one than that of 'b'. */
        earlierOrSame(a:Date, b:Date) {
            return this.isSame(a,b) || this.earlierThan(a,b);
        },

        /**
         * Determines whether the day 'a' falls in is a later one than that of 'b'.
         * @param a Date 'a'
         * @param b Date 'b'
         * @returns true if day of 'a' > day of 'b'
         */
        laterThan(a:Date, b:Date) {
            return a.getFullYear() > b.getFullYear()
                || (a.getFullYear() === b.getFullYear() && a.getMonth() > b.getMonth())
                || (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() > b.getDate());
        },

        /** Determines whether the day 'a' falls in is the same or a later one than that of 'b'. */
        laterOrSame(a:Date, b:Date) {
            return this.isSame(a,b) || this.laterThan(a,b);
        },

        /**
         * Determines how many days the range of [from, to] falls in.
         * @param from
         * @param to
         * @returns number of days [from, to] falls in
         */
        spanInDays(from: Date, to: Date) {
            if (from > to) [from, to] = [to, from]; // put in correct order
        
            const d = new Date(from);
            let out = 1;
            while (!DateUtil.Days.isSame(d, to)) {
                out++;
                d.setDate(d.getDate() + 1);
            }
            return out;
        },

        /**
         * Computes a range of dates.
         * @param start starting date
         * @param end either the end date, or the amount of days
         * @returns array of all days [start, end] falls in
         */
        getRange(start:Date, end:Date|number):Date[] {
            start = new Date(start); // copy value
            start.setHours(0,0,0,0);
            if (typeof end === "number") {
                const numDays = end;
                end = new Date(start);
                end.setDate(end.getDate() + numDays);
            }
            else end = new Date(end); // copy value

            if (start > end) return [];

            const out:Date[] = [];
            do {
                out.push(new Date(start));
                start.setDate(start.getDate() + 1);
            } while (!DateUtil.Days.isSame(start,end));
            return out;
        }
    
    };

    /** Methods that deal ranges of timestamps. */
    public static readonly Timespans = {
        /**
         * Determines whether the given timespans overlap.
         * @param a first timespan
         * @param b second timespan
         * @returns true if ```a``` and ```b``` overlap
         */
        overlap(a:Timespan, b:Timespan):boolean {
            return b[1] >= a[0] && b[0] <= a[1];
        },

        /**
         * Determines whether any days within the given timespans overlap.
         * @param a first timespan
         * @param b second timespan
         * @returns true if days of ```a``` and ```b``` overlap
         */
        daysOverlap(a:Timespan, b:Timespan) {
            return DateUtil.Days.laterOrSame(b[1], a[0]) && DateUtil.Days.earlierOrSame(b[0], a[1]);
        },

        /**
         * Whether the given timespan starts on midnight and ends just before midnight.
         * @param timespan
         * @param useMilliseconds whether to consider milliseconds
         */
        areFullDays(timespan:Timespan, useMilliseconds=false) {
            const [from, to] = timespan;
            return from.getHours() === 0
                && from.getMinutes() === 0
                && from.getSeconds() === 0
                && (!useMilliseconds || from.getMilliseconds() === 0)
                && to.getHours() === 23
                && to.getMinutes() === 59
                && to.getSeconds() === 59
                && (!useMilliseconds || to.getMilliseconds() === 999)
        }
    };

    /** Methods that deal with exact moments in time. */
    public static Timestamps = {
        /** Determines the earliest of the given Date objects. */
        earliest(d1:Date, ...dRest:Date[]) {
            let earliest = d1;
            dRest.forEach(d => earliest = d < earliest ? d : earliest);
            return earliest;
        },
        
        /** Determines the latest of the given Date objects. */
        latest(d1:Date, ...dRest:Date[]) {
            let earliest = d1;
            dRest.forEach(d => earliest = d > earliest ? d : earliest);
            return earliest;
        },

        /** Gives the first moment before the given date. */
        justBefore(d:Date) {
            d = new Date(d);
            d.setMilliseconds(d.getMilliseconds() - 1);
            return d;
        },
        
        /** Gives the first moment after the given date. */
        justAfter(d:Date) {
            d = new Date(d);
            d.setMilliseconds(d.getMilliseconds() + 1);
            return d;
        },

        /**
         * Computes a timestamp from the value of a date-type input and a time-type input/
         * @param date date input / date input value
         * @param time time input / time input value
         * @returns timestamp from input values
         */
        fromInputs(date:HTMLInputElement|string, time:HTMLInputElement|string) {
            if (date instanceof HTMLInputElement) {
                if (date.type !== "date") throw new Error(`parameter 'date' is not a date input (is "${date.type}" instead)`);
                date = date.value;
            }
            if (time instanceof HTMLInputElement) {
                if (time.type !== "time") throw new Error(`parameter 'time' is not a time input (is "${time.type}" instead)`);
                time = time.value;
            }
        
            let [year, month, day] = date.split('-').map(s => Number.parseInt(s)).filter(n => !isNaN(n));
            year ||= 1970;
            month ||= 1;
            month --; // convert to index
            day ||= 1;
            
            let [hours, minutes, seconds, millis] = time.split(':').map(s => Number.parseInt(s)).filter(n => !isNaN(n));
            hours ||= 0;
            minutes ||= 0;
            seconds ||= 0;
            millis ||= 0;
        
            return new Date(year, month, day, hours, minutes, seconds, millis);
        },

        /** Makes a copy of the given timestamp. */
        copy(d:Date):Date {
            return new Date(d);
        },

        isValid(d:Date):boolean {
            return !isNaN(d.getTime());
        }

    };

    public static DATE_FORMATS = {
        DAY: {
            SHORT_NO_YEAR: (d:Date,lang="nl-NL") => d.toLocaleDateString(lang, {day:"numeric", month:"short"}),
            SHORT: (d:Date,lang="nl-NL") => d.toLocaleDateString(lang, {day:"numeric", month:"short", year:"numeric"}),
            MEDIUM: (d:Date,lang="nl-NL") => d.toLocaleDateString(lang, {dateStyle:"medium"}),
            LONG: (d:Date,lang="nl-NL") => d.toLocaleDateString(lang, {weekday:"long", day:"numeric", month:"long"})
        },
        TIME: {
            SHORT: (d:Date,lang="nl-NL") => d.toLocaleTimeString(lang, { timeStyle:"short" })
        },
        DAY_AND_TIME: {
            SHORT_NO_YEAR: (d:Date,lang="nl-NL") => `${DateUtil.DATE_FORMATS.DAY.SHORT_NO_YEAR(d,lang)} (${DateUtil.DATE_FORMATS.TIME.SHORT(d,lang)})`,
            SHORT: (d:Date,lang="nl-NL") => `${DateUtil.DATE_FORMATS.DAY.SHORT(d,lang)} (${DateUtil.DATE_FORMATS.TIME.SHORT(d,lang)})`
        },
        DURATION: {
            HOURS_AND_MINUTES: (start:Date, end:Date) => {
                let millis = end.getTime() - start.getTime();
                const hours = Math.floor(millis / 3600000);
                millis %= 3600000;
                const minutes = Math.round(millis / 60000);
    
                return `${hours} uur en ${minutes} minuten`
            }
        }
    };

    static {
        ObjectUtil.deepFreeze(this.Days);
        ObjectUtil.deepFreeze(this.Timespans);
        ObjectUtil.deepFreeze(this.Timestamps);
        ObjectUtil.deepFreeze(this.DATE_FORMATS);
    }

}