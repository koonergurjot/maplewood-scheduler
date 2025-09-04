import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from "react";
import { formatDateLong, combineDateTime } from "../lib/dates";
import EmployeePickerModal from "./EmployeePickerModal";
import { CellSelect, CellDetails, CellCountdown, CellActions } from "./rows/RowCells";
export default function BundleRow({ groupId, items, employees, settings, recommendations, selectedIds, onToggleSelectMany, onDeleteMany, onSplitBundle, onAwardBundle, onEditCoverage, dueNextId, }) {
    const sorted = React.useMemo(() => [...items].sort((a, b) => combineDateTime(a.shiftDate, a.shiftStart).getTime() -
        combineDateTime(b.shiftDate, b.shiftStart).getTime()), [items]);
    const primary = sorted[0];
    const childIds = sorted.map((v) => v.id);
    const allSelected = childIds.every((id) => selectedIds.includes(id));
    const toggleAll = () => onToggleSelectMany(childIds);
    const isDueNext = dueNextId ? childIds.includes(dueNextId) : false;
    const now = Date.now();
    const wingText = primary.wing ?? "Wing";
    const title = `${items.length} days • ${wingText} • ${primary.classification}`;
    const dateList = sorted.map((v) => formatDateLong(v.shiftDate)).join(", ");
    const rec = recommendations[primary.id];
    const recId = rec?.id;
    const recEmp = recId ? employees.find((e) => e.id === recId) : undefined;
    const recName = recEmp
        ? `${recEmp.firstName ?? ""} ${recEmp.lastName ?? ""}`.trim()
        : "";
    const [open, setOpen] = React.useState(false);
    const [pickOpen, setPickOpen] = React.useState(false);
    return (_jsxs(_Fragment, { children: [_jsxs("tr", { "data-bundle-id": groupId, className: `${isDueNext ? "due-next " : ""}${allSelected ? "selected" : ""}`.trim(), children: [_jsx(CellSelect, { checked: allSelected, onChange: toggleAll }), _jsx(CellDetails, { rightTag: recId ? (_jsx("span", { className: "pill", style: { cursor: "pointer" }, onClick: () => onAwardBundle?.(recId), children: recName })) : undefined, children: _jsxs("div", { style: { display: "flex", flexDirection: "column" }, children: [_jsx("div", { style: { fontWeight: 600 }, children: title }), _jsx("div", { className: "subtitle", style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: dateList })] }) }), _jsx(CellCountdown, { vacancy: primary, settings: settings, now: now }), _jsxs(CellActions, { children: [_jsx("button", { className: "btn btn-sm", onClick: () => setOpen((o) => !o), children: open ? "Hide" : "Expand" }), onEditCoverage && (_jsx("button", { className: "btn btn-sm", onClick: () => onEditCoverage(groupId), children: "Edit coverage" })), _jsx("button", { className: "btn btn-sm", onClick: () => setPickOpen(true), children: "Award Bundle" }), _jsx("button", { className: "btn btn-sm", onClick: () => onSplitBundle(childIds), children: "Split" }), _jsx("button", { className: "btn btn-sm danger", onClick: () => onDeleteMany(childIds), children: "Delete" })] })] }), _jsx(EmployeePickerModal, { open: pickOpen, employees: employees, classification: primary.classification, onClose: () => setPickOpen(false), onSelect: (eid) => {
            setPickOpen(false);
            onAwardBundle?.(eid);
        } }), open && (_jsxs("tr", { children: [_jsx("td", {}), _jsx("td", { colSpan: 3, children: _jsx("div", { className: "bundle-expand", children: sorted.map((v) => (_jsxs("div", { style: { display: "flex", gap: 8, padding: "4px 0" }, children: [_jsx("div", { style: { minWidth: 160 }, children: formatDateLong(v.shiftDate) }), _jsxs("div", { style: { minWidth: 100 }, children: [v.shiftStart, "\u2013", v.shiftEnd] }), _jsx("div", { style: { minWidth: 100 }, children: v.wing ?? "-" })] }, v.id))) }) })] }))] }));
}
