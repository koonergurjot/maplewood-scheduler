import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { formatDateLong, formatDowShort } from "../lib/dates";
import { OVERRIDE_REASONS } from "../types";
import { matchText } from "../lib/text";
import CoverageChip from "./ui/CoverageChip";
import { TrashIcon } from "./ui/Icon";
import { CellSelect, CellDetails, CellCountdown, CellActions, } from "./rows/RowCells";
export default function VacancyRow({ v, recommendation, employees, selected, onToggleSelect, isDueNext, awardVacancy, resetKnownAt, onDelete, coveredName, settings, }) {
    const [choice, setChoice] = useState("");
    const [choiceManual, setChoiceManual] = useState(false);
    const [overrideClass, setOverrideClass] = useState(false);
    const [reason, setReason] = useState("");
    const [awardOpen, setAwardOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const isBundleChild = v.bundleMode === "one-person" && !!v.bundleId;
    const chosen = employees.find((e) => e.id === choice);
    const classMismatch = chosen && chosen.classification !== v.classification;
    const candidates = (recommendation === null || recommendation === void 0 ? void 0 : recommendation.candidates) ?? [];
    const hasCandidates = candidates.length > 0;
    useEffect(() => {
        setActiveIndex(0);
    }, [recommendation]);
    useEffect(() => {
        if (activeIndex >= candidates.length && candidates.length > 0) {
            setActiveIndex(candidates.length - 1);
        }
    }, [activeIndex, candidates.length]);
    const activeCandidate = candidates[activeIndex];
    const recommendedEmployee = useMemo(() => {
        if (!activeCandidate)
            return undefined;
        return employees.find((e) => e.id === activeCandidate.id);
    }, [activeCandidate, employees]);
    const recName = recommendedEmployee
        ? `${recommendedEmployee.firstName ?? ""} ${recommendedEmployee.lastName ?? ""}`.trim()
        : (activeCandidate === null || activeCandidate === void 0 ? void 0 : activeCandidate.id) ?? "—";
    const recWhy = (activeCandidate === null || activeCandidate === void 0 ? void 0 : activeCandidate.why) ?? (recommendation === null || recommendation === void 0 ? void 0 : recommendation.why) ?? [];
    const recommendedId = activeCandidate === null || activeCandidate === void 0 ? void 0 : activeCandidate.id;
    useEffect(() => {
        if (!awardOpen)
            return;
        if (choiceManual)
            return;
        if (recommendedId) {
            setChoice(recommendedId);
        }
        else {
            setChoice("");
        }
    }, [awardOpen, recommendedId, choiceManual]);
    const needReason = (!!recommendedId && choice && choice !== recommendedId) || (classMismatch && overrideClass);
    function handleAward() {
        var _a;
        if (classMismatch && !overrideClass) {
            alert(`Selected employee is ${(_a = chosen === null || chosen === void 0 ? void 0 : chosen.classification) !== null && _a !== void 0 ? _a : "?"}; vacancy requires ${v.classification}. Check "Allow class override" to proceed.`);
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
        setChoiceManual(false);
        setReason("");
        setOverrideClass(false);
    }
    const cycle = (dir) => {
        if (!hasCandidates)
            return;
        setActiveIndex((idx) => {
            const next = (idx + dir + candidates.length) % candidates.length;
            return next;
        });
        setChoiceManual(false);
    };
    return (_jsxs("tr", { className: `${isDueNext ? "due-next " : ""}${selected ? "selected" : ""}`.trim(), "aria-selected": selected, tabIndex: 0, children: [_jsx(CellSelect, { checked: selected, onChange: onToggleSelect, ariaLabel: `Select vacancy ${v.id}` }), _jsx(CellDetails, { title: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [_jsxs("span", { children: [_jsx("span", { className: "pill", children: formatDowShort(v.shiftDate) }), " ", formatDateLong(v.shiftDate), " • ", v.shiftStart, "-", v.shiftEnd, coveredName && _jsxs(_Fragment, { children: [" • Covering ", coveredName] })] }), _jsx(CoverageChip, { startDate: v.startDate, endDate: v.endDate, coverageDates: v.coverageDates, variant: "compact" })] }), subtitle: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [v.wing && _jsx("span", { className: "pill", children: v.wing }), _jsx("span", { className: "pill", children: v.classification }), _jsx("span", { className: "pill", children: v.offeringStep })] }), rightTag: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [_jsx("span", { className: "subtitle truncate", title: recName, children: recName }), hasCandidates && candidates.length > 1 && (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [_jsx("button", { type: "button", className: "btn btn-sm", style: { padding: "2px 6px" }, onClick: () => cycle(-1), "aria-label": "Previous recommendation", children: "◀" }), _jsxs("span", { className: "subtitle", "aria-live": "polite", children: [activeIndex + 1, "/", candidates.length] }), _jsx("button", { type: "button", className: "btn btn-sm", style: { padding: "2px 6px" }, onClick: () => cycle(1), "aria-label": "Next recommendation", children: "▶" })] })), recWhy.map((w, i) => (_jsx("span", { className: "pill", children: w }, i)))] }) }), _jsx(CellCountdown, { source: v, settings: settings }), _jsx(CellActions, { children: isBundleChild ? (_jsxs("div", { className: "action-grid", children: [_jsx("button", { className: "btn btn-sm", onClick: resetKnownAt, children: "Reset timer" }), v.bundleId && (_jsx("a", { href: `#bundle-${v.bundleId}`, className: "btn btn-sm", children: "Award at bundle level" })), _jsx("button", { className: "btn btn-sm", "aria-label": "Delete vacancy", title: "Delete vacancy", "data-testid": `vacancy-delete-${v.id}`, tabIndex: 0, onClick: () => onDelete(v.id), children: TrashIcon ? (_jsx(TrashIcon, { style: { width: 16, height: 16 }, "aria-hidden": "true" })) : ("Delete") })] })) : (_jsxs("div", { className: "action-grid", children: [_jsx("button", { className: "btn btn-sm", onClick: () => setAwardOpen((o) => {
                        const next = !o;
                        if (next) {
                            setChoiceManual(false);
                        }
                        return next;
                    }), children: awardOpen ? "Hide Award" : "Award" }), _jsx("button", { className: "btn btn-sm", onClick: resetKnownAt, children: "Reset timer" }), awardOpen && (_jsxs(_Fragment, { children: [_jsx(SelectEmployee, { allowEmpty: true, employees: employees, value: choice, onChange: (val) => {
                                setChoice(val);
                                setChoiceManual(true);
                            } }), _jsxs("div", { style: { whiteSpace: "nowrap" }, children: [_jsx("input", { id: `override-toggle-${v.id}`, className: "toggle-input", type: "checkbox", checked: overrideClass, onChange: (e) => setOverrideClass(e.target.checked) }), _jsx("label", { htmlFor: `override-toggle-${v.id}`, className: "toggle-box", children: _jsx("span", { className: "subtitle", children: "Allow class override" }) })] }), needReason || overrideClass || (recommendedId && choice && choice !== recommendedId) ? (_jsxs("select", { value: reason, onChange: (e) => setReason(e.target.value), children: [_jsx("option", { value: "", children: "Select reason…" }), OVERRIDE_REASONS.map((r) => (_jsx("option", { value: r, children: r }, r)))] })) : (_jsx("span", { className: "subtitle", children: "—" })), _jsx("button", { className: "btn btn-sm", onClick: handleAward, disabled: !choice, children: "Confirm Award" })] })), _jsx("button", { className: "btn btn-sm", "aria-label": "Delete vacancy", title: "Delete vacancy", "data-testid": `vacancy-delete-${v.id}`, tabIndex: 0, onClick: () => onDelete(v.id), children: TrashIcon ? (_jsx(TrashIcon, { style: { width: 16, height: 16 }, "aria-hidden": "true" })) : ("Delete") })] })) })] }));
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
