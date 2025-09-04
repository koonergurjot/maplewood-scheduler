import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { recommend } from "./recommend";
import { isoDate, combineDateTime, formatDateLong, formatDowShort, buildCalendar, prevMonth, nextMonth, minutesBetween, } from "./lib/dates";
import { groupVacanciesByDate } from "./lib/vacancy";
import { matchText } from "./lib/text";
import { reorder } from "./utils/reorder";
import CoverageRangesPanel from "./components/CoverageRangesPanel";
import BulkAwardDialog from "./components/BulkAwardDialog";
import { TrashIcon } from "./components/ui/Icon";
import VacancyRangeForm from "./components/VacancyRangeForm";
import BundleRow from "./components/BundleRow";
import { appConfig } from "./config";
import { expandRangeToVacancies } from "./lib/expandRange";
// ---------- Constants ----------
const TAB_KEYS = [
    "coverage",
    "calendar",
    "bids",
    "employees",
    "archive",
    "alerts",
    "settings",
];
const defaultSettings = {
    responseWindows: { lt2h: 7, h2to4: 15, h4to24: 30, h24to72: 120, gt72: 1440 },
    theme: typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light",
    fontScale: 1,
    tabOrder: [...TAB_KEYS],
    defaultShiftPreset: "Day",
};
const WINGS = [
    "Shamrock",
    "Bluebell",
    "Rosewood",
    "Front",
    "Receptionist",
];
const SHIFT_PRESETS = [
    { label: "Day", start: "06:30", end: "14:30" },
    { label: "Evening", start: "14:30", end: "22:30" },
    { label: "Night", start: "22:30", end: "06:30" },
];
export const OVERRIDE_REASONS = [
    "Earlier bidder within step",
    "Availability mismatch / declined",
    "Single Site Order / conflict",
    "Scope of practice / skill mix",
    "Fatigue risk (back‑to‑back)",
    "Unit familiarity / continuity",
    "Manager discretion",
];
// ---------- Local Storage ----------
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
const saveState = (state) => {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(state));
        return true;
    }
    catch (err) {
        console.warn("Unable to access localStorage. State not persisted.", err);
        return false;
    }
};
// ---------- Utils ----------
const displayVacancyLabel = (v) => {
    const d = formatDateLong(v.shiftDate);
    return `${d} • ${v.shiftStart}–${v.shiftEnd} • ${v.wing ?? ""} • ${v.classification}`.replace(/\s+•\s+$/, "");
};
function pickWindowMinutes(v, settings) {
    const known = new Date(v.knownAt);
    const shiftStart = combineDateTime(v.shiftDate, v.shiftStart);
    const hrsUntilShift = (shiftStart.getTime() - known.getTime()) / 3600000;
    if (hrsUntilShift < 2)
        return settings.responseWindows.lt2h;
    if (hrsUntilShift < 4)
        return settings.responseWindows.h2to4;
    if (hrsUntilShift < 24)
        return settings.responseWindows.h4to24;
    if (hrsUntilShift < 72)
        return settings.responseWindows.h24to72;
    return settings.responseWindows.gt72;
}
function deadlineFor(v, settings) {
    const winMin = pickWindowMinutes(v, settings);
    return new Date(new Date(v.knownAt).getTime() + winMin * 60000);
}
function fmtCountdown(msLeft) {
    const neg = msLeft < 0;
    const abs = Math.abs(msLeft);
    const totalSec = Math.floor(abs / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const core = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
    return neg ? `Due ${core} ago` : core;
}
export const applyAwardVacancy = (vacs, vacId, payload) => {
    const empId = payload.empId === "EMPTY" ? undefined : payload.empId;
    return vacs.map((v) => v.id === vacId
        ? {
            ...v,
            status: "Filled",
            awardedTo: empId,
            awardedAt: new Date().toISOString(),
            awardReason: payload.reason,
            overrideUsed: !!payload.overrideUsed,
        }
        : v);
};
export const applyAwardVacancies = (vacs, vacIds, payload) => {
    return vacIds.reduce((prev, id) => applyAwardVacancy(prev, id, payload), vacs);
};
export const archiveBidsForVacancy = (bids, archived, vacancyId) => {
    const remaining = [];
    const moved = [];
    for (const b of bids) {
        if (b.vacancyId === vacancyId)
            moved.push(b);
        else
            remaining.push(b);
    }
    if (!moved.length)
        return { bids: remaining, archivedBids: archived };
    return {
        bids: remaining,
        archivedBids: {
            ...archived,
            [vacancyId]: [...(archived[vacancyId] ?? []), ...moved],
        },
    };
};
// ---------- Main App ----------
export default function App() {
    const persisted = loadState();
    const [tab, setTab] = useState("coverage");
    const [employees, setEmployees] = useState(persisted?.employees ?? []);
    const [vacations, setVacations] = useState(persisted?.vacations ?? []);
    const [vacancies, setVacancies] = useState((persisted?.vacancies ?? []).map((v) => ({
        offeringTier: "CASUALS",
        offeringRoundStartedAt: v.offeringRoundStartedAt ?? new Date().toISOString(),
        offeringRoundMinutes: v.offeringRoundMinutes ?? 120,
        offeringAutoProgress: v.offeringAutoProgress ?? true,
        ...v,
    })));
    const [bids, setBids] = useState(persisted?.bids ?? []);
    const [archivedBids, setArchivedBids] = useState(persisted?.archivedBids ?? {});
    const [selectedVacancyIds, setSelectedVacancyIds] = useState([]);
    const [bulkAwardOpen, setBulkAwardOpen] = useState(false);
    const [showRangeForm, setShowRangeForm] = useState(false);
    const persistedSettings = persisted?.settings ?? {};
    const storedOrder = persistedSettings.tabOrder || [];
    const mergedOrder = [
        ...storedOrder,
        ...TAB_KEYS.filter((k) => !storedOrder.includes(k)),
    ];
    const [settings, setSettings] = useState({
        ...defaultSettings,
        ...persistedSettings,
        tabOrder: mergedOrder,
    });
    const [filterWing, setFilterWing] = useState("");
    const [filterClass, setFilterClass] = useState("");
    const [filterShift, setFilterShift] = useState("");
    const [filterCountdown, setFilterCountdown] = useState("");
    const [filterStart, setFilterStart] = useState("");
    const [filterEnd, setFilterEnd] = useState("");
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [editingBundle, setEditingBundle] = useState(null);
    // Tick for countdowns
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);
    useEffect(() => {
        if (!saveState({
            employees,
            vacations,
            vacancies,
            bids,
            archivedBids,
            settings,
        })) {
            // localStorage unavailable; state persistence disabled
        }
    }, [employees, vacations, vacancies, bids, archivedBids, settings]);
    const employeesById = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
    // Recommendation: choose among eligible bidders with highest seniority (rank 1 best)
    const recommendations = useMemo(() => {
        const m = {};
        vacancies.forEach((v) => {
            m[v.id] = recommend(v, bids, employeesById);
        });
        return m;
    }, [vacancies, bids, employeesById]);
    // Auto-archive vacations when all their vacancies are awarded
    useEffect(() => {
        const byVacation = new Map();
        vacancies.forEach((v) => {
            if (v.vacationId) {
                const a = byVacation.get(v.vacationId) || [];
                a.push(v);
                byVacation.set(v.vacationId, a);
            }
        });
        setVacations((prev) => prev.map((vac) => {
            const list = byVacation.get(vac.id) || [];
            const allFilled = list.length > 0 &&
                list.every((x) => x.status === "Filled" || x.status === "Awarded");
            if (allFilled && !vac.archived)
                return {
                    ...vac,
                    archived: true,
                    archivedAt: new Date().toISOString(),
                };
            return vac;
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vacancies]);
    const defaultShift = useMemo(() => SHIFT_PRESETS.find((p) => p.label === settings.defaultShiftPreset) ||
        SHIFT_PRESETS[0], [settings.defaultShiftPreset]);
    // Coverage form state
    const [newVacay, setNewVacay] = useState({
        wing: WINGS[0],
        shiftStart: defaultShift.start,
        shiftEnd: defaultShift.end,
        shiftPreset: defaultShift.label,
    });
    useEffect(() => {
        setNewVacay((v) => ({
            ...v,
            shiftStart: defaultShift.start,
            shiftEnd: defaultShift.end,
            shiftPreset: defaultShift.label,
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultShift]);
    const vacDateRef = useRef(null);
    const vacStartRef = useRef(null);
    const vacEndRef = useRef(null);
    const handleDateFieldClick = (ref) => {
        ref.current?.focus();
        ref.current?.showPicker();
    };
    const [multiDay, setMultiDay] = useState(false);
    // Actions
    const addVacationAndGenerate = (v) => {
        if (!v.employeeId ||
            !v.employeeName ||
            !v.classification ||
            !v.startDate ||
            !v.endDate ||
            !v.wing) {
            alert("Employee, wing, start & end are required.");
            return;
        }
        const vac = {
            id: `vac_${Date.now().toString(36)}`,
            employeeId: v.employeeId,
            employeeName: v.employeeName,
            classification: v.classification,
            wing: v.wing,
            startDate: v.startDate,
            endDate: v.endDate,
            notes: v.notes ?? "",
            archived: false,
        };
        setVacations((prev) => [vac, ...prev]);
        // explode the range into daily vacancies
        const days = dateRangeInclusive(v.startDate, v.endDate);
        const isBundle = days.length >= 2;
        const bundleId = isBundle
            ? `BND-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
            : undefined;
        const nowISO = new Date().toISOString();
        const vxs = days.map((d) => ({
            id: `VAC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
            vacationId: vac.id,
            ...(bundleId ? { bundleId } : {}),
            reason: "Vacation Backfill",
            classification: vac.classification,
            wing: v.perDayWings?.[d] ?? vac.wing,
            shiftDate: d,
            shiftStart: v.perDayTimes?.[d]?.start ?? (v.shiftStart ?? defaultShift.start),
            shiftEnd: v.perDayTimes?.[d]?.end ?? (v.shiftEnd ?? defaultShift.end),
            knownAt: nowISO,
            offeringTier: "CASUALS",
            offeringRoundStartedAt: nowISO,
            offeringRoundMinutes: 120,
            offeringAutoProgress: true,
            offeringStep: "Casuals",
            status: "Open",
        }));
        setVacancies((prev) => [...vxs, ...prev]);
        setNewVacay({
            wing: WINGS[0],
            shiftStart: defaultShift.start,
            shiftEnd: defaultShift.end,
            shiftPreset: defaultShift.label,
        });
        setMultiDay(false);
    };
    const handleSaveRange = (range) => {
        const vxs = expandRangeToVacancies(range);
        setVacancies((prev) => [...vxs, ...prev]);
    };
    const archiveBids = (vacancyIds) => {
        setBids((prev) => {
            var _a;
            const remaining = [];
            const archiveMap = {};
            for (const b of prev) {
                if (vacancyIds.includes(b.vacancyId)) {
                    (archiveMap[_a = b.vacancyId] || (archiveMap[_a] = [])).push(b);
                }
                else {
                    remaining.push(b);
                }
            }
            if (Object.keys(archiveMap).length) {
                setArchivedBids((prevMap) => {
                    const m = { ...prevMap };
                    for (const [vid, arr] of Object.entries(archiveMap)) {
                        m[vid] = [...(m[vid] || []), ...arr];
                    }
                    return m;
                });
            }
            return remaining;
        });
    };
    const awardBundle = (bundleId, payload) => {
        const empId = payload.empId;
        const bundleVacancies = vacancies.filter((v) => v.bundleId === bundleId &&
            v.status !== "Filled" &&
            v.status !== "Awarded");
        if (!bundleVacancies.length)
            return;
        if (empId && empId !== "EMPTY") {
            const hasAllBids = bundleVacancies.every((v) => bids.some((b) => b.vacancyId === v.id && b.bidderEmployeeId === empId));
            if (!hasAllBids) {
                alert("Employee is missing bids on at least one bundled day.");
                return;
            }
            const emp = employeesById[empId];
            if (emp &&
                bundleVacancies.some((v) => v.classification !== emp.classification) &&
                !payload.overrideUsed) {
                alert("Employee classification mismatch within bundle.");
                return;
            }
            const conflictDays = bundleVacancies
                .filter((v) => vacancies.some((o) => o.id !== v.id &&
                o.shiftDate === v.shiftDate &&
                (o.status === "Filled" || o.status === "Awarded") &&
                o.awardedTo === empId))
                .map((v) => formatDateLong(v.shiftDate));
            if (conflictDays.length &&
                !window.confirm(`Employee already assigned on ${conflictDays.join(", ")}. Continue?`)) {
                return;
            }
        }
        const ids = bundleVacancies.map((v) => v.id);
        setVacancies((prev) => applyAwardVacancies(prev, ids, payload));
        archiveBids(ids);
    };
    const awardVacancy = (vacId, payload) => {
        const target = vacancies.find((v) => v.id === vacId);
        if (target?.bundleId) {
            awardBundle(target.bundleId, payload);
        }
        else {
            if (payload.empId && payload.empId !== "EMPTY" && target) {
                const conflict = vacancies.some((v) => v.id !== vacId &&
                    v.shiftDate === target.shiftDate &&
                    (v.status === "Filled" || v.status === "Awarded") &&
                    v.awardedTo === payload.empId);
                if (conflict &&
                    !window.confirm(`Employee already assigned on ${formatDateLong(target.shiftDate)}. Continue?`)) {
                    return;
                }
            }
            setVacancies((prev) => applyAwardVacancy(prev, vacId, payload));
            archiveBids([vacId]);
        }
    };
    const resetKnownAt = (vacId) => {
        setVacancies((prev) => prev.map((v) => v.id === vacId ? { ...v, knownAt: new Date().toISOString() } : v));
    };
    const deleteVacancy = (vacId) => {
        setVacancies((prev) => prev.filter((v) => v.id !== vacId));
        setBids((prev) => prev.filter((b) => b.vacancyId !== vacId));
        setArchivedBids((prev) => {
            const { [vacId]: _removed, ...rest } = prev;
            return rest;
        });
        setSelectedVacancyIds((ids) => ids.filter((id) => id !== vacId));
    };
    // Figure out which open vacancy is "due next" (soonest positive deadline)
    const dueNextId = useMemo(() => {
        let min = Infinity;
        let id = null;
        for (const v of vacancies) {
            if (v.status === "Filled" || v.status === "Awarded")
                continue;
            const dl = deadlineFor(v, settings).getTime() - now;
            if (dl > 0 && dl < min) {
                min = dl;
                id = v.id;
            }
        }
        return id;
    }, [vacancies, now, settings]);
    const filteredVacancies = useMemo(() => {
        const passes = (v) => {
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
        };
        const groups = {};
        for (const v of vacancies) {
            if (v.status === "Filled" || v.status === "Awarded")
                continue;
            const key = v.bundleId || v.id;
            (groups[key] || (groups[key] = [])).push(v);
        }
        const out = [];
        for (const arr of Object.values(groups)) {
            if (arr.some(passes))
                out.push(...arr);
        }
        return out;
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
    // Build rows: bundle by bundleId only
    const openVacancies = useMemo(() => filteredVacancies, [filteredVacancies]);
    // Group vacancies by bundleId
    const groups = useMemo(() => {
        const by = {};
        for (const v of openVacancies) {
            const key = v.bundleId || "";
            if (!key)
                continue;
            (by[key] || (by[key] = [])).push(v);
        }
        return by;
    }, [openVacancies]);
    // Create display rows: bundles for groups with 2+ items, singles otherwise
    const rows = useMemo(() => {
        const bundledKeys = Object.keys(groups).filter((k) => groups[k].length >= 2);
        const r = [];
        for (const k of bundledKeys)
            r.push({ type: "bundle", key: k, items: groups[k] });
        for (const v of openVacancies) {
            const k = v.bundleId || "";
            if (!k || (groups[k]?.length ?? 0) < 2)
                r.push({ type: "single", key: v.id, item: v });
        }
        r.sort((a, b) => {
            const aTime = a.type === "bundle"
                ? Math.min(...a.items.map((x) => new Date(`${x.shiftDate}T${x.shiftStart}:00`).getTime()))
                : new Date(`${a.item.shiftDate}T${a.item.shiftStart}:00`).getTime();
            const bTime = b.type === "bundle"
                ? Math.min(...b.items.map((x) => new Date(`${x.shiftDate}T${x.shiftStart}:00`).getTime()))
                : new Date(`${b.item.shiftDate}T${b.item.shiftStart}:00`).getTime();
            return aTime - bTime;
        });
        return r;
    }, [groups, openVacancies]);
    // Helpers for selection & delete (operate on many ids)
    const toggleMany = (ids) => {
        setSelectedVacancyIds((prev) => {
            const set = new Set(prev);
            const allSelected = ids.every((id) => set.has(id));
            if (allSelected)
                ids.forEach((id) => set.delete(id));
            else
                ids.forEach((id) => set.add(id));
            return Array.from(set);
        });
    };
    const deleteMany = (ids) => {
        ids.forEach((id) => deleteVacancy(id));
    };
    return (_jsxs("div", { className: "app", "data-theme": settings.theme, style: { fontSize: `${(settings.fontScale || 1) * 16}px` }, children: [_jsx("style", { children: `
        /* Themes */
        :root{ --baseRadius:14px; }
        .app{min-height:100vh;min-height:100dvh;background:linear-gradient(180deg,var(--bg1),var(--bg2));color:var(--text);font-family:'Nunito',system-ui,Arial,sans-serif;padding:calc(18px + env(safe-area-inset-top)) 18px calc(18px + env(safe-area-inset-bottom)) 18px}
        @supports(-webkit-touch-callout:none){.app{min-height:-webkit-fill-available}}
        [data-theme="dark"]{ --bg1:#0f172a; --bg2:#1f2937; --card:#1e293b; --cardAlt:#273446; --stroke:#334155; --text:#f1f5f9; --muted:#cbd5e1; --brand:#0d9488; --accent:#34d399; --ok:#16a34a; --warn:#f59e0b; --bad:#ef4444; --chipBg:#334155; --chipText:#f1f5f9; }
        [data-theme="light"]{ --bg1:#f0fdf4; --bg2:#ffffff; --card:#ffffff; --cardAlt:#f6fdf9; --stroke:#d1fae5; --text:#064e3b; --muted:#3f7f65; --brand:#047857; --accent:#10b981; --ok:#15803d; --warn:#b45309; --bad:#b91c1c; --chipBg:#dcfce7; --chipText:#064e3b; }

        *{box-sizing:border-box}
        body,html,#root{height:100%;margin:0;-webkit-text-size-adjust:100%}
        .container{max-width:min(95vw,1600px); margin:0 auto}
        .nav{display:flex;align-items:center;gap:12px;justify-content:space-between;margin-bottom:14px}
        .title{font-size:22px;font-weight:800}
        .subtitle{color:var(--muted);font-size:13px}
        .toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .btn{background:var(--cardAlt);border:1px solid var(--stroke);padding:9px 12px;border-radius:12px;color:var(--text);cursor:pointer;font-weight:600;transition:background .2s,transform .2s,box-shadow .2s}
        .btn:hover{border-color:var(--brand);background:var(--brand);color:#fff;box-shadow:0 2px 4px rgba(0,0,0,.1);transform:translateY(-1px)}
        .btn-sm{padding:4px 8px;font-size:12px}
        @media(max-width:900px){.nav{flex-direction:column;align-items:flex-start;gap:8px}.toolbar{width:100%;flex-wrap:wrap}}
        @media(max-width:600px){.toolbar{flex-direction:column;align-items:stretch}}
        .tabs{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 16px}
        .tab{padding:8px 12px;border-radius:12px;border:1px solid var(--stroke);cursor:pointer;background:var(--cardAlt);font-weight:600;color:var(--text)}
        .tab.active{border-color:var(--brand);background:var(--brand);color:#fff;box-shadow:0 0 0 2px var(--brand) inset}
        .grid{display:grid;gap:12px}
        .grid2{grid-template-columns:1fr}
        .card{background:var(--card);border:1px solid var(--stroke);border-radius:var(--baseRadius);overflow:visible;box-shadow:0 4px 6px rgba(0,0,0,.06);transition:box-shadow .2s,transform .2s}
        .card:hover{box-shadow:0 8px 12px rgba(0,0,0,.1);transform:translateY(-2px)}
        .card-h{padding:10px 14px;border-bottom:1px solid var(--stroke);font-weight:800;display:flex;align-items:center;justify-content:space-between}
        .card-c{padding:14px}
        table{width:100%;border-collapse:separate; border-spacing:0}
        th,td{padding:10px;border-bottom:1px solid var(--stroke);text-align:left;vertical-align:middle}
        th{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
        input:not([type="checkbox"]),select,textarea{width:100%;background:var(--cardAlt);border:1px solid var(--stroke);border-radius:10px;padding:10px;color:var(--text);-webkit-appearance:none;appearance:none}
        input[type="checkbox"]{accent-color:var(--brand)}
        input::placeholder{color:#cbd5e1}
        input[type=date]{cursor:pointer}
        input[type=date]::-webkit-calendar-picker-indicator{cursor:pointer}
        .row{display:grid;gap:10px}
        .cols2{grid-template-columns:1fr} @media(min-width:900px){.cols2{grid-template-columns:1fr 1fr}}
        .pill{background:var(--chipBg); color:var(--chipText); border:1px solid var(--stroke); padding:4px 8px;border-radius:999px;font-size:12px; font-weight:600}
        .ok{color:var(--ok)} .warn{color:var(--warn)} .bad{color:var(--bad)}
        .dropdown{position:relative}
        .menu{position:absolute;z-index:30;top:100%;left:0;right:0;background:var(--cardAlt);border:1px solid var(--stroke);border-radius:10px;max-height:240px;overflow:auto}
        .item{padding:8px 10px;cursor:pointer} .item:hover{background:rgba(4,120,87,.12)}

        /* Calendar */
        .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-top:8px}
        .cal-dow{opacity:.85;font-size:12px;text-align:center;color:var(--muted);font-weight:700}
        .cal-day{border:1px solid var(--stroke);border-radius:10px;padding:8px;min-height:92px;background:var(--cardAlt);display:flex;flex-direction:column}
        .cal-day.mute{opacity:.45}
        .cal-day.today{border-color:var(--brand)}
        .cal-day.selected{box-shadow:0 0 0 2px var(--brand) inset}
        .cal-num{font-weight:800;margin-bottom:6px}
        .cal-open{margin-top:auto;font-size:12px}
        .cal-chip{display:inline-block;border:1px solid var(--stroke);border-radius:999px;padding:2px 6px;margin-right:6px;margin-bottom:6px}

        /* Vacancies table header sticks to viewport while the whole page scrolls */
        .vac-table thead th{position:sticky; top:0; background:var(--card); z-index:2}

        /* Countdown chips */
        .cd-chip{display:inline-block; padding:4px 8px; border-radius:999px; border:1px solid var(--stroke); font-weight:700}
        .cd-green{background:rgba(22,163,74,.12)}
        .cd-yellow{background:rgba(245,158,11,.12)}
        .cd-red{background:rgba(239,68,68,.12)}

        /* Due next highlight */
        .due-next{ box-shadow: 0 0 0 2px var(--brand) inset; }
      ` }), _jsxs("div", { className: "container", children: [_jsxs("div", { className: "nav", children: [_jsx("div", { children: _jsx("div", { className: "title", children: "Maplewood Scheduler" }) }), _jsxs("div", { className: "toolbar", children: [_jsx("button", { className: "btn", onClick: () => setSettings((s) => ({
                                            ...s,
                                            theme: s.theme === "dark" ? "light" : "dark",
                                        })), children: settings.theme === "dark" ? "Light Mode" : "Dark Mode" }), _jsx(Link, { to: "/agreement", className: "btn", children: "Agreement" }), _jsx(Link, { to: "/audit-log", className: "btn", children: "Audit Log" }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [_jsx("span", { className: "subtitle", children: "Text size" }), _jsx("input", { type: "range", min: 0.85, max: 1.6, step: 0.05, value: settings.fontScale, onChange: (e) => setSettings((s) => ({
                                                    ...s,
                                                    fontScale: Number(e.target.value),
                                                })) })] }), _jsx("button", { className: "btn", onClick: () => {
                                            const blob = new Blob([
                                                JSON.stringify({ employees, vacations, vacancies, bids, settings }, null, 2),
                                            ], { type: "application/json" });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement("a");
                                            a.href = url;
                                            a.download = "maplewood-scheduler-backup.json";
                                            a.click();
                                            URL.revokeObjectURL(url);
                                        }, children: "Export" }), _jsx("button", { className: "btn", onClick: () => {
                                            if (confirm("Reset ALL data?")) {
                                                localStorage.removeItem(LS_KEY);
                                                location.reload();
                                            }
                                        }, children: "Reset" })] })] }), _jsx("div", { className: "tabs", children: settings.tabOrder.map((k) => (_jsx("button", { className: `tab ${tab === k ? "active" : ""}`, onClick: () => setTab(k), children: k[0].toUpperCase() + k.slice(1) }, k))) }), tab === "coverage" && (_jsxs(_Fragment, { children: [_jsx(CoverageRangesPanel, {}), _jsxs("div", { className: "grid grid2", children: [_jsxs("div", { className: "card", children: [_jsx("div", { className: "card-h", children: "Add Vacation (auto-creates daily vacancies)" }), _jsx("div", { className: "card-c", children: _jsxs("div", { className: "row cols2", children: [_jsxs("div", { children: [_jsx("label", { children: "Employee" }), _jsx(EmployeeCombo, { employees: employees, onSelect: (id) => {
                                                                        const e = employees.find((x) => x.id === id);
                                                                        setNewVacay((v) => ({
                                                                            ...v,
                                                                            employeeId: id,
                                                                            employeeName: e ? `${e.firstName} ${e.lastName}` : "",
                                                                            classification: (e?.classification ??
                                                                                v.classification ??
                                                                                "RCA"),
                                                                        }));
                                                                    } })] }), _jsxs("div", { children: [_jsx("label", { children: "Wing / Unit" }), _jsx("select", { value: newVacay.wing ?? WINGS[0], onChange: (e) => setNewVacay((v) => ({ ...v, wing: e.target.value })), children: WINGS.map((w) => (_jsx("option", { value: w, children: w }, w))) })] }), _jsx("div", { style: { gridColumn: "1 / -1" }, children: _jsxs("label", { className: `toggle-box${!multiDay ? " checked" : ""}`, children: [_jsx("input", { type: "checkbox", className: "toggle-input", checked: !multiDay, onChange: (e) => {
                                                                            const checked = e.target.checked;
                                                                            setMultiDay(!checked);
                                                                            setNewVacay((v) => ({
                                                                                ...v,
                                                                                endDate: !checked ? "" : v.startDate,
                                                                            }));
                                                                        } }), _jsx("span", { className: "toggle-indicator" }), !multiDay ? "1 day" : ">1 day"] }) }), !multiDay && (_jsxs("div", { style: { gridColumn: "1 / -1" }, onClick: () => handleDateFieldClick(vacDateRef), children: [_jsx("label", { htmlFor: "vac-date", children: "Date" }), _jsx("input", { ref: vacDateRef, id: "vac-date", type: "date", value: newVacay.startDate ?? "", onChange: (e) => setNewVacay((v) => ({
                                                                        ...v,
                                                                        startDate: e.target.value,
                                                                        endDate: e.target.value,
                                                                    })) })] })), multiDay && (_jsxs(_Fragment, { children: [_jsxs("div", { onClick: () => handleDateFieldClick(vacStartRef), children: [_jsx("label", { htmlFor: "vac-start", children: "Start Date" }), _jsx("input", { ref: vacStartRef, id: "vac-start", type: "date", value: newVacay.startDate ?? "", onChange: (e) => setNewVacay((v) => ({
                                                                                ...v,
                                                                                startDate: e.target.value,
                                                                            })) })] }), _jsxs("div", { onClick: () => handleDateFieldClick(vacEndRef), children: [_jsx("label", { htmlFor: "vac-end", children: "End Date" }), _jsx("input", { ref: vacEndRef, id: "vac-end", type: "date", value: newVacay.endDate ?? "", onChange: (e) => setNewVacay((v) => ({ ...v, endDate: e.target.value })) })] })] })), _jsxs("div", { children: [_jsx("label", { children: "Shift" }), _jsxs("select", { value: newVacay.shiftPreset ?? defaultShift.label, onChange: (e) => {
                                                                        const preset = SHIFT_PRESETS.find((p) => p.label === e.target.value);
                                                                        if (preset) {
                                                                            setNewVacay((v) => ({
                                                                                ...v,
                                                                                shiftPreset: preset.label,
                                                                                shiftStart: preset.start,
                                                                                shiftEnd: preset.end,
                                                                            }));
                                                                        }
                                                                        else {
                                                                            setNewVacay((v) => ({ ...v, shiftPreset: "Custom" }));
                                                                        }
                                                                    }, children: [SHIFT_PRESETS.map((p) => (_jsxs("option", { value: p.label, children: [p.label, " (", p.start, "\u2013", p.end, ")"] }, p.label))), _jsx("option", { value: "Custom", children: "Custom" })] })] }), newVacay.shiftPreset === "Custom" && (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("label", { children: "Shift Start" }), _jsx("input", { type: "time", value: newVacay.shiftStart ?? "", onChange: (e) => setNewVacay((v) => ({
                                                                                ...v,
                                                                                shiftStart: e.target.value,
                                                                            })) })] }), _jsxs("div", { children: [_jsx("label", { children: "Shift End" }), _jsx("input", { type: "time", value: newVacay.shiftEnd ?? "", onChange: (e) => setNewVacay((v) => ({
                                                                                ...v,
                                                                                shiftEnd: e.target.value,
                                                                            })) })] })] })), _jsxs("div", { style: { gridColumn: "1 / -1" }, children: [_jsx("label", { children: "Notes" }), _jsx("textarea", { placeholder: "Optional", onChange: (e) => setNewVacay((v) => ({ ...v, notes: e.target.value })) })] }), _jsx("div", { style: { gridColumn: "1 / -1" }, children: _jsx("button", { className: "btn", onClick: () => addVacationAndGenerate(newVacay), children: "Add & Generate" }) })] }) })] }), _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-h", children: "Open Vacancies" }), _jsxs("div", { className: "card-c", children: [_jsxs("div", { style: {
                                                            marginBottom: 8,
                                                            display: "flex",
                                                            gap: 8,
                                                            alignItems: "center",
                                                        }, children: [_jsxs("label", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [_jsx("input", { type: "checkbox", checked: filteredVacancies.length > 0 &&
                                                                            selectedVacancyIds.length ===
                                                                                filteredVacancies.length, onChange: (e) => toggleAllVacancies(e.target.checked) }), "All"] }), _jsx("button", { className: "btn btn-sm", onClick: () => setFiltersOpen((o) => !o), children: filtersOpen ? "Hide Filters ▲" : "Show Filters ▼" }), appConfig.features.coverageDayPicker && (_jsx("button", { className: "btn btn-sm", onClick: () => setShowRangeForm(true), children: "New Multi-Day Vacancy" })), selectedVacancyIds.length > 0 && (_jsxs(_Fragment, { children: [_jsx("button", { className: "btn btn-sm", onClick: () => setBulkAwardOpen(true), children: "Bulk Award" }), _jsxs("span", { className: "badge", children: [selectedVacancyIds.length, " selected"] })] }))] }), filtersOpen && (_jsxs("div", { className: "toolbar", style: { marginBottom: 8 }, children: [_jsxs("select", { value: filterWing, onChange: (e) => setFilterWing(e.target.value), children: [_jsx("option", { value: "", children: "All Wings" }), WINGS.map((w) => (_jsx("option", { value: w, children: w }, w)))] }), _jsxs("select", { value: filterClass, onChange: (e) => setFilterClass(e.target.value), children: [_jsx("option", { value: "", children: "All Classes" }), ["RCA", "LPN", "RN"].map((c) => (_jsx("option", { value: c, children: c }, c)))] }), _jsxs("select", { value: filterShift, onChange: (e) => setFilterShift(e.target.value), children: [_jsx("option", { value: "", children: "All Shifts" }), SHIFT_PRESETS.map((s) => (_jsx("option", { value: s.label, children: s.label }, s.label)))] }), _jsxs("select", { value: filterCountdown, onChange: (e) => setFilterCountdown(e.target.value), children: [_jsx("option", { value: "", children: "All Countdowns" }), _jsx("option", { value: "green", children: "Green" }), _jsx("option", { value: "yellow", children: "Yellow" }), _jsx("option", { value: "red", children: "Red" })] }), _jsx("input", { type: "date", value: filterStart, onChange: (e) => setFilterStart(e.target.value) }), _jsx("input", { type: "date", value: filterEnd, onChange: (e) => setFilterEnd(e.target.value) }), _jsx("button", { className: "btn", onClick: () => {
                                                                    setFilterWing("");
                                                                    setFilterClass("");
                                                                    setFilterShift("");
                                                                    setFilterCountdown("");
                                                                    setFilterStart("");
                                                                    setFilterEnd("");
                                                                }, children: "Clear" })] })), _jsxs("table", { className: "vac-table responsive-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: _jsx("input", { type: "checkbox", "aria-label": "Select all vacancies", checked: filteredVacancies.length > 0 &&
                                                                                    selectedVacancyIds.length ===
                                                                                        filteredVacancies.length, onChange: (e) => toggleAllVacancies(e.target.checked) }) }), _jsx("th", { children: "Shift" }), _jsx("th", { children: "Wing" }), _jsx("th", { children: "Class" }), _jsx("th", { children: "Offering" }), _jsx("th", { children: "Recommended" }), _jsx("th", { children: "Countdown" }), _jsx("th", { children: "Assign" }), _jsx("th", { children: "Override" }), _jsx("th", { children: "Reason (if overriding)" }), _jsx("th", { colSpan: 2, style: { textAlign: "center" }, children: "Actions" })] }) }), _jsx("tbody", { children: rows.map((row) => {
                                                                    if (row.type === "bundle") {
                                                                        return (_jsx(BundleRow, { groupId: row.key, items: row.items, settings: settings, selectedIds: selectedVacancyIds, onToggleSelectMany: toggleMany, onDeleteMany: deleteMany, dueNextId: dueNextId }, `bundle-${row.key}`));
                                                                    }
                                                                    const v = row.item;
                                                                    const rec = recommendations[v.id];
                                                                    const recId = rec?.id;
                                                                    const recName = recId
                                                                        ? `${employeesById[recId]?.firstName ?? ""} ${employeesById[recId]?.lastName ?? ""}`.trim()
                                                                        : "—";
                                                                    const recWhy = rec?.why ?? [];
                                                                    const msLeft = deadlineFor(v, settings).getTime() - now;
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
                                                                }) })] }), filteredVacancies.length === 0 && (_jsx("div", { className: "subtitle", style: { marginTop: 8 }, children: "No open vacancies \uD83C\uDF89" }))] })] })] })] })), tab === "calendar" && (_jsx("div", { className: "grid", children: _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-h", children: "Monthly Schedule (open shifts)" }), _jsx("div", { className: "card-c", children: _jsx(MonthlySchedule, { vacancies: vacancies }) })] }) })), tab === "bids" && (_jsx(BidsPage, { bids: bids, archivedBids: archivedBids, setBids: setBids, vacancies: vacancies, vacations: vacations, employees: employees, employeesById: employeesById })), tab === "employees" && (_jsx(EmployeesPage, { employees: employees, setEmployees: setEmployees })), tab === "archive" && _jsx(ArchivePage, { vacations: vacations }), tab === "alerts" && (_jsx("div", { className: "grid", children: _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-h", children: "Quick Stats" }), _jsxs("div", { className: "card-c", children: [_jsxs("div", { className: "pill", children: ["Open: ", vacancies.filter((v) => v.status !== "Filled" && v.status !== "Awarded").length] }), _jsxs("div", { className: "pill", style: { marginLeft: 6 }, children: ["Archived vacations:", " ", vacations.filter((v) => v.archived).length] })] })] }) })), tab === "settings" && (_jsx(SettingsPage, { settings: settings, setSettings: setSettings })), appConfig.features.coverageDayPicker && (_jsx(VacancyRangeForm, { open: showRangeForm, onClose: () => setShowRangeForm(false), onSave: handleSaveRange, existingVacancies: vacancies })), _jsx(BulkAwardDialog, { open: bulkAwardOpen, employees: employees, vacancies: vacancies.filter((v) => selectedVacancyIds.includes(v.id)), onClose: () => setBulkAwardOpen(false), onConfirm: (payload) => {
                            setVacancies((prev) => applyAwardVacancies(prev, selectedVacancyIds, payload));
                            archiveBids(selectedVacancyIds);
                            setSelectedVacancyIds([]);
                            setBulkAwardOpen(false);
                        } })] })] }));
}
// ---------- Pages ----------
function EmployeesPage({ employees, setEmployees, }) {
    return (_jsxs("div", { className: "grid", children: [_jsxs("div", { className: "card", children: [_jsx("div", { className: "card-h", children: "Import Staff (CSV)" }), _jsxs("div", { className: "card-c", children: [_jsx("input", { type: "file", accept: ".csv", onChange: async (e) => {
                                    const f = e.target.files?.[0];
                                    if (!f)
                                        return;
                                    const text = await f.text();
                                    const { parseCSV } = await import("./utils/csv");
                                    let rows = [];
                                    try {
                                        rows = parseCSV(text);
                                    }
                                    catch (err) {
                                        console.error(err);
                                        alert("Failed to parse CSV");
                                        return;
                                    }
                                    const out = rows.map((r, i) => ({
                                        id: String(r.id ?? r.EmployeeID ?? `emp_${i}`),
                                        firstName: String(r.firstName ?? r.name ?? ""),
                                        lastName: String(r.lastName ?? ""),
                                        classification: (["RCA", "LPN", "RN"].includes(String(r.classification))
                                            ? r.classification
                                            : "RCA"),
                                        status: (["FT", "PT", "Casual"].includes(String(r.status))
                                            ? r.status
                                            : "FT"),
                                        homeWing: String(r.homeWing ?? ""),
                                        startDate: String(r.startDate ?? ""),
                                        seniorityHours: Number(r.seniorityHours ?? 0),
                                        seniorityRank: Number(r.seniorityRank ?? i + 1),
                                        active: String(r.active ?? "Yes")
                                            .toLowerCase()
                                            .startsWith("y"),
                                    }));
                                    setEmployees(out.filter((e) => !!e.id));
                                } }), _jsx("div", { className: "subtitle", children: "Columns: id, firstName, lastName, classification (RCA/LPN/RN), status (FT/PT/Casual), homeWing, startDate, seniorityHours, seniorityRank, active (Yes/No)" })] })] }), _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-h", children: "Add Employee" }), _jsx("div", { className: "card-c", children: _jsxs("form", { onSubmit: (e) => {
                                e.preventDefault();
                                const form = e.target;
                                const name = form.elements.namedItem("name")
                                    .value;
                                const start = form.elements.namedItem("start").value;
                                const hours = Number(form.elements.namedItem("hours").value);
                                if (!name)
                                    return;
                                const [first, ...rest] = name.trim().split(" ");
                                const classification = form.elements.namedItem("classification").value;
                                const status = form.elements.namedItem("status").value;
                                const rank = Number(form.elements.namedItem("rank").value);
                                const newEmp = {
                                    id: `emp_${Date.now()}`,
                                    firstName: first ?? "",
                                    lastName: rest.join(" "),
                                    classification,
                                    status,
                                    seniorityRank: rank || employees.length + 1,
                                    active: true,
                                };
                                const sorted = [...employees, newEmp].sort((a, b) => (a.seniorityRank ?? 99999) - (b.seniorityRank ?? 99999));
                                setEmployees(sorted);
                                form.reset();
                            }, children: [_jsxs("div", { className: "row cols4", children: [_jsxs("div", { children: [_jsx("label", { children: "Name" }), _jsx("input", { name: "name", type: "text" })] }), _jsxs("div", { children: [_jsx("label", { children: "Class" }), _jsxs("select", { name: "classification", children: [_jsx("option", { value: "RCA", children: "RCA" }), _jsx("option", { value: "LPN", children: "LPN" }), _jsx("option", { value: "RN", children: "RN" })] })] }), _jsxs("div", { children: [_jsx("label", { children: "Status" }), _jsxs("select", { name: "status", children: [_jsx("option", { value: "FT", children: "FT" }), _jsx("option", { value: "PT", children: "PT" }), _jsx("option", { value: "Casual", children: "Casual" })] })] }), _jsxs("div", { children: [_jsx("label", { children: "Rank" }), _jsx("input", { name: "rank", type: "number" })] })] }), _jsx("button", { type: "submit", style: { marginTop: 8 }, children: "Add" })] }) })] }), _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-h", children: "Employees" }), _jsx("div", { className: "card-c", children: _jsxs("table", { className: "responsive-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "" }), _jsx("th", { children: "Name" }), _jsx("th", { children: "" }), _jsx("th", { children: "" }), _jsx("th", { children: "Class" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Rank" }), _jsx("th", { children: "Active" })] }) }), _jsx("tbody", { children: employees.map((e) => (_jsxs("tr", { children: [_jsx("td", { children: "" }), _jsxs("td", { children: [e.firstName, " ", e.lastName] }), _jsx("td", { children: "" }), _jsx("td", { children: "" }), _jsx("td", { children: e.classification }), _jsx("td", { children: e.status }), _jsx("td", { children: e.seniorityRank }), _jsx("td", { children: e.active ? "Yes" : "No" })] }, e.id))) })] }) })] })] }));
}
function ArchivePage({ vacations }) {
    const archived = vacations.filter((v) => v.archived);
    return (_jsx("div", { className: "grid", children: _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-h", children: "Archived Vacations (fully covered)" }), _jsxs("div", { className: "card-c", children: [_jsxs("table", { className: "responsive-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Employee" }), _jsx("th", { children: "Wing" }), _jsx("th", { children: "From" }), _jsx("th", { children: "To" }), _jsx("th", { children: "Archived" })] }) }), _jsx("tbody", { children: archived.map((v) => (_jsxs("tr", { children: [_jsx("td", { children: v.employeeName }), _jsx("td", { children: v.wing }), _jsx("td", { children: formatDateLong(v.startDate) }), _jsx("td", { children: formatDateLong(v.endDate) }), _jsx("td", { children: new Date(v.archivedAt || "").toLocaleString() })] }, v.id))) })] }), !archived.length && (_jsx("div", { className: "subtitle", style: { marginTop: 8 }, children: "Nothing here yet." }))] })] }) }));
}
function SettingsPage({ settings, setSettings, }) {
    return (_jsxs("div", { className: "grid", children: [_jsxs("div", { className: "card", children: [_jsx("div", { className: "card-h", children: "Appearance & Defaults" }), _jsx("div", { className: "card-c", children: _jsxs("div", { className: "row cols2", children: [_jsxs("div", { children: [_jsx("label", { children: "Theme" }), _jsxs("select", { value: settings.theme, onChange: (e) => setSettings((s) => ({
                                                ...s,
                                                theme: e.target.value,
                                            })), children: [_jsx("option", { value: "light", children: "Light" }), _jsx("option", { value: "dark", children: "Dark" })] })] }), _jsxs("div", { children: [_jsx("label", { children: "Default Shift Template" }), _jsx("select", { value: settings.defaultShiftPreset, onChange: (e) => setSettings((s) => ({
                                                ...s,
                                                defaultShiftPreset: e.target.value,
                                            })), children: SHIFT_PRESETS.map((p) => (_jsxs("option", { value: p.label, children: [p.label, " (", p.start, "\u2013", p.end, ")"] }, p.label))) })] })] }) })] }), _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-h", children: "Dashboard Order" }), _jsxs("div", { className: "card-c", children: [_jsx(TabOrderEditor, { order: settings.tabOrder, setOrder: (o) => setSettings((s) => ({ ...s, tabOrder: o })) }), _jsx("div", { className: "subtitle", style: { marginTop: 8 }, children: "Drag items to reorder tabs." })] })] }), _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-h", children: "Response Windows (minutes)" }), _jsx("div", { className: "card-c", children: _jsx("div", { className: "row cols2", children: [
                                ["<2h", "lt2h"],
                                ["2–4h", "h2to4"],
                                ["4–24h", "h4to24"],
                                ["24–72h", "h24to72"],
                                [">72h", "gt72"],
                            ].map(([label, key]) => (_jsxs("div", { children: [_jsx("label", { children: label }), _jsx("input", { type: "number", value: settings.responseWindows[key], onChange: (e) => setSettings((s) => ({
                                            ...s,
                                            responseWindows: {
                                                ...s.responseWindows,
                                                [key]: Number(e.target.value),
                                            },
                                        })) })] }, key))) }) })] })] }));
}
function TabOrderEditor({ order, setOrder, }) {
    const [dragIndex, setDragIndex] = useState(null);
    return (_jsx("ul", { style: { listStyle: "none", padding: 0, margin: 0 }, children: order.map((item, idx) => (_jsx("li", { draggable: true, onDragStart: () => setDragIndex(idx), onDragOver: (e) => e.preventDefault(), onDrop: () => {
                if (dragIndex === null)
                    return;
                setOrder(reorder(order, dragIndex, idx));
                setDragIndex(null);
            }, style: {
                padding: "8px 10px",
                border: "1px solid var(--stroke)",
                borderRadius: "8px",
                background: "var(--cardAlt)",
                marginBottom: 6,
                cursor: "move",
            }, children: item[0].toUpperCase() + item.slice(1) }, item))) }));
}
export function BidsPage({ bids, archivedBids, setBids, vacancies, vacations, employees, employeesById, }) {
    const [newBid, setNewBid] = useState({});
    const bidDateRef = useRef(null);
    const vacWithCoveredName = (v) => {
        const vac = vacations.find((x) => x.id === v.vacationId);
        const covered = vac ? vac.employeeName : "";
        return `${displayVacancyLabel(v)} — covering ${covered}`.trim();
    };
    const openVacancies = vacancies.filter((v) => v.status !== "Filled" && v.status !== "Awarded");
    const activeBids = bids.filter((b) => {
        const v = vacancies.find((x) => x.id === b.vacancyId);
        return !v || v.status !== "Awarded";
    });
    const awardedVacancies = vacancies.filter((v) => v.status === "Awarded");
    const [expanded, setExpanded] = useState({});
    const removeBid = (index) => {
        setBids((prev) => prev.filter((_, idx) => idx !== index));
    };
    const setNow = () => {
        const now = new Date();
        const d = isoDate(now);
        const t = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        setNewBid((b) => ({ ...b, bidDate: d, bidTime: t }));
    };
    return (_jsxs("div", { className: "grid", children: [_jsxs("div", { className: "card", children: [_jsx("div", { className: "card-h", children: "Add Bid" }), _jsx("div", { className: "card-c", children: _jsxs("div", { className: "row cols2", children: [_jsxs("div", { children: [_jsx("label", { children: "Vacancy" }), _jsxs("select", { onChange: (e) => setNewBid((b) => ({ ...b, vacancyId: e.target.value })), value: newBid.vacancyId ?? "", children: [_jsx("option", { value: "", disabled: true, children: "Pick vacancy" }), openVacancies.length ? (openVacancies.map((v) => (_jsx("option", { value: v.id, children: vacWithCoveredName(v) }, v.id)))) : (_jsx("option", { disabled: true, children: "No open vacancies" }))] })] }), _jsxs("div", { children: [_jsx("label", { children: "Employee" }), _jsx(EmployeeCombo, { employees: employees, onSelect: (id) => {
                                                const e = employeesById[id];
                                                setNewBid((b) => ({
                                                    ...b,
                                                    bidderEmployeeId: id,
                                                    bidderName: e ? `${e.firstName} ${e.lastName}` : "",
                                                    bidderStatus: e?.status,
                                                    bidderClassification: e?.classification,
                                                }));
                                            } })] }), _jsxs("div", { onClick: () => bidDateRef.current?.showPicker(), children: [_jsx("label", { children: "Bid Date" }), _jsx("input", { type: "date", ref: bidDateRef, value: newBid.bidDate ?? "", onChange: (e) => setNewBid((b) => ({ ...b, bidDate: e.target.value })) })] }), _jsxs("div", { children: [_jsx("label", { children: "Bid Time" }), _jsxs("div", { className: "form-row", children: [_jsx("input", { type: "time", value: newBid.bidTime ?? "", onChange: (e) => setNewBid((b) => ({ ...b, bidTime: e.target.value })) }), _jsx("button", { className: "btn", onClick: setNow, children: "Now" })] })] }), _jsxs("div", { style: { gridColumn: "1 / -1" }, children: [_jsx("label", { children: "Notes" }), _jsx("input", { placeholder: 'e.g., "available for 06:30-14:30"', onChange: (e) => setNewBid((b) => ({ ...b, notes: e.target.value })) })] }), _jsx("div", { style: { gridColumn: "1 / -1" }, children: _jsx("button", { className: "btn", onClick: () => {
                                            if (!newBid.vacancyId || !newBid.bidderEmployeeId)
                                                return alert("Vacancy and employee required");
                                            const ts = newBid.bidDate && newBid.bidTime
                                                ? new Date(`${newBid.bidDate}T${newBid.bidTime}:00`).toISOString()
                                                : new Date().toISOString();
                                            const vac = vacancies.find((x) => x.id === newBid.vacancyId);
                                            const targetIds = vac?.bundleId
                                                ? vacancies
                                                    .filter((x) => x.bundleId === vac.bundleId &&
                                                    x.status !== "Filled" &&
                                                    x.status !== "Awarded")
                                                    .map((x) => x.id)
                                                : [newBid.vacancyId];
                                            setBids((prev) => {
                                                const arr = [...prev];
                                                for (const id of targetIds) {
                                                    arr.push({
                                                        vacancyId: id,
                                                        bidderEmployeeId: newBid.bidderEmployeeId,
                                                        bidderName: newBid.bidderName ?? "",
                                                        bidderStatus: (newBid.bidderStatus ?? "Casual"),
                                                        bidderClassification: (newBid.bidderClassification ??
                                                            "RCA"),
                                                        bidTimestamp: ts,
                                                        notes: newBid.notes ?? "",
                                                    });
                                                }
                                                return arr;
                                            });
                                            setNewBid({});
                                        }, children: "Add Bid" }) })] }) })] }), _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-h", children: "Active Bids" }), _jsx("div", { className: "card-c", children: _jsxs("table", { className: "responsive-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Vacancy" }), _jsx("th", { children: "Employee" }), _jsx("th", { children: "Class" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Bid at" }), _jsx("th", {})] }) }), _jsx("tbody", { children: activeBids.map((b, i) => {
                                        const v = vacancies.find((x) => x.id === b.vacancyId);
                                        return (_jsxs("tr", { children: [_jsx("td", { children: v ? displayVacancyLabel(v) : b.vacancyId }), _jsx("td", { children: b.bidderName }), _jsx("td", { children: b.bidderClassification }), _jsx("td", { children: b.bidderStatus }), _jsx("td", { children: new Date(b.bidTimestamp).toLocaleString() }), _jsx("td", { children: _jsx("button", { className: "btn", style: { background: "var(--bad)", color: "#fff" }, onClick: () => removeBid(i), children: "Delete" }) })] }, i));
                                    }) })] }) })] }), _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-h", children: "Archived Bids" }), _jsx("div", { className: "card-c", children: _jsx("table", { className: "responsive-table", children: _jsxs("tbody", { children: [awardedVacancies.map((v) => (_jsxs(Fragment, { children: [_jsx("tr", { onClick: () => setExpanded((prev) => ({ ...prev, [v.id]: !prev[v.id] })), style: { cursor: "pointer", background: "var(--cardAlt)" }, children: _jsx("td", { colSpan: 5, children: displayVacancyLabel(v) }) }), expanded[v.id] && (_jsxs(Fragment, { children: [_jsxs("tr", { children: [_jsx("th", { style: { paddingLeft: 24 }, children: "Employee" }), _jsx("th", { children: "Class" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Bid at" }), _jsx("th", { children: "Notes" })] }), archivedBids[v.id]?.map((b, i) => (_jsxs("tr", { children: [_jsx("td", { style: { paddingLeft: 24 }, children: b.bidderName }), _jsx("td", { children: b.bidderClassification }), _jsx("td", { children: b.bidderStatus }), _jsx("td", { children: new Date(b.bidTimestamp).toLocaleString() }), _jsx("td", { children: b.notes })] }, i))), !(archivedBids[v.id] && archivedBids[v.id].length) && (_jsx("tr", { children: _jsx("td", { style: { paddingLeft: 24 }, colSpan: 5, children: "No bids" }) }))] }))] }, v.id))), !awardedVacancies.length && (_jsx("tr", { children: _jsx("td", { children: "No archived bids" }) }))] }) }) })] })] }));
}
function CoverageDayList({ dateISO, vacancies, }) {
    return (_jsxs("div", { style: { marginTop: 12 }, children: [_jsxs("div", { className: "pill", children: ["Vacancies on ", formatDateLong(dateISO), ": ", vacancies.length] }), vacancies.length > 0 && (_jsxs("table", { className: "responsive-table", style: { marginTop: 8 }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Shift" }), _jsx("th", { children: "Wing" }), _jsx("th", { children: "Class" }), _jsx("th", { children: "Offering" }), _jsx("th", { children: "Status" })] }) }), _jsx("tbody", { children: vacancies.map((v) => (_jsxs("tr", { children: [_jsxs("td", { children: [v.shiftStart, "-", v.shiftEnd] }), _jsx("td", { children: v.wing ?? "" }), _jsx("td", { children: v.classification }), _jsx("td", { children: v.offeringStep }), _jsx("td", { children: v.status })] }, v.id))) })] }))] }));
}
function MonthlySchedule({ vacancies }) {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth()); // 0-11
    const [selectedISO, setSelectedISO] = useState(isoDate(today));
    const todayISO = isoDate(today);
    const calDays = useMemo(() => buildCalendar(year, month), [year, month]);
    const vacanciesByDay = useMemo(() => {
        const all = vacancies.filter((v) => (v.status !== "Filled" && v.status !== "Awarded") ||
            v.shiftDate >= todayISO);
        return groupVacanciesByDate(all);
    }, [vacancies, todayISO]);
    const monthLabel = new Date(year, month, 1).toLocaleString(undefined, {
        month: "long",
        year: "numeric",
    });
    const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return (_jsxs("div", { children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("button", { className: "btn", onClick: () => prevMonth(setYear, setMonth, year, month), children: "<" }), _jsx("div", { className: "pill", children: monthLabel }), _jsx("button", { className: "btn", onClick: () => nextMonth(setYear, setMonth, year, month), children: ">" }), _jsx("div", { style: { marginLeft: "auto" }, className: "subtitle", children: "Click a day to list shifts" })] }), _jsxs("div", { className: "cal-grid", children: [dow.map((d) => (_jsx("div", { className: "cal-dow", children: d }, d))), calDays.map(({ date, inMonth }) => {
                        const key = isoDate(date);
                        const dayVacancies = vacanciesByDay.get(key) || [];
                        const isToday = key === todayISO;
                        const isSelected = key === selectedISO;
                        return (_jsxs("div", { className: `cal-day ${inMonth ? "" : "mute"} ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`, onClick: () => setSelectedISO(key), children: [_jsx("div", { className: "cal-num", children: date.getDate() }), _jsx("div", { className: "cal-open", children: dayVacancies.length ? (_jsxs(_Fragment, { children: [dayVacancies.slice(0, 3).map((v) => (_jsxs("span", { className: "cal-chip", "data-wing": v.wing || undefined, "data-class": v.classification, children: [v.wing ? `${v.wing} ` : "", v.classification] }, v.id))), dayVacancies.length > 3 && (_jsxs("span", { className: "cal-chip", children: ["+", dayVacancies.length - 3, " more"] }))] })) : (_jsx("span", { className: "subtitle", children: "\u2014" })) })] }, key));
                    })] }), _jsx(CoverageDayList, { dateISO: selectedISO, vacancies: vacanciesByDay.get(selectedISO) || [] })] }));
}
// ---------- Small components ----------
function VacancyRow({ v, recId, recName, recWhy, employees, selected, onToggleSelect, countdownLabel, countdownClass, isDueNext, onAward, onResetKnownAt, onDelete, }) {
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
        onAward({
            empId: choice || undefined,
            reason: reason || undefined,
            overrideUsed: overrideClass,
        });
        setChoice("");
        setReason("");
        setOverrideClass(false);
    }
    return (_jsxs("tr", { className: `${isDueNext ? "due-next " : ""}${selected ? "selected" : ""}`.trim(), "aria-selected": selected, tabIndex: 0, children: [_jsx("td", { children: _jsx("input", { type: "checkbox", checked: selected, onChange: onToggleSelect }) }), _jsxs("td", { children: [_jsx("span", { className: "pill", children: formatDowShort(v.shiftDate) }), " ", formatDateLong(v.shiftDate), " \u2022 ", v.shiftStart, "-", v.shiftEnd] }), _jsx("td", { children: v.wing ?? "" }), _jsx("td", { children: v.classification }), _jsx("td", { children: v.offeringStep }), _jsx("td", { children: _jsxs("div", { style: {
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 4,
                    }, children: [_jsx("span", { children: recName }), recWhy.map((w, i) => (_jsx("span", { className: "pill", children: w }, i)))] }) }), _jsx("td", { children: _jsx("span", { className: `cd-chip ${countdownClass}`, children: countdownLabel }) }), _jsx("td", { style: { minWidth: 220 }, children: _jsx(SelectEmployee, { allowEmpty: true, employees: employees, value: choice, onChange: setChoice }) }), _jsxs("td", { style: { whiteSpace: "nowrap" }, children: [_jsx("input", { id: "override-toggle", className: "toggle-input", type: "checkbox", checked: overrideClass, onChange: (e) => setOverrideClass(e.target.checked) }), _jsx("label", { htmlFor: "override-toggle", className: "toggle-box", children: _jsx("span", { className: "subtitle", children: "Allow class override" }) })] }), _jsx("td", { style: { minWidth: 230 }, children: needReason ||
                    overrideClass ||
                    (recId && choice && choice !== recId) ? (_jsxs("select", { value: reason, onChange: (e) => setReason(e.target.value), children: [_jsx("option", { value: "", children: "Select reason\u2026" }), OVERRIDE_REASONS.map((r) => (_jsx("option", { value: r, children: r }, r)))] })) : (_jsx("span", { className: "subtitle", children: "\u2014" })) }), _jsxs("td", { style: { display: "flex", gap: 6 }, children: [_jsx("button", { className: "btn", onClick: onResetKnownAt, children: "Reset timer" }), _jsx("button", { className: "btn", onClick: handleAward, disabled: !choice, children: "Award" })] }), _jsx("td", { children: _jsx("button", { className: "btn btn-sm", "aria-label": "Delete vacancy", title: "Delete vacancy", "data-testid": `vacancy-delete-${v.id}`, tabIndex: 0, onClick: () => onDelete(v.id), children: TrashIcon ? (_jsx(TrashIcon, { style: { width: 16, height: 16 }, "aria-hidden": "true" })) : ("Delete") }) })] }));
}
function SelectEmployee({ employees, value, onChange, allowEmpty = false, }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const ref = useRef(null);
    const menuRef = useRef(null);
    const [dropUp, setDropUp] = useState(false);
    const [rect, setRect] = useState(null);
    const list = useMemo(() => employees
        .filter((e) => matchText(q, `${e.firstName} ${e.lastName} ${e.id}`))
        .slice(0, 50), [q, employees]);
    const curr = employees.find((e) => e.id === value);
    useEffect(() => {
        const onDoc = (e) => {
            if (!ref.current)
                return;
            if (!ref.current.contains(e.target))
                setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);
    useEffect(() => {
        if (!value)
            setQ("");
    }, [value]);
    useEffect(() => {
        if (open && menuRef.current) {
            const r = menuRef.current.getBoundingClientRect();
            setDropUp(r.bottom > window.innerHeight);
            setRect(r);
        }
    }, [open]);
    return (_jsxs("div", { className: "dropdown", ref: ref, children: [_jsx("input", { placeholder: curr
                    ? `${curr.firstName} ${curr.lastName} (${curr.id})`
                    : "Type name or ID…", value: q, onChange: (e) => {
                    setQ(e.target.value);
                    setOpen(true);
                }, onFocus: () => setOpen(true) }), open && (_jsxs("div", { className: "menu", ref: menuRef, style: {
                    top: dropUp ? "auto" : "100%",
                    bottom: dropUp ? "100%" : "auto",
                    maxHeight: rect
                        ? Math.min(320, dropUp ? rect.top - 20 : window.innerHeight - rect.top - 20)
                        : 320,
                    overflow: "auto",
                }, children: [allowEmpty && (_jsx("div", { className: "item", onClick: () => {
                            onChange("EMPTY");
                            setQ("");
                            setOpen(false);
                        }, children: "Empty" })), list.map((e) => (_jsxs("div", { className: "item", onClick: () => {
                            onChange(e.id);
                            setQ(`${e.firstName} ${e.lastName} (${e.id})`);
                            setOpen(false);
                        }, children: [e.firstName, " ", e.lastName, " ", _jsxs("span", { className: "pill", style: { marginLeft: 6 }, children: [e.classification, " ", e.status] })] }, e.id))), !list.length && (_jsx("div", { className: "item", style: { opacity: 0.7 }, children: "No matches" }))] }))] }));
}
function EmployeeCombo({ employees, onSelect, }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const ref = useRef(null);
    const list = useMemo(() => employees
        .filter((e) => matchText(q, `${e.firstName} ${e.lastName} ${e.id}`))
        .slice(0, 50), [q, employees]);
    useEffect(() => {
        const onDoc = (e) => {
            if (!ref.current)
                return;
            if (!ref.current.contains(e.target))
                setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);
    return (_jsxs("div", { className: "dropdown", ref: ref, children: [_jsx("input", { placeholder: "Type name or ID\u2026", value: q, onChange: (e) => {
                    setQ(e.target.value);
                    setOpen(true);
                }, onFocus: () => setOpen(true) }), open && (_jsxs("div", { className: "menu", children: [list.map((e) => (_jsxs("div", { className: "item", onClick: () => {
                            onSelect(e.id);
                            setQ(`${e.firstName} ${e.lastName} (${e.id})`);
                            setOpen(false);
                        }, children: [e.firstName, " ", e.lastName, " ", _jsxs("span", { className: "pill", style: { marginLeft: 6 }, children: [e.classification, " ", e.status] })] }, e.id))), !list.length && (_jsx("div", { className: "item", style: { opacity: 0.7 }, children: "No matches" }))] }))] }));
}
// ---------- Helpers ----------
export function dateRangeInclusive(startISO, endISO) {
    const out = [];
    const s = new Date(startISO + "T00:00:00");
    const e = new Date(endISO + "T00:00:00");
    for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1))
        out.push(isoDate(d));
    return out;
}
