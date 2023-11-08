import { EventInfo } from "../firebase/database/database-def";

export function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() == b.getMonth()
        && a.getDate() === b.getDate();
}

export function isWeekend(d:Date) {
    return d.getDay() === 0 || d.getDay() === 6;
}

export function isBetweenDays(date: Date, start: Date, end: Date) {
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    start = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    end = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

export function daysOverlap(a: EventInfo, b: EventInfo) {
    return isBetweenDays(a.starts_at, b.starts_at, b.ends_at) || isBetweenDays(a.ends_at, b.starts_at, b.ends_at);
}

export function timespansOverlap(aFrom:Date, aTo:Date, bFrom:Date, bTo:Date) {
    return bTo.getTime() >= aFrom.getTime() && bFrom.getTime() <= aTo.getTime();
}

/**
 * Determines whether the day 'a' falls in is an earlier one than that of 'b'.
 * @param a Date 'a'
 * @param b Date 'b'
 * @returns true if day of 'a' < day of 'b'
 */
export function dayEarlierThan(a:Date, b:Date) {
    return a.getFullYear() < b.getFullYear()
        || (a.getFullYear() === b.getFullYear() && a.getMonth() < b.getMonth())
        || (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() < b.getDate());
}

/**
 * Determines whether the day 'a' falls in is a later one than that of 'b'.
 * @param a Date 'a'
 * @param b Date 'b'
 * @returns true if day of 'a' > day of 'b'
 */
export function dayLaterThan(a:Date, b:Date) {
    return a.getFullYear() > b.getFullYear()
        || (a.getFullYear() === b.getFullYear() && a.getMonth() > b.getMonth())
        || (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() > b.getDate());
}

/** Determines whether the day 'a' falls in is the same or an earlier one than that of 'b'. */
function dayEarlierOrSame(a:Date, b:Date) {
    return isSameDay(a,b) || dayEarlierThan(a,b);
}

/** Determines whether the day 'a' falls in is the same or a later one than that of 'b'. */
function dayLaterOrSame(a:Date, b:Date) {
    return isSameDay(a,b) || dayLaterThan(a,b);
}

export function timespansDaysOverlap(aFrom:Date, aTo:Date, bFrom:Date, bTo:Date) {
    return dayLaterOrSame(bTo, aFrom) && dayEarlierOrSame(bFrom, aTo);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
export function spanInDays(from: Date, to: Date) {
    if (from.getTime() > to.getTime()) [from, to] = [to, from];

    const d = new Date(from);
    let out = 1;
    while (!(d.getFullYear() === to.getFullYear() && d.getMonth() === to.getMonth() && d.getDate() === to.getDate())) {
        out++;
        d.setDate(d.getDate() + 1);
    }
    return out;
}

export function areFullDays(from:Date, to:Date, useMilliseconds=false) {
    return from.getHours() === 0
        && from.getMinutes() === 0
        && from.getSeconds() === 0
        && (!useMilliseconds || from.getMilliseconds() === 0)
        && to.getHours() === 23
        && to.getMinutes() === 59
        && to.getSeconds() === 59
        && (!useMilliseconds || to.getMilliseconds() === 999)
}