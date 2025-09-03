import { formatDateLong, combineDateTime } from "./dates";
import { getDatesInRange } from "../utils/date";
export const displayVacancyLabel = (v) => {
    const d = formatDateLong(v.shiftDate);
    return `${d} • ${v.shiftStart}–${v.shiftEnd} • ${v.wing ?? ""} • ${v.classification}`.replace(/\s+•\s+$/, "");
};
export function pickWindowMinutes(v, settings) {
    const known = new Date(v.knownAt);
    const shiftStart = combineDateTime(v.shiftDate, v.shiftStart);
    const hrsUntilShift = (shiftStart.getTime() - known.getTime()) / 3600000;
    if (hrsUntilShift < 2)
        return settings.responseWindows.lt2h;
    if (hrsUntilShift < 4)
        return settings.responseWindows.h2to4;
    if (hrsUntilShift < 24)
        return settings.responseWindows.h4to24;
    if (hrsUntilShift < 72)
        return settings.responseWindows.h24to72;
    return settings.responseWindows.gt72;
}
export function deadlineFor(v, settings) {
    const winMin = pickWindowMinutes(v, settings);
    return new Date(new Date(v.knownAt).getTime() + winMin * 60000);
}
export function getVacancyActiveDates(v) {
    if (Array.isArray(v.coverageDates) && v.coverageDates.length > 0) {
        return v.coverageDates;
    }
    const start = v.startDate ?? v.shiftDate;
    const end = v.endDate ?? v.shiftDate;
    return getDatesInRange(start, end);
}
export function fmtCountdown(msLeft) {
    const neg = msLeft < 0;
    const abs = Math.abs(msLeft);
    const totalSec = Math.floor(abs / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const core = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
    return neg ? `Due ${core} ago` : core;
}
export const applyAwardVacancy = (vacs, vacId, payload) => {
    const empId = payload.empId === "EMPTY" ? undefined : payload.empId;
    return vacs.map((v) => v.id === vacId
        ? {
            ...v,
            status: "Filled",
            awardedTo: empId,
            awardedAt: new Date().toISOString(),
            awardReason: payload.reason,
            overrideUsed: !!payload.overrideUsed,
        }
        : v);
};
export const applyAwardVacancies = (vacs, vacIds, payload) => {
    return vacIds.reduce((prev, id) => applyAwardVacancy(prev, id, payload), vacs);
};
export const archiveBidsForVacancy = (bids, archived, vacancyId) => {
    const remaining = [];
    const moved = [];
    for (const b of bids) {
        if (b.vacancyId === vacancyId)
            moved.push(b);
        else
            remaining.push(b);
    }
    if (!moved.length)
        return { bids: remaining, archivedBids: archived };
    return {
        bids: remaining,
        archivedBids: {
            ...archived,
            [vacancyId]: [...(archived[vacancyId] ?? []), ...moved],
        },
    };
};
