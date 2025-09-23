import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo, useState } from "react";
import BundleRow from "./BundleRow";
import VacancyRow from "./VacancyRow";
import { combineDateTime } from "../lib/dates";
export default function OpenVacanciesRedesign(props) {
    const { vacancies, vacations, filters, settings, employees, recommendations } = props;
    const employeesById = useMemo(() => {
        const map = {};
        employees.forEach((e) => {
            map[e.id] = e;
        });
        return map;
    }, [employees]);
    const vacNameById = useMemo(() => {
        const map = {};
        vacations.forEach((v) => {
            map[v.id] = v.employeeName;
        });
        return map;
    }, [vacations]);
    const filtered = useMemo(() => {
        let list = vacancies.filter((v) => v.status !== "Filled" && v.status !== "Awarded");
        if (filters?.search) {
            const q = filters.search.toLowerCase();
            list = list.filter((v) => (v.reason || "").toLowerCase().includes(q) ||
                (v.wing || "").toLowerCase().includes(q));
        }
        if (filters?.wing)
            list = list.filter((v) => (v.wing || "") === filters.wing);
        if (filters?.classification)
            list = list.filter((v) => v.classification === filters.classification);
        if (filters?.bundlesOnly)
            list = list.filter((v) => v.bundleId);
        if (filters?.singlesOnly)
            list = list.filter((v) => !v.bundleId);
        return list;
    }, [vacancies, filters]);
    const [groupByBundle, setGroupByBundle] = useState(true);
    // Cross-day bundle groups so multi-day vacancies render as ONE row
    const bundleGroups = useMemo(() => {
        if (!groupByBundle)
            return [];
        const m = new Map();
        for (const v of filtered) {
            if (!v.bundleId)
                continue;
            const a = m.get(v.bundleId) || [];
            a.push(v);
            m.set(v.bundleId, a);
        }
        const out = Array.from(m.entries()).filter(([, arr]) => arr.length >= 2);
        out.sort(([, a], [, b]) => Math.min(...a.map((x) => combineDateTime(x.shiftDate, x.shiftStart).getTime())) -
            Math.min(...b.map((x) => combineDateTime(x.shiftDate, x.shiftStart).getTime())));
        return out;
    }, [filtered, groupByBundle]);
    const bundledChildIds = useMemo(() => {
        const set = new Set();
        for (const [, arr] of bundleGroups)
            arr.forEach((v) => set.add(v.id));
        return set;
    }, [bundleGroups]);
    const byDate = useMemo(() => {
        const m = new Map();
        for (const v of filtered) {
            if (groupByBundle && bundledChildIds.has(v.id))
                continue; // skip children already shown in bundles
            const key = v.shiftDate;
            if (!m.has(key))
                m.set(key, []);
            m.get(key).push(v);
        }
        for (const [k, arr] of m)
            arr.sort((a, b) => combineDateTime(a.shiftDate, a.shiftStart).getTime() -
                combineDateTime(b.shiftDate, b.shiftStart).getTime());
        return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
    }, [filtered, groupByBundle, bundledChildIds]);
    const fmtDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
    });
    return (_jsxs("div", { children: [_jsx("div", { style: { marginBottom: 8 }, children: _jsxs("label", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [_jsx("input", { type: "checkbox", checked: groupByBundle, onChange: () => setGroupByBundle(true) }), "Group by bundle"] }) }), _jsxs("table", { className: "vacancies", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { width: 40 } }), _jsx("th", { children: "Open Vacancies" }), _jsx("th", { style: { width: 140 }, children: "Time Left" }), _jsx("th", { style: { width: "1%" } })] }) }), _jsxs("tbody", { children: [groupByBundle && bundleGroups.length > 0 && (_jsx("tr", { className: "section-h", children: _jsx("td", { colSpan: 4, children: "Bundled Vacancies" }) })), groupByBundle &&
                                bundleGroups.map(([key, arr]) => {
                                    const coveredName = vacNameById[arr[0].vacationId ?? ""];
                                    return (_jsx(BundleRow, { groupId: key, items: arr, employees: employees, settings: settings, recommendations: recommendations, selectedIds: props.selectedIds, onToggleSelectMany: props.onToggleSelectMany, onDeleteMany: props.onDeleteMany, onSplitBundle: (ids) => props.onSplitBundle?.(ids), onEditCoverage: props.onEditCoverage, onAwardBundle: (eid) => props.awardBundle?.(key, eid), onResetBundle: props.resetBundleKnownAt, dueNextId: props.dueNextId, coveredName: coveredName }, `bundle-${key}`));
                                }), byDate.map(([date, items]) => {
                                const rendered = [];
                                for (const v of items) {
                                    const rec = recommendations[v.id];
                                    const topCandidate = rec?.candidates?.[0];
                                    const recId = (topCandidate === null || topCandidate === void 0 ? void 0 : topCandidate.id) ?? (rec === null || rec === void 0 ? void 0 : rec.id);
                                    const recName = recId
                                        ? `${employeesById[recId]?.firstName ?? ""} ${employeesById[recId]?.lastName ?? ""}`.trim()
                                        : "—";
                                    const recWhy = (topCandidate === null || topCandidate === void 0 ? void 0 : topCandidate.why) ?? (rec === null || rec === void 0 ? void 0 : rec.why) ?? [];
                                    const recCandidates = (rec === null || rec === void 0 ? void 0 : rec.candidates) ?? [];
                                    const coveredName = vacNameById[v.vacationId ?? ""];
                                    rendered.push(_jsx(VacancyRow, { v: v, recId: recId, recName: recName, recWhy: recWhy, recCandidates: recCandidates, employees: employees, selected: props.selectedIds.includes(v.id), onToggleSelect: () => props.onToggleSelect(v.id), awardVacancy: (payload) => props.awardVacancy(v.id, payload), resetKnownAt: () => props.resetKnownAt(v.id), onDelete: props.onDelete, isDueNext: props.dueNextId === v.id, coveredName: coveredName, settings: settings }, v.id));
                                }
                                return (_jsxs(React.Fragment, { children: [_jsx("tr", { className: "section-h", children: _jsx("td", { colSpan: 4, children: fmtDate(date) }) }), rendered] }, `sec-${date}`));
                            })] })] })] }));
}
