import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from "react";
import { formatDateLong, combineDateTime } from "../lib/dates";
import { CellSelect, CellDetails, CellCountdown, CellActions, } from "./rows/RowCells";
export default function BundleRow({ groupId, items, employees, settings, recommendations, selectedIds, onToggleSelectMany, onDeleteMany, onSplitBundle, onAwardBundle, onEditCoverage, onResetBundle, dueNextId, coveredName, }) {
    const sorted = React.useMemo(() => [...items].sort((a, b) => combineDateTime(a.shiftDate, a.shiftStart).getTime() -
        combineDateTime(b.shiftDate, b.shiftStart).getTime()), [items]);
    const primary = sorted[0];
    const childIds = sorted.map((v) => v.id);
    const allSelected = childIds.every((id) => selectedIds.includes(id));
    const toggleAll = () => onToggleSelectMany(childIds);
    const isDueNext = dueNextId ? childIds.includes(dueNextId) : false;
    const wingText = primary.wing ?? "Wing";
    const coverText = coveredName ? ` • Covering ${coveredName}` : "";
    const first = sorted[0]?.shiftDate;
    const last = sorted[sorted.length - 1]?.shiftDate;
    const rangeLabel = first && last && first !== last
        ? `${formatDateLong(first)} – ${formatDateLong(last)}`
        : formatDateLong(first || primary.shiftDate);
    const dateList = sorted.map((v) => formatDateLong(v.shiftDate)).join(", ");
    const rec = recommendations[primary.id];
    const recId = rec?.id;
    const recWhy = rec?.why ?? [];
    const recEmp = recId ? employees.find((e) => e.id === recId) : undefined;
    const recName = recEmp
        ? `${recEmp.firstName ?? ""} ${recEmp.lastName ?? ""}`.trim()
        : "—";
    const distinctWings = Array.from(new Set(sorted.map((v) => v.wing).filter(Boolean)));
    const multipleWings = distinctWings.length > 1;
    const [open, setOpen] = React.useState(false);
    const [awardOpen, setAwardOpen] = React.useState(false);
    return (_jsxs(_Fragment, { children: [_jsxs("tr", { id: `bundle-${groupId}`, "data-bundle-id": groupId, className: `${isDueNext ? "due-next " : ""}${allSelected ? "selected" : ""}`.trim(), children: [_jsx(CellSelect, { checked: allSelected, onChange: toggleAll, ariaLabel: "Select bundle" }), _jsx(CellDetails, { title: _jsxs("div", { style: { fontWeight: 600, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [_jsxs("span", { className: "pill", children: [items.length, " days"] }), _jsx("span", { className: "pill", title: "First day", children: formatDateLong(primary.shiftDate) }), _jsxs("span", { children: [primary.classification, open ? ` • ${wingText}${coverText}` : ""] })] }), subtitle: _jsx("div", { style: {
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                flexWrap: "wrap",
                            }, children: _jsx("span", { className: "subtitle", children: rangeLabel }) }), rightTag: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [recId ? (_jsx("span", { className: "pill", style: { cursor: "pointer" }, title: recName, onClick: () => onAwardBundle?.(recId), children: recName })) : (_jsx("span", { className: "subtitle", children: "\u2014" })), multipleWings && (_jsx("span", { className: "pill", title: distinctWings.join(", "), children: "Multiple wings" })), recWhy.map((w, i) => (_jsx("span", { className: "pill", children: w }, i)))] }) }), _jsx(CellCountdown, { source: primary, settings: settings }), _jsx(CellActions, { children: _jsxs("div", { className: "action-grid", children: [_jsx("button", { className: "btn btn-sm", onClick: () => setAwardOpen((o) => !o), children: awardOpen ? "Hide Award" : "Award" }), awardOpen && (_jsx(InlineEmployeePicker, { employees: employees, value: "", onChange: (id) => onAwardBundle?.(id) })), _jsx("button", { className: "btn btn-sm", onClick: () => setOpen((o) => !o), children: open ? "Hide" : "Expand" }), onEditCoverage && (_jsx("button", { className: "btn btn-sm", onClick: () => onEditCoverage(groupId), children: "Edit coverage" })), _jsx("button", { className: "btn btn-sm", onClick: async () => { if (await window.appShowConfirm?.(`Split this bundle into ${childIds.length} individual shifts?`, "Split bundle"))
        onSplitBundle(childIds); }, children: "Split" }), onResetBundle && (_jsx("button", { className: "btn btn-sm", onClick: () => onResetBundle(groupId), children: "Reset timers" })), _jsx("button", { className: "btn btn-sm danger", onClick: () => onDeleteMany(childIds), children: "Delete" })] }) })] }), open && (_jsxs("tr", { children: [_jsx("td", {}), _jsx("td", { colSpan: 3, children: _jsx("div", { className: "bundle-expand", children: sorted.map((v, i) => (_jsxs("div", { style: {
                                    display: "flex",
                                    gap: 8,
                                    padding: "4px 0",
                                    borderTop: i === 0 ? undefined : "1px solid var(--stroke)",
                                }, children: [_jsx("div", { style: { minWidth: 160 }, children: formatDateLong(v.shiftDate) }), _jsxs("div", { style: { minWidth: 100 }, children: [v.shiftStart, "\u2013", v.shiftEnd] }), _jsx("div", { style: { minWidth: 100 }, children: v.wing ?? "-" })] }, v.id))) }) })] }))] }));
}
function InlineEmployeePicker({ employees, value, onChange }) {
    const [q, setQ] = React.useState("");
    const list = React.useMemo(() => employees.filter(e => `${e.firstName} ${e.lastName}`.toLowerCase().includes(q.toLowerCase())).slice(0, 50), [employees, q]);
    return (_jsxs("div", { className: "dropdown", children: [_jsx("input", { placeholder: "Type name\u2026", value: q, onChange: (e) => setQ(e.target.value), onFocus: () => { } }), q && (_jsxs("div", { className: "menu", style: { maxHeight: 240, overflow: "auto" }, children: [list.map(e => (_jsxs("div", { className: "item", onClick: () => { onChange(e.id); setQ(""); }, children: [e.firstName, " ", e.lastName] }, e.id))), !list.length && _jsx("div", { className: "item", style: { opacity: .7 }, children: "No matches" })] }))] }));
}
