export function workingDays(range) {
    return [...(range.workingDays || [])].sort();
}
export function deadlineForRange(range, settings) {
    const days = workingDays(range);
    const first = days[0];
    const start = (range.perDayTimes && range.perDayTimes[first]?.start) ||
        range.shiftStart ||
        "06:30";
    const dt = new Date(`${first}T${start}:00`);
    const minutes = settings.responseWindows?.h4to24 ?? 30;
    const d = new Date(dt);
    d.setMinutes(d.getMinutes() - minutes);
    return d;
}
export function bidCoversAllDays(range, bid) {
    const days = new Set(workingDays(range));
    const selected = bid.selectedDays ?? [];
    const isFull = bid.coverageType === "full";
    const coversAll = isFull && selected.length === days.size && selected.every((d) => days.has(d));
    return Boolean(coversAll);
}
// Soft warnings:
// - same-day conflict: bidder already bid another thing on any selected day
// - stat/holiday reminder: show label if selected day is in provided set
export function evaluateBidWarnings(opts) {
    const out = [];
    const sel = new Set(opts.bid.selectedDays ?? []);
    const sameDayOther = (opts.allBids || []).some((b) => b.bidderEmployeeId === opts.bid.bidderEmployeeId &&
        b.vacancyId !== opts.bid.vacancyId &&
        (b.selectedDays ?? []).some((d) => sel.has(d)));
    if (sameDayOther)
        out.push("Bidder has another bid on at least one selected day.");
    if (opts.statDays && Array.from(sel).some((d) => opts.statDays.has(d))) {
        out.push("Reminder: One or more selected days are stat/holiday.");
    }
    return out;
}
