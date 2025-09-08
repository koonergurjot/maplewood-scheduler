import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { formatDateLong, formatDowShort } from "../lib/dates";
import { OVERRIDE_REASONS } from "../types";
import { matchText } from "../lib/text";
import CoverageChip from "./ui/CoverageChip";
import { TrashIcon } from "./ui/Icon";
import { CellSelect, CellDetails, CellCountdown, CellActions, } from "./rows/RowCells";
export default function VacancyRow({ v, recId, recName, recWhy, employees, selected, onToggleSelect, isDueNext, awardVacancy, resetKnownAt, onDelete, coveredName, settings, }) {
    const [choice, setChoice] = useState("");
    const [overrideClass, setOverrideClass] = useState(false);
    const [reason, setReason] = useState("");
    const [awardOpen, setAwardOpen] = useState(false);
    const isBundleChild = v.bundleMode === "one-person" && !!v.bundleId;
    const chosen = employees.find((e) => e.id === choice);
    const classMismatch = chosen && chosen.classification !== v.classification;
    const needReason = (!!recId && choice && choice !== recId) || (classMismatch && overrideClass);
    function handleAward() {
        if (classMismatch && !overrideClass) {
            alert(`Selected employee is ${chosen?.classification}; vacancy requires ${v.classification}. Check "Allow class override" to proceed.`);
            return;
        }
        if (needReason && !reason) {
            alert("Please select a reason for this override.");
            return;
        }
        awardVacancy({
            empId: choice || undefined,
            reason: reason || undefined,
            overrideUsed: overrideClass,
        });
        setChoice("");
        setReason("");
        setOverrideClass(false);
    }
    return (_jsxs("tr", { className: `${isDueNext ? "due-next " : ""}${selected ? "selected" : ""}`.trim(), "aria-selected": selected, tabIndex: 0, children: [_jsx(CellSelect, { checked: selected, onChange: onToggleSelect, ariaLabel: `Select vacancy ${v.id}` }), _jsx(CellDetails, { title: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [_jsxs("span", { children: [_jsx("span", { className: "pill", children: formatDowShort(v.shiftDate) }), " ", formatDateLong(v.shiftDate), " \u2022 ", v.shiftStart, "-", v.shiftEnd, coveredName && _jsxs(_Fragment, { children: [" \u2022 Covering ", coveredName] })] }), _jsx(CoverageChip, { startDate: v.startDate, endDate: v.endDate, coverageDates: v.coverageDates, variant: "compact" })] }), subtitle: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [v.wing && _jsx("span", { className: "pill", children: v.wing }), _jsx("span", { className: "pill", children: v.classification }), _jsx("span", { className: "pill", children: v.offeringStep })] }), rightTag: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [_jsx("span", { className: "subtitle truncate", title: recName, children: recName }), recWhy.map((w, i) => (_jsx("span", { className: "pill", children: w }, i)))] }) }), _jsx(CellCountdown, { source: v, settings: settings }), _jsx(CellActions, { children: isBundleChild ? (_jsxs("div", { className: "action-grid", children: [_jsx("button", { className: "btn btn-sm", onClick: resetKnownAt, children: "Reset timer" }), v.bundleId && (_jsx("a", { href: `#bundle-${v.bundleId}`, className: "btn btn-sm", children: "Award at bundle level" })), _jsx("button", { className: "btn btn-sm", "aria-label": "Delete vacancy", title: "Delete vacancy", "data-testid": `vacancy-delete-${v.id}`, tabIndex: 0, onClick: () => onDelete(v.id), children: TrashIcon ? (_jsx(TrashIcon, { style: { width: 16, height: 16 }, "aria-hidden": "true" })) : ("Delete") })] })) : (_jsxs("div", { className: "action-grid", children: [_jsx("button", { className: "btn btn-sm", onClick: () => setAwardOpen((o) => !o), children: awardOpen ? "Hide Award" : "Award" }), _jsx("button", { className: "btn btn-sm", onClick: resetKnownAt, children: "Reset timer" }), awardOpen && (_jsxs(_Fragment, { children: [_jsx(SelectEmployee, { allowEmpty: true, employees: employees, value: choice, onChange: setChoice }), _jsxs("div", { style: { whiteSpace: "nowrap" }, children: [_jsx("input", { id: `override-toggle-${v.id}`, className: "toggle-input", type: "checkbox", checked: overrideClass, onChange: (e) => setOverrideClass(e.target.checked) }), _jsx("label", { htmlFor: `override-toggle-${v.id}`, className: "toggle-box", children: _jsx("span", { className: "subtitle", children: "Allow class override" }) })] }), needReason || overrideClass || (recId && choice && choice !== recId) ? (_jsxs("select", { value: reason, onChange: (e) => setReason(e.target.value), children: [_jsx("option", { value: "", children: "Select reason\u2026" }), OVERRIDE_REASONS.map((r) => (_jsx("option", { value: r, children: r }, r)))] })) : (_jsx("span", { className: "subtitle", children: "\u2014" })), _jsx("button", { className: "btn btn-sm", onClick: handleAward, disabled: !choice, children: "Confirm Award" })] })), _jsx("button", { className: "btn btn-sm", "aria-label": "Delete vacancy", title: "Delete vacancy", "data-testid": `vacancy-delete-${v.id}`, tabIndex: 0, onClick: () => onDelete(v.id), children: TrashIcon ? (_jsx(TrashIcon, { style: { width: 16, height: 16 }, "aria-hidden": "true" })) : ("Delete") })] })) })] }));
}
function SelectEmployee({ employees, value, onChange, allowEmpty = false, }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    useEffect(() => {
        if (!value)
            setQ("");
    }, [value]);
    const list = employees
        .filter((e) => matchText(q, `${e.firstName} ${e.lastName} ${e.id}`))
        .slice(0, 50);
    const curr = employees.find((e) => e.id === value);
    return (_jsxs("div", { className: "dropdown", children: [_jsx("input", { placeholder: curr ? `${curr.firstName} ${curr.lastName} (${curr.id})` : "Type name or ID…", value: q, onChange: (e) => {
                    setQ(e.target.value);
                    setOpen(true);
                }, onFocus: () => setOpen(true) }), open && (_jsxs("div", { className: "menu", style: { maxHeight: 320, overflow: "auto" }, children: [allowEmpty && (_jsx("div", { className: "item", onClick: () => {
                            onChange("EMPTY");
                            setQ("");
                            setOpen(false);
                        }, children: "Empty" })), list.map((e) => (_jsxs("div", { className: "item", onClick: () => {
                            onChange(e.id);
                            setQ(`${e.firstName} ${e.lastName} (${e.id})`);
                            setOpen(false);
                        }, children: [e.firstName, " ", e.lastName, " ", _jsxs("span", { className: "pill", style: { marginLeft: 6 }, children: [e.classification, " ", e.status] })] }, e.id))), !list.length && _jsx("div", { className: "item", style: { opacity: 0.7 }, children: "No matches" })] }))] }));
}
