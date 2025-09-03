import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo, useState } from "react";
import CoverageDaysModal from "./CoverageDaysModal";
import { getDatesInRange, formatCoverageSummary } from "../utils/date";
// Remove enumerateDates as we now use getDatesInRange from utils
export default function VacancyRangeForm({ open, onClose, onSave, defaultClassification, defaultWing }) {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [classification, setClassification] = useState(defaultClassification ?? "RCA");
    const [wing, setWing] = useState(defaultWing ?? "");
    const [shiftStart, setShiftStart] = useState("06:30");
    const [shiftEnd, setShiftEnd] = useState("14:30");
    const [workingDays, setWorkingDays] = useState([]);
    const [perDayTimes, setPerDayTimes] = useState({});
    const [showCoverageModal, setShowCoverageModal] = useState(false);
    const allDays = useMemo(() => {
        if (!startDate || !endDate)
            return [];
        return getDatesInRange(startDate, endDate);
    }, [startDate, endDate]);
    const isMultiDay = allDays.length > 1;
    function toggleDay(iso) {
        setWorkingDays(prev => prev.includes(iso) ? prev.filter(d => d !== iso) : [...prev, iso]);
    }
    function applyPresetToAll() {
        const upd = {};
        for (const d of workingDays)
            upd[d] = { start: shiftStart, end: shiftEnd };
        setPerDayTimes(upd);
    }
    function updateTime(d, field, value) {
        setPerDayTimes(prev => ({ ...prev, [d]: { start: prev[d]?.start ?? shiftStart, end: prev[d]?.end ?? shiftEnd, [field]: value } }));
    }
    const handleCoverageDaysChange = (selectedDates) => {
        setWorkingDays(selectedDates);
        setShowCoverageModal(false);
    };
    // Auto-select all days when dates change and no working days selected
    React.useEffect(() => {
        if (allDays.length > 0 && workingDays.length === 0) {
            setWorkingDays([...allDays]);
        }
    }, [allDays, workingDays.length]);
    function save() {
        if (!startDate || !endDate || workingDays.length === 0)
            return;
        const now = new Date().toISOString();
        const range = {
            id: crypto.randomUUID(),
            reason: "Vacation",
            classification,
            wing: wing || undefined,
            startDate,
            endDate,
            knownAt: now,
            workingDays: [...workingDays].sort(),
            perDayTimes,
            shiftStart,
            shiftEnd,
            offeringStep: "Casuals",
            status: "Open",
        };
        onSave(range);
        onClose();
    }
    if (!open)
        return null;
    return (_jsx("div", { role: "dialog", "aria-modal": "true", className: "fixed inset-0 z-50 flex items-center justify-center bg-black/30", children: _jsxs("div", { className: "bg-white rounded-xl shadow-xl w-full max-w-3xl p-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Create Multi-Day Vacancy" }), _jsx("button", { onClick: onClose, className: "px-2 py-1 rounded-md border", children: "Close" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-sm font-medium", children: "Start date" }), _jsx("input", { type: "date", value: startDate, onChange: e => setStartDate(e.target.value), className: "border rounded-md px-2 py-1" })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-sm font-medium", children: "End date" }), _jsx("input", { type: "date", value: endDate, onChange: e => setEndDate(e.target.value), className: "border rounded-md px-2 py-1" })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-sm font-medium", children: "Classification" }), _jsxs("select", { value: classification, onChange: e => setClassification(e.target.value), className: "border rounded-md px-2 py-1", children: [_jsx("option", { children: "RCA" }), _jsx("option", { children: "LPN" }), _jsx("option", { children: "RN" })] })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-sm font-medium", children: "Wing" }), _jsx("input", { value: wing, onChange: e => setWing(e.target.value), className: "border rounded-md px-2 py-1", placeholder: "Bluebell / Rosewood / Shamrock" })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-sm font-medium", children: "Default start" }), _jsx("input", { type: "time", value: shiftStart, onChange: e => setShiftStart(e.target.value), className: "border rounded-md px-2 py-1" })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-sm font-medium", children: "Default end" }), _jsx("input", { type: "time", value: shiftEnd, onChange: e => setShiftEnd(e.target.value), className: "border rounded-md px-2 py-1" })] })] }), isMultiDay && allDays.length > 0 && (_jsxs("div", { className: "mt-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("h3", { className: "font-medium", children: "Coverage Days" }), _jsx("button", { onClick: () => setShowCoverageModal(true), className: "px-3 py-2 rounded-md border bg-blue-50 hover:bg-blue-100", children: "Select Coverage Days" })] }), _jsxs("div", { className: "p-3 bg-gray-50 rounded-md mb-2", children: [_jsxs("p", { className: "text-sm text-gray-600 mb-1", children: [_jsx("strong", { children: "Coverage Summary:" }), " ", formatCoverageSummary(workingDays, allDays)] }), workingDays.length > 0 && (_jsxs("p", { className: "text-xs text-gray-500", children: ["Selected days: ", workingDays.join(", ")] }))] }), workingDays.length > 0 && (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("h4", { className: "text-sm font-medium", children: "Per-day Time Overrides (Optional)" }), _jsx("button", { onClick: applyPresetToAll, className: "px-2 py-1 text-sm rounded-md border", children: "Apply default time to all days" })] }), _jsx("div", { className: "grid grid-cols-1 gap-2 max-h-40 overflow-auto border rounded-md p-2", children: workingDays.map((d) => (_jsxs("label", { className: "flex items-center gap-2 px-2 py-1 rounded bg-green-50", children: [_jsx("span", { className: "min-w-[8rem] text-sm", children: d }), _jsx("input", { type: "time", value: (perDayTimes[d]?.start) ?? shiftStart, onChange: e => updateTime(d, "start", e.target.value), className: "border rounded-md px-1 py-0.5 text-sm" }), _jsx("span", { children: "\u2014" }), _jsx("input", { type: "time", value: (perDayTimes[d]?.end) ?? shiftEnd, onChange: e => updateTime(d, "end", e.target.value), className: "border rounded-md px-1 py-0.5 text-sm" })] }, d))) })] }))] })), _jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [_jsx("button", { onClick: onClose, className: "px-3 py-2 rounded-md border", children: "Cancel" }), _jsx("button", { onClick: save, className: "px-3 py-2 rounded-md bg-black text-white", disabled: !startDate || !endDate || workingDays.length === 0, children: "Save range" })] }), _jsx(CoverageDaysModal, { open: showCoverageModal, onClose: () => setShowCoverageModal(false), onSave: handleCoverageDaysChange, startDate: startDate, endDate: endDate, initialSelection: workingDays, title: "Select Coverage Days" })] }) }));
}
