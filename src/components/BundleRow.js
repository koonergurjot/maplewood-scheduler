import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from "react";
import { formatDateLong, combineDateTime, minutesBetween } from "../lib/dates";
import { deadlineFor, pickWindowMinutes, fmtCountdown } from "../lib/vacancy";
export default function BundleRow({ groupId, items, settings, selectedIds, onToggleSelectMany, onDeleteMany, onSplitBundle, onAwardBundle, dueNextId, }) {
    const sorted = React.useMemo(() => [...items].sort((a, b) => combineDateTime(a.shiftDate, a.shiftStart).getTime() -
        combineDateTime(b.shiftDate, b.shiftStart).getTime()), [items]);
    const first = sorted[0];
    const childIds = sorted.map(v => v.id);
    const allSelected = childIds.every(id => selectedIds.includes(id));
    const toggleAll = () => onToggleSelectMany(childIds);
    const isDueNext = dueNextId ? childIds.includes(dueNextId) : false;
    // countdown from first day only
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
    const [open, setOpen] = React.useState(false);
    const explicitDates = sorted.map(v => formatDateLong(v.shiftDate)).join(", ");
    return (_jsxs(_Fragment, { children: [_jsxs("tr", { "data-bundle-id": groupId, className: isDueNext ? "due-next" : undefined, children: [_jsx("td", { children: _jsx("input", { type: "checkbox", checked: allSelected, onChange: toggleAll, "aria-label": "Select bundle" }) }), _jsx("td", { children: _jsxs("div", { style: { display: "flex", flexDirection: "column" }, children: [_jsxs("div", { style: { fontWeight: 600 }, children: [items.length, " days \u2022 ", first.wing ?? "Wing", " \u2022 ", first.classification] }), _jsx("div", { style: { fontSize: 12, opacity: 0.85 }, children: explicitDates })] }) }), _jsx("td", { children: _jsx("div", { className: `countdown ${cdClass}`, children: fmtCountdown(msLeft) }) }), _jsxs("td", { style: { textAlign: "right" }, children: [_jsx("button", { className: "btn btn-sm", onClick: () => setOpen(o => !o), children: open ? "Hide" : "Expand" }), onAwardBundle && _jsx("button", { className: "btn btn-sm", onClick: () => onAwardBundle("_PICK_IN_UI_"), children: "Award Bundle" }), _jsx("button", { className: "btn btn-sm", onClick: toggleAll, children: "Select" }), _jsx("button", { className: "btn btn-sm", onClick: () => onSplitBundle(childIds), children: "Split" }), _jsx("button", { className: "btn btn-sm danger", onClick: () => onDeleteMany(childIds), children: "Delete" })] })] }), open && (_jsxs("tr", { children: [_jsx("td", {}), _jsx("td", { colSpan: 3, children: _jsx("div", { className: "bundle-expand", children: sorted.map(v => (_jsxs("div", { style: { display: "flex", gap: 8, padding: "4px 0" }, children: [_jsx("div", { style: { minWidth: 160 }, children: formatDateLong(v.shiftDate) }), _jsxs("div", { style: { minWidth: 100 }, children: [v.shiftStart, "\u2013", v.shiftEnd] }), _jsx("div", { style: { minWidth: 100 }, children: v.wing ?? "-" })] }, v.id))) }) })] }))] }));
}
