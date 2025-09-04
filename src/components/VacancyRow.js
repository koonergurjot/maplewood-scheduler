import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { formatDateLong, formatDowShort } from "../lib/dates";
import { OVERRIDE_REASONS } from "../types";
import { matchText } from "../lib/text";
import CoverageChip from "./ui/CoverageChip";
import { TrashIcon } from "./ui/Icon";
export default function VacancyRow({ v, recId, recName, recWhy, employees, selected, onToggleSelect, countdownLabel, countdownClass, isDueNext, onAward, onResetKnownAt, onDelete, coveredName, }) {
    const [choice, setChoice] = useState("");
    const [overrideClass, setOverrideClass] = useState(false);
    const [reason, setReason] = useState("");
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
        onAward({ empId: choice || undefined, reason: reason || undefined, overrideUsed: overrideClass });
        setChoice("");
        setReason("");
        setOverrideClass(false);
    }
    return (_jsxs("tr", { className: `${isDueNext ? "due-next " : ""}${selected ? "selected" : ""}`.trim(), "aria-selected": selected, tabIndex: 0, children: [_jsx("td", { children: _jsx("input", { type: "checkbox", checked: selected, onChange: onToggleSelect }) }), _jsx("td", { children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [_jsxs("span", { children: [_jsx("span", { className: "pill", children: formatDowShort(v.shiftDate) }), " ", formatDateLong(v.shiftDate), " \u2022 ", v.shiftStart, "-", v.shiftEnd, coveredName && _jsxs(_Fragment, { children: [" \u2022 Covering ", coveredName] })] }), _jsx(CoverageChip, { startDate: v.startDate, endDate: v.endDate, coverageDates: v.coverageDates, variant: "compact" })] }) }), _jsx("td", { children: v.wing ?? "" }), _jsx("td", { children: v.classification }), _jsx("td", { children: v.offeringStep }), _jsx("td", { children: _jsxs("div", { style: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }, children: [_jsx("span", { children: recName }), recWhy.map((w, i) => (_jsx("span", { className: "pill", children: w }, i)))] }) }), _jsx("td", { children: _jsx("span", { className: `cd-chip ${countdownClass}`, children: countdownLabel }) }), _jsx("td", { style: { minWidth: 220 }, children: _jsx(SelectEmployee, { allowEmpty: true, employees: employees, value: choice, onChange: setChoice }) }), _jsxs("td", { style: { whiteSpace: "nowrap" }, children: [_jsx("input", { id: "override-toggle", className: "toggle-input", type: "checkbox", checked: overrideClass, onChange: (e) => setOverrideClass(e.target.checked) }), _jsx("label", { htmlFor: "override-toggle", className: "toggle-box", children: _jsx("span", { className: "subtitle", children: "Allow class override" }) })] }), _jsx("td", { style: { minWidth: 230 }, children: needReason || overrideClass || (recId && choice && choice !== recId) ? (_jsxs("select", { value: reason, onChange: (e) => setReason(e.target.value), children: [_jsx("option", { value: "", children: "Select reason\u2026" }), OVERRIDE_REASONS.map((r) => (_jsx("option", { value: r, children: r }, r)))] })) : (_jsx("span", { className: "subtitle", children: "\u2014" })) }), _jsx("td", { className: "cell-actions", children: _jsxs(_Fragment, { children: [_jsx("button", { className: "btn btn-sm", onClick: onResetKnownAt, children: "Reset timer" }), _jsx("button", { className: "btn btn-sm", onClick: handleAward, disabled: !choice, children: "Award" }), _jsx("button", { className: "btn btn-sm", "aria-label": "Delete vacancy", title: "Delete vacancy", "data-testid": `vacancy-delete-${v.id}`, tabIndex: 0, onClick: () => onDelete(v.id), children: TrashIcon ? (_jsx(TrashIcon, { style: { width: 16, height: 16 }, "aria-hidden": "true" })) : ("Delete") })] }) })] }));
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
