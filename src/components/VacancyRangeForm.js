import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo, useState } from "react";
import CoverageDaysModal from "./CoverageDaysModal";
import { getDatesInRange, formatCoverageSummary } from "../utils/date";
import { formatDateLong } from "../lib/dates";
// Remove enumerateDates as we now use getDatesInRange from utils
export default function VacancyRangeForm({ open, onClose, onSave, defaultClassification, defaultWing, existingVacancies = [], }) {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [classification, setClassification] = useState(defaultClassification ?? "RCA");
    const [wing, setWing] = useState(defaultWing ?? "");
    const [shiftStart, setShiftStart] = useState("06:30");
    const [shiftEnd, setShiftEnd] = useState("14:30");
    const [workingDays, setWorkingDays] = useState([]);
    const [perDayTimes, setPerDayTimes] = useState({});
    const [perDayWings, setPerDayWings] = useState({});
    const [showCoverageModal, setShowCoverageModal] = useState(false);
    const [awardAsBlock, setAwardAsBlock] = useState(true);
    const allDays = useMemo(() => {
        if (!startDate || !endDate)
            return [];
        return getDatesInRange(startDate, endDate);
    }, [startDate, endDate]);
    const isMultiDay = allDays.length > 1;
    // Reinitialize selection when date range changes to keep state in sync
    React.useEffect(() => {
        if (allDays.length > 0) {
            setWorkingDays([...allDays]);
            setPerDayTimes({});
            setPerDayWings({});
        }
        else {
            setWorkingDays([]);
            setPerDayTimes({});
            setPerDayWings({});
        }
    }, [allDays]);
    const dayCount = workingDays.length;
    React.useEffect(() => {
        if (dayCount >= 2)
            setAwardAsBlock(true);
    }, [dayCount]);
    function save() {
        if (!startDate || !endDate || workingDays.length === 0)
            return;
        const conflictDays = workingDays.filter((d) => {
            const t = perDayTimes[d] || { start: shiftStart, end: shiftEnd };
            const w = perDayWings[d] ?? wing;
            return existingVacancies.some((v) => v.shiftDate === d &&
                v.shiftStart === t.start &&
                v.shiftEnd === t.end &&
                v.classification === classification &&
                (v.wing ?? "") === (w ?? ""));
        });
        if (conflictDays.length &&
            !window.confirm(`Selected dates conflict with existing vacancies on ${conflictDays
                .map((d) => formatDateLong(d))
                .join(", ")}. Continue?`)) {
            return;
        }
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
            perDayWings,
            shiftStart,
            shiftEnd,
            offeringStep: "Casuals",
            status: "Open",
        };
        onSave(range, awardAsBlock);
        onClose();
    }
    if (!open)
        return null;
    return (_jsx("div", { role: "dialog", "aria-modal": "true", className: "fixed inset-0 z-50 flex items-center justify-center bg-black/30", children: _jsxs("div", { className: "bg-white rounded-xl shadow-xl w-full max-w-3xl p-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Create Multi-Day Vacancy" }), _jsx("button", { onClick: onClose, className: "px-2 py-1 rounded-md border", children: "Close" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-sm font-medium", children: "Start date" }), _jsx("input", { type: "date", value: startDate, onChange: e => setStartDate(e.target.value), className: "border rounded-md px-2 py-1" })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-sm font-medium", children: "End date" }), _jsx("input", { type: "date", value: endDate, onChange: e => setEndDate(e.target.value), className: "border rounded-md px-2 py-1" })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-sm font-medium", children: "Classification" }), _jsxs("select", { value: classification, onChange: (e) => setClassification(e.target.value), className: "border rounded-md px-2 py-1", disabled: !!defaultClassification, children: [_jsx("option", { children: "RCA" }), _jsx("option", { children: "LPN" }), _jsx("option", { children: "RN" })] })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-sm font-medium", children: "Wing" }), _jsx("input", { value: wing, onChange: e => setWing(e.target.value), className: "border rounded-md px-2 py-1", placeholder: "Bluebell / Rosewood / Shamrock" })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-sm font-medium", children: "Default start" }), _jsx("input", { type: "time", value: shiftStart, onChange: e => setShiftStart(e.target.value), className: "border rounded-md px-2 py-1" })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-sm font-medium", children: "Default end" }), _jsx("input", { type: "time", value: shiftEnd, onChange: e => setShiftEnd(e.target.value), className: "border rounded-md px-2 py-1" })] })] }), isMultiDay && (_jsxs("div", { className: "mt-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("h3", { className: "font-medium", children: "Coverage Days" }), _jsx("button", { onClick: () => setShowCoverageModal(true), className: "px-3 py-2 rounded-md border bg-blue-50 hover:bg-blue-100", children: "Edit coverage days" })] }), _jsxs("div", { className: "p-3 bg-gray-50 rounded-md mb-2", children: [_jsxs("p", { className: "text-sm text-gray-600 mb-1", children: [_jsx("strong", { children: "Coverage Summary:" }), " ", formatCoverageSummary(workingDays, allDays)] }), workingDays.length > 0 && (_jsxs("p", { className: "text-xs text-gray-500", children: ["Selected days: ", workingDays.join(", ")] }))] })] })), dayCount >= 2 && (_jsxs("label", { className: "mt-4 flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: awardAsBlock, onChange: (e) => setAwardAsBlock(e.target.checked) }), _jsxs("span", { children: ["Award the entire block to one person (", dayCount, " days)"] })] })), _jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [_jsx("button", { onClick: onClose, className: "px-3 py-2 rounded-md border", children: "Cancel" }), _jsx("button", { onClick: save, className: "px-3 py-2 rounded-md bg-black text-white", disabled: !startDate || !endDate || workingDays.length === 0, children: "Save range" })] }), _jsx(CoverageDaysModal, { open: showCoverageModal, startDate: startDate, endDate: endDate, defaultStart: shiftStart, defaultEnd: shiftEnd, classification: classification, initial: {
                        selectedDates: workingDays,
                        perDayTimes,
                        perDayWing: perDayWings,
                    }, onSave: ({ selectedDates, perDayTimes: times, perDayWing: wings }) => {
                        setWorkingDays(selectedDates);
                        setPerDayTimes(times);
                        setPerDayWings(wings);
                        setShowCoverageModal(false);
                    }, onClose: () => setShowCoverageModal(false) })] }) }));
}
