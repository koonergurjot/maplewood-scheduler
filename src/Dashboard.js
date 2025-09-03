import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import CalendarView from "./components/CalendarView";
import OpenVacancies from "./components/OpenVacancies";
import useVacancies from "./state/useVacancies";
import "./styles/branding.css";
const LS_KEY = "maplewood-scheduler-v3";
const loadState = () => {
    try {
        const raw = localStorage.getItem(LS_KEY);
        return raw ? JSON.parse(raw) : null;
    }
    catch (err) {
        console.error("Failed to parse saved state", err);
        if (typeof window !== "undefined" && typeof window.alert === "function") {
            window.alert("Stored data was corrupted and has been reset.");
        }
        try {
            localStorage.removeItem(LS_KEY);
        }
        catch (removeErr) {
            console.error("Failed to reset localStorage", removeErr);
        }
        return null;
    }
};
export default function Dashboard() {
    const data = loadState() || { employees: [] };
    const { employees } = data;
    const { vacancies, stageDelete, undoDelete, staged } = useVacancies();
    const [view, setView] = useState("list");
    const filled = useMemo(() => vacancies.filter((v) => v.status === "Filled" || v.status === "Awarded"), [vacancies]);
    const employeeLastAssigned = useMemo(() => {
        const map = {};
        for (const v of filled) {
            if (v.awardedTo && v.awardedAt) {
                const prev = map[v.awardedTo];
                if (!prev || new Date(v.awardedAt) > new Date(prev)) {
                    map[v.awardedTo] = v.awardedAt;
                }
            }
        }
        return map;
    }, [filled]);
    const employeesWithLast = useMemo(() => employees
        .map((e) => ({ ...e, lastAssigned: employeeLastAssigned[e.id] }))
        .sort((a, b) => {
        const ad = a.lastAssigned ? new Date(a.lastAssigned).getTime() : 0;
        const bd = b.lastAssigned ? new Date(b.lastAssigned).getTime() : 0;
        return bd - ad;
    }), [employees, employeeLastAssigned]);
    const isRecent = (date) => {
        if (!date)
            return false;
        const d = new Date(date);
        const diff = Date.now() - d.getTime();
        return diff < 7 * 24 * 60 * 60 * 1000;
    };
    return (_jsxs("div", { className: "dashboard", children: [_jsxs("header", { className: "maplewood-header", children: [_jsx("img", { src: "/maplewood-logo.svg", alt: "Maplewood logo", height: 40 }), _jsx("h1", { children: "Shift Dashboard" })] }), _jsxs("nav", { className: "dashboard-nav", children: [_jsx("button", { onClick: () => setView("list"), disabled: view === "list", children: "List View" }), _jsx("button", { onClick: () => setView("calendar"), disabled: view === "calendar", children: "Calendar View" })] }), _jsx("main", { className: "dashboard-content", children: view === "calendar" ? (_jsx(CalendarView, { vacancies: vacancies })) : (_jsxs(_Fragment, { children: [_jsxs("section", { children: [_jsx("h2", { children: "Filled Shifts" }), _jsxs("div", { className: "shift-list", children: [filled.map((v) => (_jsxs("div", { className: "shift-card awarded", children: [v.shiftDate, " ", v.shiftStart, "\u2013", v.shiftEnd, " \u2022 ", v.wing ?? "", " \u2022 ", v.classification] }, v.id))), filled.length === 0 && _jsx("p", { children: "No filled shifts." })] })] }), _jsxs("section", { children: [_jsx("h2", { children: "Open Shifts" }), _jsx(OpenVacancies, { vacancies: vacancies, stageDelete: stageDelete, undoDelete: undoDelete, staged: staged })] }), _jsxs("section", { className: "employee-list", children: [_jsx("h2", { children: "Recent Assignments" }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Employee" }), _jsx("th", { children: "Last Assigned" })] }) }), _jsx("tbody", { children: employeesWithLast.map((e) => (_jsxs("tr", { className: isRecent(e.lastAssigned) ? "recent" : undefined, children: [_jsxs("td", { children: [e.firstName, " ", e.lastName] }), _jsx("td", { children: e.lastAssigned
                                                            ? new Date(e.lastAssigned).toLocaleDateString()
                                                            : "—" })] }, e.id))) })] })] })] })) })] }));
}
