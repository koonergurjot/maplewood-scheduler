import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import VacancyRow from "./VacancyRow";
import { useVacancyFilters } from "../hooks/useVacancyFilters";
import { WINGS, SHIFT_PRESETS } from "../types";
import { deadlineFor, pickWindowMinutes, fmtCountdown } from "../lib/vacancy";
import { minutesBetween } from "../lib/dates";
export default function VacancyList({ vacancies, employees, employeesById, recommendations, selectedVacancyIds, setSelectedVacancyIds, settings, now, dueNextId, awardVacancy, resetKnownAt, deleteVacancy = () => { }, }) {
    const { filterWing, setFilterWing, filterClass, setFilterClass, filterShift, setFilterShift, filterCountdown, setFilterCountdown, filterStart, setFilterStart, filterEnd, setFilterEnd, filtersOpen, setFiltersOpen, } = useVacancyFilters();
    const filteredVacancies = useMemo(() => {
        return vacancies.filter((v) => {
            if (v.status === "Filled" || v.status === "Awarded")
                return false;
            if (filterWing && v.wing !== filterWing)
                return false;
            if (filterClass && v.classification !== filterClass)
                return false;
            if (filterShift) {
                const preset = SHIFT_PRESETS.find((p) => p.label === filterShift);
                if (preset && (v.shiftStart !== preset.start || v.shiftEnd !== preset.end))
                    return false;
            }
            if (filterCountdown) {
                const msLeft = deadlineFor(v, settings).getTime() - now;
                const winMin = pickWindowMinutes(v, settings);
                const sinceKnownMin = minutesBetween(new Date(), new Date(v.knownAt));
                const pct = Math.max(0, Math.min(1, (winMin - sinceKnownMin) / winMin));
                let cdClass = "green";
                if (msLeft <= 0)
                    cdClass = "red";
                else if (pct < 0.25)
                    cdClass = "yellow";
                if (filterCountdown !== cdClass)
                    return false;
            }
            if (filterStart && v.shiftDate < filterStart)
                return false;
            if (filterEnd && v.shiftDate > filterEnd)
                return false;
            return true;
        });
    }, [
        vacancies,
        filterWing,
        filterClass,
        filterShift,
        filterCountdown,
        filterStart,
        filterEnd,
        now,
        settings,
    ]);
    const toggleAllVacancies = (checked) => {
        setSelectedVacancyIds(checked ? filteredVacancies.map((v) => v.id) : []);
    };
    return (_jsxs("div", { className: "card", children: [_jsx("div", { className: "card-h", children: "Open Vacancies" }), _jsxs("div", { className: "card-c", children: [_jsxs("div", { style: { marginBottom: 8, display: "flex", gap: 8, alignItems: "center" }, children: [_jsxs("label", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [_jsx("input", { type: "checkbox", checked: filteredVacancies.length > 0 &&
                                            selectedVacancyIds.length === filteredVacancies.length, onChange: (e) => toggleAllVacancies(e.target.checked) }), "All"] }), _jsx("button", { className: "btn btn-sm", onClick: () => setFiltersOpen(!filtersOpen), children: filtersOpen ? "Hide Filters ▲" : "Show Filters ▼" })] }), filtersOpen && (_jsxs("div", { className: "toolbar", style: { marginBottom: 8 }, children: [_jsxs("select", { value: filterWing, onChange: (e) => setFilterWing(e.target.value), children: [_jsx("option", { value: "", children: "All Wings" }), WINGS.map((w) => (_jsx("option", { value: w, children: w }, w)))] }), _jsxs("select", { value: filterClass, onChange: (e) => setFilterClass(e.target.value), children: [_jsx("option", { value: "", children: "All Classes" }), ["RCA", "LPN", "RN"].map((c) => (_jsx("option", { value: c, children: c }, c)))] }), _jsxs("select", { value: filterShift, onChange: (e) => setFilterShift(e.target.value), children: [_jsx("option", { value: "", children: "All Shifts" }), SHIFT_PRESETS.map((s) => (_jsx("option", { value: s.label, children: s.label }, s.label)))] }), _jsxs("select", { value: filterCountdown, onChange: (e) => setFilterCountdown(e.target.value), children: [_jsx("option", { value: "", children: "All Countdowns" }), _jsx("option", { value: "green", children: "Green" }), _jsx("option", { value: "yellow", children: "Yellow" }), _jsx("option", { value: "red", children: "Red" })] }), _jsx("input", { type: "date", value: filterStart, onChange: (e) => setFilterStart(e.target.value) }), _jsx("input", { type: "date", value: filterEnd, onChange: (e) => setFilterEnd(e.target.value) }), _jsx("button", { className: "btn", onClick: () => {
                                    setFilterWing("");
                                    setFilterClass("");
                                    setFilterShift("");
                                    setFilterCountdown("");
                                    setFilterStart("");
                                    setFilterEnd("");
                                }, children: "Clear" })] })), _jsxs("table", { className: "vac-table responsive-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: _jsx("input", { type: "checkbox", "aria-label": "Select all vacancies", checked: filteredVacancies.length > 0 &&
                                                    selectedVacancyIds.length === filteredVacancies.length, onChange: (e) => toggleAllVacancies(e.target.checked) }) }), _jsx("th", { children: "Shift" }), _jsx("th", { children: "Wing" }), _jsx("th", { children: "Class" }), _jsx("th", { children: "Offering" }), _jsx("th", { children: "Recommended" }), _jsx("th", { children: "Countdown" }), _jsx("th", { children: "Assign" }), _jsx("th", { children: "Override" }), _jsx("th", { children: "Reason (if overriding)" }), _jsx("th", { colSpan: 2, style: { textAlign: "center" }, children: "Actions" })] }) }), _jsx("tbody", { children: filteredVacancies.map((v) => {
                                    const rec = recommendations[v.id];
                                    const recId = rec?.id;
                                    const recName = recId
                                        ? `${employeesById[recId]?.firstName ?? ""} ${employeesById[recId]?.lastName ?? ""}`.trim()
                                        : "—";
                                    const recWhy = rec?.why ?? [];
                                    const dl = deadlineFor(v, settings);
                                    const msLeft = dl.getTime() - now;
                                    const winMin = pickWindowMinutes(v, settings);
                                    const sinceKnownMin = minutesBetween(new Date(), new Date(v.knownAt));
                                    const pct = Math.max(0, Math.min(1, (winMin - sinceKnownMin) / winMin));
                                    let cdClass = "cd-green";
                                    if (msLeft <= 0)
                                        cdClass = "cd-red";
                                    else if (pct < 0.25)
                                        cdClass = "cd-yellow";
                                    const isDueNext = dueNextId === v.id;
                                    return (_jsx(VacancyRow, { v: v, recId: recId, recName: recName, recWhy: recWhy, employees: employees, selected: selectedVacancyIds.includes(v.id), onToggleSelect: () => setSelectedVacancyIds((ids) => ids.includes(v.id)
                                            ? ids.filter((id) => id !== v.id)
                                            : [...ids, v.id]), countdownLabel: fmtCountdown(msLeft), countdownClass: cdClass, isDueNext: !!isDueNext, onAward: (payload) => awardVacancy(v.id, payload), onResetKnownAt: () => resetKnownAt(v.id), onDelete: deleteVacancy }, v.id));
                                }) })] }), filteredVacancies.length === 0 && (_jsx("div", { className: "subtitle", style: { marginTop: 8 }, children: "No open vacancies \uD83C\uDF89" }))] })] }));
}
