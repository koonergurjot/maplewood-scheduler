import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useMemo, useState } from "react";
import { formatDateLong, combineDateTime } from "../lib/dates";
import { CellSelect, CellDetails, CellCountdown, CellActions, } from "./rows/RowCells";
export default function BundleRow({ groupId, items, employees, settings, recommendations, selectedIds, onToggleSelectMany, onDeleteMany, onSplitBundle, onAwardBundle, onEditCoverage, onResetBundle, dueNextId, coveredName, }) {
    const sorted = useMemo(() => [...items].sort((a, b) => combineDateTime(a.shiftDate, a.shiftStart).getTime() -
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
    const candidates = (rec === null || rec === void 0 ? void 0 : rec.candidates) ?? [];
    const hasCandidates = candidates.length > 0;
    const [activeIndex, setActiveIndex] = useState(0);
    useEffect(() => {
        setActiveIndex(0);
    }, [rec]);
    useEffect(() => {
        if (activeIndex >= candidates.length && candidates.length > 0) {
            setActiveIndex(candidates.length - 1);
        }
    }, [activeIndex, candidates.length]);
    const activeCandidate = candidates[activeIndex];
    const recId = (activeCandidate === null || activeCandidate === void 0 ? void 0 : activeCandidate.id) ?? (rec === null || rec === void 0 ? void 0 : rec.id);
    const recWhy = (activeCandidate === null || activeCandidate === void 0 ? void 0 : activeCandidate.why) ?? (rec === null || rec === void 0 ? void 0 : rec.why) ?? [];
    const recEmp = recId ? employees.find((e) => e.id === recId) : undefined;
    const recName = recEmp
        ? `${recEmp.firstName ?? ""} ${recEmp.lastName ?? ""}`.trim()
        : recId ?? "—";
    const distinctWings = Array.from(new Set(sorted.map((v) => v.wing).filter(Boolean)));
    const multipleWings = distinctWings.length > 1;
    const [open, setOpen] = useState(false);
    const [awardOpen, setAwardOpen] = useState(false);
    const cycle = (dir) => {
        if (!hasCandidates)
            return;
        setActiveIndex((idx) => {
            const next = (idx + dir + candidates.length) % candidates.length;
            return next;
        });
    };
    return (_jsxs(_Fragment, { children: [_jsxs("tr", { id: `bundle-${groupId}`, "data-bundle-id": groupId, className: `${isDueNext ? "due-next " : ""}${allSelected ? "selected" : ""}`.trim(), children: [_jsx(CellSelect, { checked: allSelected, onChange: toggleAll, ariaLabel: "Select bundle" }), _jsx(CellDetails, { title: _jsxs("div", { style: { fontWeight: 600, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [_jsxs("span", { className: "pill", children: [items.length, " days"] }), _jsx("span", { className: "pill", title: "First day", children: formatDateLong(primary.shiftDate) }), _jsxs("span", { children: [primary.classification, open ? ` • ${wingText}${coverText}` : ""] })] }), subtitle: _jsx("div", { style: {
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                        }, children: _jsx("span", { className: "subtitle", children: rangeLabel }) }), rightTag: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [recId ? (_jsx("span", { className: "pill", style: { cursor: "pointer" }, title: recName, onClick: () => (activeCandidate === null || activeCandidate === void 0 ? void 0 : activeCandidate.id) && (onAwardBundle === null || onAwardBundle === void 0 ? void 0 : onAwardBundle(activeCandidate.id)), children: recName })) : (_jsx("span", { className: "subtitle", children: "—" })), hasCandidates && candidates.length > 1 && (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [_jsx("button", { type: "button", className: "btn btn-sm", style: { padding: "2px 6px" }, onClick: () => cycle(-1), "aria-label": "Previous bundle recommendation", children: "◀" }), _jsxs("span", { className: "subtitle", "aria-live": "polite", children: [activeIndex + 1, "/", candidates.length] }), _jsx("button", { type: "button", className: "btn btn-sm", style: { padding: "2px 6px" }, onClick: () => cycle(1), "aria-label": "Next bundle recommendation", children: "▶" })] })), multipleWings && (_jsx("span", { className: "pill", title: distinctWings.join(", "), children: "Multiple wings" })), recWhy.map((w, i) => (_jsx("span", { className: "pill", children: w }, i)))] }) }), _jsx(CellCountdown, { source: primary, settings: settings }), _jsx(CellActions, { children: _jsxs("div", { className: "action-grid", children: [_jsx("button", { className: "btn btn-sm", onClick: () => setAwardOpen((o) => !o), children: awardOpen ? "Hide Award" : "Award Bundle" }), awardOpen && (_jsx(InlineEmployeePicker, { employees: employees, value: (activeCandidate === null || activeCandidate === void 0 ? void 0 : activeCandidate.id) ?? "", onChange: (id) => onAwardBundle === null || onAwardBundle === void 0 ? void 0 : onAwardBundle(id) })), _jsx("button", { className: "btn btn-sm", onClick: () => setOpen((o) => !o), children: open ? "Hide" : "Expand" }), onEditCoverage && (_jsx("button", { className: "btn btn-sm", onClick: () => onEditCoverage(groupId), children: "Edit coverage" })), _jsx("button", { className: "btn btn-sm", onClick: async () => { if (await (window === null || window === void 0 ? void 0 : window.appShowConfirm)?.(`Split this bundle into ${childIds.length} individual shifts?`, "Split bundle"))
                            onSplitBundle(childIds); }, children: "Split" }), onResetBundle && (_jsx("button", { className: "btn btn-sm", onClick: () => onResetBundle(groupId), children: "Reset timers" })), _jsx("button", { className: "btn btn-sm danger", onClick: () => onDeleteMany(childIds), children: "Delete" })] }) })] }), open && (_jsxs("tr", { children: [_jsx("td", {}), _jsx("td", { colSpan: 3, children: _jsx("div", { className: "bundle-expand", children: sorted.map((v, i) => (_jsxs("div", { style: {
                                display: "flex",
                                gap: 8,
                                padding: "4px 0",
                                borderTop: i === 0 ? undefined : "1px solid var(--stroke)",
                            }, children: [_jsx("div", { style: { minWidth: 160 }, children: formatDateLong(v.shiftDate) }), _jsxs("div", { style: { minWidth: 100 }, children: [v.shiftStart, "–", v.shiftEnd] }), _jsx("div", { style: { minWidth: 100 }, children: v.wing ?? "-" })] }, v.id))) }) })] }))] }));
}
function InlineEmployeePicker({ employees, value, onChange }) {
    const [q, setQ] = useState("");
    const recommended = useMemo(() => employees.find((e) => e.id === value), [employees, value]);
    const placeholder = (recommended ? `${recommended.firstName ?? ""} ${recommended.lastName ?? ""}`.trim() || recommended.id : "Type name…") || "Type name…";
    useEffect(() => {
        setQ("");
    }, [value]);
    const list = useMemo(() => employees
        .filter((e) => `${e.firstName} ${e.lastName}`.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 50), [employees, q]);
    return (_jsxs("div", { className: "dropdown", children: [_jsx("input", { placeholder: placeholder, value: q, onChange: (e) => setQ(e.target.value), onFocus: () => { } }), _jsxs("div", { className: "menu", style: { maxHeight: 240, overflow: "auto" }, children: [list.map((e) => (_jsxs("button", { type: "button", className: "item", onClick: () => {
                        onChange(e.id);
                        setQ("");
                    }, children: [e.firstName, " ", e.lastName] }, e.id))), !list.length && _jsx("div", { className: "item", style: { opacity: .7 }, children: "No matches" })] })] }));
}
