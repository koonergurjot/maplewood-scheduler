import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { formatDateLong, combineDateTime, minutesBetween } from "../lib/dates";
import { deadlineFor, pickWindowMinutes, fmtCountdown } from "../lib/vacancy";
export default function BundleRow({ groupId, items, settings, selectedIds, onToggleSelectMany, onDeleteMany, dueNextId, }) {
    // Sort children by date/time to find the FIRST shift
    const sorted = React.useMemo(() => {
        return [...items].sort((a, b) => {
            const aDt = combineDateTime(a.shiftDate, a.shiftStart).getTime();
            const bDt = combineDateTime(b.shiftDate, b.shiftStart).getTime();
            return aDt - bDt;
        });
    }, [items]);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    // Countdown & color based on FIRST shift only
    const now = Date.now();
    const msLeft = deadlineFor(first, settings).getTime() - now;
    const winMin = pickWindowMinutes(first, settings);
    const sinceKnownMin = minutesBetween(new Date(), new Date(first.knownAt));
    const pct = Math.max(0, Math.min(1, (winMin - sinceKnownMin) / winMin));
    let cdClass = "cd-green";
    if (msLeft <= 0)
        cdClass = "cd-red";
    else if (pct < 0.25)
        cdClass = "cd-yellow";
    // Selection state: checked if ALL children are selected
    const childIds = sorted.map(v => v.id);
    const allSelected = childIds.every(id => selectedIds.includes(id));
    const toggleBundle = () => {
        if (allSelected)
            onToggleSelectMany(childIds.filter(id => !id.startsWith("__"))); // unselect all
        else
            onToggleSelectMany(childIds); // select all
    };
    const handleDelete = () => onDeleteMany(childIds);
    const isDueNext = dueNextId ? childIds.includes(dueNextId) : false;
    return (_jsxs("tr", { "data-bundle-id": groupId, className: isDueNext ? "due-next" : undefined, children: [_jsx("td", { children: _jsx("input", { type: "checkbox", "aria-label": "Select bundle", checked: allSelected, onChange: toggleBundle }) }), _jsx("td", { children: _jsxs("div", { style: { display: "flex", flexDirection: "column" }, children: [_jsxs("div", { style: { fontWeight: 600 }, children: [formatDateLong(first.shiftDate), " \u2192 ", formatDateLong(last.shiftDate)] }), _jsxs("div", { style: { fontSize: 12, opacity: 0.85 }, children: [items.length, " days \u2022 ", first.wing ?? "Wing", " \u2022 ", first.classification] })] }) }), _jsx("td", { children: _jsx("div", { className: `countdown ${cdClass}`, title: "Time left for first day", children: fmtCountdown(msLeft) }) }), _jsxs("td", { style: { textAlign: "right" }, children: [_jsx("button", { className: "btn btn-sm", onClick: toggleBundle, title: "Select all days", children: "Select" }), _jsx("button", { className: "btn btn-sm danger", onClick: handleDelete, title: "Delete all days", children: "Delete" })] })] }));
}
