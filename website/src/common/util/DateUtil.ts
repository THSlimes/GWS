import { EventInfo } from "../firebase/database/database-def";

export function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() == b.getMonth()
        && a.getDate() === b.getDate();
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