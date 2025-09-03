import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from "react";
import { buildCalendar, isoDate, prevMonth, nextMonth } from "../lib/dates";
import { groupVacanciesByDate } from "../lib/vacancy";
function monthLabel(y, m) {
    return new Date(y, m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
export default function CalendarView({ vacancies }) {
    const today = React.useMemo(() => new Date(), []);
    const [y, setY] = React.useState(today.getFullYear());
    const [m, setM] = React.useState(today.getMonth());
    const [showHeatmap, setShowHeatmap] = React.useState(false);
    const [showFilled, setShowFilled] = React.useState(false);
    const days = React.useMemo(() => buildCalendar(y, m), [y, m]);
    // Group events by ISO yyyy-mm-dd
    const eventsByDate = React.useMemo(() => {
        const map = {};
        const grouped = groupVacanciesByDate(vacancies ?? []);
        for (const [d, arr] of grouped.entries()) {
            map[d] = arr;
        }
        return map;
    }, [vacancies]);
    const todayIso = isoDate(today);
    const todaysEvents = eventsByDate[todayIso] || [];
    const visibleToday = todaysEvents.filter((e) => e.status !== "Filled" && e.status !== "Awarded");
    const openToday = visibleToday.filter((e) => e.status === "Open").length;
    const pendingToday = visibleToday.filter((e) => e.status === "Pending").length;
    const filledToday = todaysEvents.filter((e) => e.status === "Filled" || e.status === "Awarded").length;
    const weekdayShort = new Intl.DateTimeFormat(undefined, { weekday: "short" });
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "calendar-mini-toolbar", role: "toolbar", children: [_jsxs("div", { className: "counts", "aria-live": "polite", children: [_jsxs("div", { className: "count", children: [_jsx("span", { className: "badge badge-open", children: openToday }), " Open today"] }), _jsxs("div", { className: "count", children: [_jsx("span", { className: "badge badge-pending", children: pendingToday }), " Pending today"] }), _jsxs("div", { className: "count", children: [_jsx("span", { className: "badge badge-filled", children: filledToday }), " Filled today"] })] }), _jsxs("div", { className: "actions", children: [_jsx("button", { className: "calendar-btn", onClick: () => { setY(today.getFullYear()); setM(today.getMonth()); }, "aria-label": "Jump to today", children: "Jump to Today" }), _jsx("button", { className: "calendar-btn", onClick: () => { }, "aria-label": "Create new vacancy", children: "New Vacancy" }), _jsx("button", { className: "calendar-btn", onClick: () => setShowHeatmap((h) => !h), "aria-pressed": showHeatmap, "aria-label": "Toggle heatmap", children: "Toggle Heatmap" }), _jsx("button", { className: "calendar-btn", onClick: () => setShowFilled((f) => !f), "aria-pressed": showFilled, "aria-label": "Show filled shifts", children: "Show Filled" })] })] }), _jsxs("section", { className: "calendar", "aria-label": "Calendar", children: [_jsxs("div", { className: "calendar-toolbar", children: [_jsxs("div", { className: "controls", children: [_jsx("button", { className: "calendar-btn", onClick: () => prevMonth(setY, setM, y, m), "aria-label": "Previous month", children: "\u25C0" }), _jsx("button", { className: "calendar-btn", onClick: () => { setY(today.getFullYear()); setM(today.getMonth()); }, "aria-label": "Jump to today", children: "Today" }), _jsx("button", { className: "calendar-btn", onClick: () => nextMonth(setY, setM, y, m), "aria-label": "Next month", children: "\u25B6" })] }), _jsx("div", { className: "month-label", children: monthLabel(y, m) }), _jsx("div", { style: { width: 90 } })] }), _jsx("div", { className: "calendar-weekdays", children: Array.from({ length: 7 }).map((_, i) => (_jsx("div", { children: weekdayShort.format(new Date(2025, 0, i + 5)) /* stable labels Sun..Sat */ }, i))) }), _jsx("div", { className: "calendar-grid" + (showHeatmap ? " heatmap" : ""), children: days.map((d) => {
                            const iso = isoDate(d.date);
                            const allEvents = (eventsByDate[iso] || []);
                            const events = showFilled
                                ? allEvents
                                : allEvents.filter((e) => e.status !== "Filled" && e.status !== "Awarded");
                            const open = events.filter((e) => e.status === "Open").length;
                            const pending = events.filter((e) => e.status === "Pending").length;
                            const filled = allEvents.filter((e) => e.status === "Filled" || e.status === "Awarded").length;
                            return (_jsxs("div", { className: "day-cell" + (d.inMonth ? "" : " outside"), "aria-label": iso, style: { ["--event-count"]: events.length }, children: [_jsxs("div", { className: "day-head", children: [_jsx("div", { children: d.date.getDate() }), _jsxs("div", { style: { display: "flex", gap: 6 }, children: [open ? _jsx("span", { className: "badge badge-open", title: "Open", children: open }) : null, pending ? _jsx("span", { className: "badge badge-pending", title: "Pending", children: pending }) : null, filled ? _jsx("span", { className: "badge badge-filled", title: "Filled", children: filled }) : null] })] }), _jsxs("div", { className: "events", children: [events.slice(0, 4).map((e, idx) => {
                                                const status = e.status === "Awarded" ? "Filled" : e.status || "Open";
                                                return (_jsxs("div", { className: "event-pill has-tooltip", "data-status": status, "data-wing": e.wing || undefined, "data-class": e.classification || undefined, children: [_jsxs("div", { children: [_jsxs("strong", { children: [e.shiftStart ?? "", "\u2013", e.shiftEnd ?? ""] }), _jsxs("span", { className: "event-meta", children: [" ", e.wing ?? "", " ", e.classification ?? ""] })] }), _jsx("span", { className: "event-meta", children: status }), _jsxs("div", { className: "tooltip", role: "tooltip", children: [_jsx("div", { className: "title", children: "Shift details" }), _jsxs("div", { className: "line", children: ["Wing: ", e.wing ?? "—"] }), _jsxs("div", { className: "line", children: ["Class: ", e.classification ?? "—"] }), _jsxs("div", { className: "line", children: ["Time: ", e.shiftStart ?? "—", "\u2013", e.shiftEnd ?? "—"] }), e.employee ? _jsxs("div", { className: "line", children: ["Assigned: ", e.employee] }) : null, e.notes ? _jsxs("div", { className: "line", children: ["Notes: ", e.notes] }) : null] })] }, idx));
                                            }), events.length > 4 ? _jsxs("div", { className: "event-meta", children: ["+", events.length - 4, " more\u2026"] }) : null] })] }, iso));
                        }) })] })] }));
}
