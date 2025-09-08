import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState, useEffect } from "react";
function addDaysISO(iso, n) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
}
function startOfWeekISO(iso) {
    const d = new Date(iso + "T00:00:00");
    const day = d.getDay(); // 0 Sun..6 Sat
    d.setDate(d.getDate() - ((day + 6) % 7)); // make Monday start; for Sunday-start use 'day'
    return d.toISOString().slice(0, 10);
}
function endOfWeekISO(iso) {
    const start = new Date(startOfWeekISO(iso) + "T00:00:00");
    start.setDate(start.getDate() + 6);
    return start.toISOString().slice(0, 10);
}
function formatShort(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function weekdayLabel(i) { return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]; }
function BodyScrollLock() {
    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previous;
        };
    }, []);
    return null;
}
export default function CoverageDaysModal({ open, startDate, endDate, defaultStart, defaultEnd, classification, initial, onSave, onClose }) {
    if (!open)
        return null;
    // Build a week-grid (calendar) that fully covers the range
    const grid = useMemo(() => {
        const start = startOfWeekISO(startDate);
        const end = endOfWeekISO(endDate);
        const days = [];
        for (let d = start; d <= end; d = addDaysISO(d, 1))
            days.push(d);
        // chunk into weeks of 7
        const weeks = [];
        for (let i = 0; i < days.length; i += 7)
            weeks.push(days.slice(i, i + 7));
        return weeks;
    }, [startDate, endDate]);
    // All in-range dates
    const inRangeSet = useMemo(() => {
        const set = new Set();
        for (let d = startDate; d <= endDate; d = addDaysISO(d, 1))
            set.add(d);
        return set;
    }, [startDate, endDate]);
    // Selection + overrides
    const [selected, setSelected] = useState(() => {
        // default: all in range selected
        const seed = {};
        grid.flat().forEach(d => { seed[d] = inRangeSet.has(d) ? true : false; });
        if (initial?.selectedDates?.length) {
            const chosen = new Set(initial.selectedDates);
            grid.flat().forEach(d => { seed[d] = chosen.has(d); });
        }
        return seed;
    });
    const [perDayTimes, setPerDayTimes] = useState(() => {
        const t = {};
        grid.flat().forEach(d => {
            t[d] = initial?.perDayTimes?.[d] ?? { start: defaultStart, end: defaultEnd };
        });
        return t;
    });
    const [perDayWing, setPerDayWing] = useState(() => {
        const w = {};
        grid.flat().forEach(d => { w[d] = initial?.perDayWing?.[d] ?? ""; });
        return w;
    });
    const toggle = (d) => {
        if (!inRangeSet.has(d))
            return;
        setSelected(s => ({ ...s, [d]: !s[d] }));
    };
    const selectAll = () => {
        setSelected(s => {
            const next = { ...s };
            grid.flat().forEach(d => { if (inRangeSet.has(d))
                next[d] = true; });
            return next;
        });
    };
    const selectNone = () => {
        setSelected(s => {
            const next = { ...s };
            grid.flat().forEach(d => { if (inRangeSet.has(d))
                next[d] = false; });
            return next;
        });
    };
    const applyFourOnTwoOff = () => {
        let onCount = 0;
        setSelected(s => {
            const next = { ...s };
            // cadence across the in-range days in chronological order
            const seq = [];
            for (let d = startDate; d <= endDate; d = addDaysISO(d, 1))
                seq.push(d);
            seq.forEach(d => {
                next[d] = onCount < 4;
                onCount = (onCount + 1) % 6;
            });
            return next;
        });
    };
    const save = () => {
        const chosen = grid.flat().filter(d => selected[d] && inRangeSet.has(d));
        onSave({
            selectedDates: chosen,
            perDayTimes: Object.fromEntries(chosen.map(d => [d, perDayTimes[d]])),
            perDayWing: Object.fromEntries(chosen.map(d => [d, perDayWing[d] ?? ""])),
        });
    };
    return (_jsxs("div", { className: "modal-overlay", role: "dialog", "aria-modal": "true", children: [_jsx(BodyScrollLock, {}), _jsxs("div", { className: "modal", children: [_jsxs("div", { className: "modal-h", children: ["Coverage days \u2022 Class: ", classification] }), _jsxs("div", { style: { display: "flex", gap: 8, marginBottom: 8 }, children: [_jsx("button", { className: "btn btn-sm", onClick: selectAll, children: "All" }), _jsx("button", { className: "btn btn-sm", onClick: selectNone, children: "None" }), _jsx("button", { className: "btn btn-sm", onClick: applyFourOnTwoOff, children: "4-on / 2-off" })] }), _jsxs("div", { className: "calendar", children: [["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((h) => (_jsx("div", { className: "cal-head", children: h }, h))), grid.map((week, wi) => week.map((d, di) => {
                                const disabled = !inRangeSet.has(d);
                                const isSel = !!selected[d] && !disabled;
                                return (_jsx("div", { className: `day ${isSel ? "selected" : ""} ${disabled ? "disabled" : ""}`, onClick: () => toggle(d), children: _jsx("div", { className: "day-label", children: formatShort(d) }) }, `${wi}-${di}`));
                            }))] }), _jsx("div", { style: { marginTop: 12, maxHeight: 220, overflow: "auto" }, children: grid.flat().filter(d => selected[d] && inRangeSet.has(d)).map(d => (_jsxs("div", { className: "row", style: { display: "grid", gridTemplateColumns: "160px 100px 100px 1fr", gap: 8, alignItems: "center", padding: "4px 0" }, children: [_jsx("div", { children: formatShort(d) }), _jsx("input", { type: "time", value: perDayTimes[d].start, onChange: (e) => setPerDayTimes(t => ({ ...t, [d]: { ...t[d], start: e.target.value } })) }), _jsx("input", { type: "time", value: perDayTimes[d].end, onChange: (e) => setPerDayTimes(t => ({ ...t, [d]: { ...t[d], end: e.target.value } })) }), _jsx("input", { placeholder: "Wing (optional)", value: perDayWing[d] ?? "", onChange: (e) => setPerDayWing(w => ({ ...w, [d]: e.target.value })) })] }, `ovr-${d}`))) }), _jsxs("div", { className: "modal-f", style: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }, children: [_jsx("button", { className: "btn", onClick: onClose, children: "Cancel" }), _jsx("button", { className: "btn primary", onClick: save, children: "Save" })] })] })] }));
}
