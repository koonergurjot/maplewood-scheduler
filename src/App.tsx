import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { recommend, Recommendation } from "./recommend";
import type { OfferingTier } from "./offering/offeringMachine";
import {
  isoDate,
  combineDateTime,
  formatDateLong,
  formatDowShort,
  buildCalendar,
  prevMonth,
  nextMonth,
  minutesBetween,
} from "./lib/dates";
import { matchText } from "./lib/text";
import { reorder } from "./utils/reorder";
import BulkAwardDialog from "./components/BulkAwardDialog";

/**
 * Maplewood Scheduler — Coverage-first (v2.3.0)
 *
 * New in v2.3.0 (per your request):
 * ✔ Live countdown timers on each vacancy row (color shifts to yellow/red as deadline nears)
 * ✔ Auto "knownAt" (already existed) + per-row “Reset knownAt” button for re‑announcing
 * ✔ Sticky table header for Open Vacancies + scrollable panel; highlight the row that’s “due next”
 * ✔ Theme toggle (Dark/Light) + text size slider (great for wall displays)
 * ✔ Reason codes required when you override the recommendation (audit‑friendly trail)
 * ✔ Eligibility gate: block awards outside vacancy class (RCA/LPN/RN) unless “Allow class override” is checked
 * ✔ Open Vacancies layout reformatted to take most of the page and avoid cut‑off
 */

// ---------- Types ----------
export type Classification = "RCA" | "LPN" | "RN";
export type Status = "FT" | "PT" | "Casual";

export type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  classification: Classification;
  status: Status;
  homeWing?: string; // not used for coverage now
  startDate?: string; // ISO YYYY-MM-DD
  seniorityHours?: number;
  seniorityRank: number; // 1 = most senior
  active: boolean;
};

export type Vacation = {
  id: string;
  employeeId: string;
  employeeName: string;
  classification: Classification;
  wing: string; // wing where this vacation occurs
  startDate: string; // ISO YYYY-MM-DD
  endDate: string; // ISO YYYY-MM-DD
  notes?: string;
  archived?: boolean;
  archivedAt?: string; // ISO
};

export type Vacancy = {
  id: string;
  vacationId?: string;
  reason: string; // e.g. Vacation Backfill
  classification: Classification;
  wing?: string;
  shiftDate: string; // ISO date
  shiftStart: string; // HH:mm
  shiftEnd: string; // HH:mm
  knownAt: string; // ISO datetime
  offeringTier: OfferingTier;
  offeringRoundStartedAt?: string;
  offeringRoundMinutes?: number;
  offeringAutoProgress?: boolean;
  offeringStep: "Casuals" | "OT-Full-Time" | "OT-Casuals";
  status: "Open" | "Pending Award" | "Awarded";
  awardedTo?: string; // employeeId
  awardedAt?: string; // ISO datetime
  awardReason?: string; // audit note when overriding recommendation or class
  overrideUsed?: boolean; // true if class override was toggled
};

export type Bid = {
  vacancyId: string;
  bidderEmployeeId: string;
  bidderName: string;
  bidderStatus: Status;
  bidderClassification: Classification;
  bidTimestamp: string; // ISO
  notes?: string;
};

export type Settings = {
  responseWindows: {
    lt2h: number;
    h2to4: number;
    h4to24: number;
    h24to72: number;
    gt72: number;
  };
  theme: "dark" | "light";
  fontScale: number; // 1.0 = 16px base; slider adjusts overall size
  tabOrder: string[];
  defaultShiftPreset: string;
};

// ---------- Constants ----------
const TAB_KEYS = [
  "coverage",
  "calendar",
  "bids",
  "employees",
  "archive",
  "alerts",
  "settings",
] as const;

const defaultSettings: Settings = {
  responseWindows: { lt2h: 7, h2to4: 15, h4to24: 30, h24to72: 120, gt72: 1440 },
  theme:
    typeof window !== "undefined" &&
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
] as const;

const SHIFT_PRESETS = [
  { label: "Day", start: "06:30", end: "14:30" },
  { label: "Evening", start: "14:30", end: "22:30" },
  { label: "Night", start: "22:30", end: "06:30" },
] as const;

export const OVERRIDE_REASONS = [
  "Earlier bidder within step",
  "Availability mismatch / declined",
  "Single Site Order / conflict",
  "Scope of practice / skill mix",
  "Fatigue risk (back‑to‑back)",
  "Unit familiarity / continuity",
  "Manager discretion",
] as const;

// ---------- Local Storage ----------
const LS_KEY = "maplewood-scheduler-v3";
const loadState = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const saveState = (state: any): boolean => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.warn("Unable to access localStorage. State not persisted.", err);
    return false;
  }
};

// ---------- Utils ----------

const displayVacancyLabel = (v: Vacancy) => {
  const d = formatDateLong(v.shiftDate);
  return `${d} • ${v.shiftStart}–${v.shiftEnd} • ${v.wing ?? ""} • ${v.classification}`.replace(
    /\s+•\s+$/,
    "",
  );
};

function pickWindowMinutes(v: Vacancy, settings: Settings) {
  const known = new Date(v.knownAt);
  const shiftStart = combineDateTime(v.shiftDate, v.shiftStart);
  const hrsUntilShift = (shiftStart.getTime() - known.getTime()) / 3_600_000;
  if (hrsUntilShift < 2) return settings.responseWindows.lt2h;
  if (hrsUntilShift < 4) return settings.responseWindows.h2to4;
  if (hrsUntilShift < 24) return settings.responseWindows.h4to24;
  if (hrsUntilShift < 72) return settings.responseWindows.h24to72;
  return settings.responseWindows.gt72;
}

function deadlineFor(v: Vacancy, settings: Settings) {
  const winMin = pickWindowMinutes(v, settings);
  return new Date(new Date(v.knownAt).getTime() + winMin * 60000);
}

function fmtCountdown(msLeft: number) {
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

export const applyAwardVacancy = (
  vacs: Vacancy[],
  vacId: string,
  payload: { empId?: string; reason?: string; overrideUsed?: boolean },
): Vacancy[] => {
  const empId = payload.empId === "EMPTY" ? undefined : payload.empId;
  return vacs.map<Vacancy>((v) =>
    v.id === vacId
      ? {
          ...v,
          status: "Awarded",
          awardedTo: empId,
          awardedAt: new Date().toISOString(),
          awardReason: payload.reason ?? "",
          overrideUsed: !!payload.overrideUsed,
        }
      : v,
  );
};

export const applyAwardVacancies = (
  vacs: Vacancy[],
  vacIds: string[],
  payload: { empId?: string; reason?: string; overrideUsed?: boolean },
): Vacancy[] => {
  return vacIds.reduce(
    (prev, id) => applyAwardVacancy(prev, id, payload),
    vacs,
  );
};

export const archiveBidsForVacancy = (
  bids: Bid[],
  archived: Record<string, Bid[]>,
  vacancyId: string,
): { bids: Bid[]; archivedBids: Record<string, Bid[]> } => {
  const remaining: Bid[] = [];
  const moved: Bid[] = [];
  for (const b of bids) {
    if (b.vacancyId === vacancyId) moved.push(b);
    else remaining.push(b);
  }
  if (!moved.length) return { bids: remaining, archivedBids: archived };
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
  const [tab, setTab] = useState<typeof TAB_KEYS[number]>("coverage");

  const [employees, setEmployees] = useState<Employee[]>(
    persisted?.employees ?? [],
  );
  const [vacations, setVacations] = useState<Vacation[]>(
    persisted?.vacations ?? [],
  );
  const [vacancies, setVacancies] = useState<Vacancy[]>(
    (persisted?.vacancies ?? []).map((v: any) => ({
      offeringTier: "CASUALS",
      offeringRoundStartedAt:
        v.offeringRoundStartedAt ?? new Date().toISOString(),
      offeringRoundMinutes: v.offeringRoundMinutes ?? 120,
      offeringAutoProgress: v.offeringAutoProgress ?? true,
      ...v,
    })),
  );
  const [bids, setBids] = useState<Bid[]>(persisted?.bids ?? []);
  const [archivedBids, setArchivedBids] = useState<Record<string, Bid[]>>(
    persisted?.archivedBids ?? {},
  );
  const [selectedVacancyIds, setSelectedVacancyIds] = useState<string[]>([]);
  const [bulkAwardOpen, setBulkAwardOpen] = useState(false);
  const persistedSettings = persisted?.settings ?? {};
  const storedOrder: string[] = persistedSettings.tabOrder || [];
  const mergedOrder = [
    ...storedOrder,
    ...TAB_KEYS.filter((k) => !storedOrder.includes(k)),
  ];
  const [settings, setSettings] = useState<Settings>({
    ...defaultSettings,
    ...persistedSettings,
    tabOrder: mergedOrder,
  });

  const [filterWing, setFilterWing] = useState<string>("");
  const [filterClass, setFilterClass] = useState<Classification | "">("");
  const [filterStart, setFilterStart] = useState<string>("");
  const [filterEnd, setFilterEnd] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const archiveBids = (vacancyIds: string[]) => {
    setBids((prev) => {
      const remaining: Bid[] = [];
      const archivedGroups: Record<string, Bid[]> = {};
      for (const bid of prev) {
        if (vacancyIds.includes(bid.vacancyId)) {
          (archivedGroups[bid.vacancyId] ??= []).push(bid);
        } else {
          remaining.push(bid);
        }
      }
      setArchivedBids((prevArchived) => {
        const merged = { ...prevArchived };
        for (const [vacId, bids] of Object.entries(archivedGroups)) {
          merged[vacId] = [...(merged[vacId] ?? []), ...bids];
        }
        return merged;
      });
      return remaining;
    });
  };

  // Tick for countdowns
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (
      !saveState({
        employees,
        vacations,
        vacancies,
        bids,
        archivedBids,
        settings,
      })
    ) {
      // localStorage unavailable; state persistence disabled
    }
  }, [employees, vacations, vacancies, bids, archivedBids, settings]);

  const employeesById = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id, e])),
    [employees],
  );

  // Recommendation: choose among eligible bidders with highest seniority (rank 1 best)
  const recommendations = useMemo<Record<string, Recommendation>>(() => {
    const m: Record<string, Recommendation> = {};
    vacancies.forEach((v) => {
      m[v.id] = recommend(v, bids, employeesById);
    });
    return m;
  }, [vacancies, bids, employeesById]);

  // Auto-archive vacations when all their vacancies are awarded
  useEffect(() => {
    const byVacation = new Map<string, Vacancy[]>();
    vacancies.forEach((v) => {
      if (v.vacationId) {
        const a = byVacation.get(v.vacationId) || [];
        a.push(v);
        byVacation.set(v.vacationId, a);
      }
    });
    setVacations((prev) =>
      prev.map((vac) => {
        const list = byVacation.get(vac.id) || [];
        const allAwarded =
          list.length > 0 && list.every((x) => x.status === "Awarded");
        if (allAwarded && !vac.archived)
          return {
            ...vac,
            archived: true,
            archivedAt: new Date().toISOString(),
          };
        return vac;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacancies]);

  const defaultShift = useMemo(
    () =>
      SHIFT_PRESETS.find((p) => p.label === settings.defaultShiftPreset) ||
      SHIFT_PRESETS[0],
    [settings.defaultShiftPreset],
  );

  // Coverage form state
  const [newVacay, setNewVacay] = useState<
    Partial<
      Vacation & { shiftStart: string; shiftEnd: string; shiftPreset: string }
    >
  >({
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

  const vacDateRef = useRef<HTMLInputElement>(null);
  const vacStartRef = useRef<HTMLInputElement>(null);
  const vacEndRef = useRef<HTMLInputElement>(null);
  const handleDateFieldClick = (ref: React.RefObject<HTMLInputElement>) => {
    ref.current?.focus();
    ref.current?.showPicker();
  };

  const [multiDay, setMultiDay] = useState(false);

  // Actions
  const addVacationAndGenerate = (
    v: Partial<
      Vacation & { shiftStart: string; shiftEnd: string; shiftPreset: string }
    >,
  ) => {
    if (
      !v.employeeId ||
      !v.employeeName ||
      !v.classification ||
      !v.startDate ||
      !v.endDate ||
      !v.wing
    ) {
      alert("Employee, wing, start & end are required.");
      return;
    }
    const vac: Vacation = {
      id: `vac_${Date.now().toString(36)}`,
      employeeId: v.employeeId!,
      employeeName: v.employeeName!,
      classification: v.classification!,
      wing: v.wing!,
      startDate: v.startDate!,
      endDate: v.endDate!,
      notes: v.notes ?? "",
      archived: false,
    };
    setVacations((prev) => [vac, ...prev]);

    // one vacancy per day in range
    const days = dateRangeInclusive(v.startDate!, v.endDate!);
    const nowISO = new Date().toISOString();
    const vxs: Vacancy[] = days.map((d) => ({
      id: `VAC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      vacationId: vac.id,
      reason: "Vacation Backfill",
      classification: vac.classification,
      wing: vac.wing,
      shiftDate: d,
      shiftStart: v.shiftStart ?? defaultShift.start,
      shiftEnd: v.shiftEnd ?? defaultShift.end,
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

  const awardVacancy = (
    vacId: string,
    payload: { empId?: string; reason?: string; overrideUsed?: boolean },
  ) => {
    archiveBids([vacId]);
    setVacancies((prev) => applyAwardVacancy(prev, vacId, payload));
  };

  const resetKnownAt = (vacId: string) => {
    setVacancies((prev) =>
      prev.map((v) =>
        v.id === vacId ? { ...v, knownAt: new Date().toISOString() } : v,
      ),
    );
  };

  // Figure out which open vacancy is "due next" (soonest positive deadline)
  const dueNextId = useMemo(() => {
    let min = Infinity;
    let id: string | null = null;
    for (const v of vacancies) {
      if (v.status === "Awarded") continue;
      const dl = deadlineFor(v, settings).getTime() - now;
      if (dl > 0 && dl < min) {
        min = dl;
        id = v.id;
      }
    }
    return id;
  }, [vacancies, now, settings]);

  const filteredVacancies = useMemo(() => {
    return vacancies.filter((v) => {
      if (v.status === "Awarded") return false;
      if (filterWing && v.wing !== filterWing) return false;
      if (filterClass && v.classification !== filterClass) return false;
      if (filterStart && v.shiftDate < filterStart) return false;
      if (filterEnd && v.shiftDate > filterEnd) return false;
      return true;
    });
  }, [vacancies, filterWing, filterClass, filterStart, filterEnd]);

  const toggleAllVacancies = (checked: boolean) => {
    setSelectedVacancyIds(
      checked ? filteredVacancies.map((v) => v.id) : [],
    );
  };

  return (
    <div
      className="app"
      data-theme={settings.theme}
      style={{ fontSize: `${(settings.fontScale || 1) * 16}px` }}
    >
      <style>{`
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
      `}</style>

      <div className="container">
        <div className="nav">
          <div>
            <div className="title">Maplewood Scheduler</div>
            <div className="subtitle">
              Vacations → vacancies • bids • seniority
            </div>
          </div>
          <div className="toolbar">
            <button
              className="btn"
              onClick={() =>
                setSettings((s) => ({
                  ...s,
                  theme: s.theme === "dark" ? "light" : "dark",
                }))
              }
            >
              {settings.theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
            <Link to="/agreement" className="btn">
              Agreement
            </Link>
            <Link to="/audit-log" className="btn">
              Audit Log
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="subtitle">Text size</span>
              <input
                type="range"
                min={0.85}
                max={1.6}
                step={0.05}
                value={settings.fontScale}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    fontScale: Number(e.target.value),
                  }))
                }
              />
            </div>
            <button
              className="btn"
              onClick={() => {
                const blob = new Blob(
                  [
                    JSON.stringify(
                      { employees, vacations, vacancies, bids, settings },
                      null,
                      2,
                    ),
                  ],
                  { type: "application/json" },
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "maplewood-scheduler-backup.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export
            </button>
            <button
              className="btn"
              onClick={() => {
                if (confirm("Reset ALL data?")) {
                  localStorage.removeItem(LS_KEY);
                  location.reload();
                }
              }}
            >
              Reset
            </button>
          </div>
        </div>

        <div className="tabs">
          {settings.tabOrder.map((k) => (
            <button
              key={k}
              className={`tab ${tab === k ? "active" : ""}`}
              onClick={() => setTab(k as any)}
            >
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>

        {tab === "coverage" && (
          <div className="grid grid2">
            <div className="card">
              <div className="card-h">
                Add Vacation (auto-creates daily vacancies)
              </div>
              <div className="card-c">
                <div className="row cols2">
                  <div>
                    <label>Employee</label>
                    <EmployeeCombo
                      employees={employees}
                      onSelect={(id) => {
                        const e = employees.find((x) => x.id === id);
                        setNewVacay((v) => ({
                          ...v,
                          employeeId: id,
                          employeeName: e ? `${e.firstName} ${e.lastName}` : "",
                          classification: (e?.classification ??
                            v.classification ??
                            "RCA") as Classification,
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <label>Wing / Unit</label>
                    <select
                      value={newVacay.wing ?? WINGS[0]}
                      onChange={(e) =>
                        setNewVacay((v) => ({ ...v, wing: e.target.value }))
                      }
                    >
                      {WINGS.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label
                      className={`toggle-box${!multiDay ? " checked" : ""}`}
                    >
                      <input
                        type="checkbox"
                        className="toggle-input"
                        checked={!multiDay}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setMultiDay(!checked);
                          setNewVacay((v) => ({
                            ...v,
                            endDate: !checked ? "" : v.startDate,
                          }));
                        }}
                      />
                      <span className="toggle-indicator" />
                      {!multiDay ? "1 day" : ">1 day"}
                    </label>
                  </div>
                  {!multiDay && (
                    <div
                      style={{ gridColumn: "1 / -1" }}
                      onClick={() => handleDateFieldClick(vacDateRef)}
                    >
                      <label htmlFor="vac-date">Date</label>
                      <input
                        ref={vacDateRef}
                        id="vac-date"
                        type="date"
                        value={newVacay.startDate ?? ""}
                        onChange={(e) =>
                          setNewVacay((v) => ({
                            ...v,
                            startDate: e.target.value,
                            endDate: e.target.value,
                          }))
                        }
                      />
                    </div>
                  )}
                  {multiDay && (
                    <>
                      <div onClick={() => handleDateFieldClick(vacStartRef)}>
                        <label htmlFor="vac-start">Start Date</label>
                        <input
                          ref={vacStartRef}
                          id="vac-start"
                          type="date"
                          value={newVacay.startDate ?? ""}
                          onChange={(e) =>
                            setNewVacay((v) => ({
                              ...v,
                              startDate: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div onClick={() => handleDateFieldClick(vacEndRef)}>
                        <label htmlFor="vac-end">End Date</label>
                        <input
                          ref={vacEndRef}
                          id="vac-end"
                          type="date"
                          value={newVacay.endDate ?? ""}
                          onChange={(e) =>
                            setNewVacay((v) => ({ ...v, endDate: e.target.value }))
                          }
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label>Shift</label>
                    <select
                      value={newVacay.shiftPreset ?? defaultShift.label}
                      onChange={(e) => {
                        const preset = SHIFT_PRESETS.find(
                          (p) => p.label === e.target.value,
                        );
                        if (preset) {
                          setNewVacay((v) => ({
                            ...v,
                            shiftPreset: preset.label,
                            shiftStart: preset.start,
                            shiftEnd: preset.end,
                          }));
                        } else {
                          setNewVacay((v) => ({ ...v, shiftPreset: "Custom" }));
                        }
                      }}
                    >
                      {SHIFT_PRESETS.map((p) => (
                        <option key={p.label} value={p.label}>
                          {p.label} ({p.start}–{p.end})
                        </option>
                      ))}
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                  {newVacay.shiftPreset === "Custom" && (
                    <>
                      <div>
                        <label>Shift Start</label>
                        <input
                          type="time"
                          value={newVacay.shiftStart ?? ""}
                          onChange={(e) =>
                            setNewVacay((v) => ({
                              ...v,
                              shiftStart: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label>Shift End</label>
                        <input
                          type="time"
                          value={newVacay.shiftEnd ?? ""}
                          onChange={(e) =>
                            setNewVacay((v) => ({
                              ...v,
                              shiftEnd: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </>
                  )}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label>Notes</label>
                    <textarea
                      placeholder="Optional"
                      onChange={(e) =>
                        setNewVacay((v) => ({ ...v, notes: e.target.value }))
                      }
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <button
                      className="btn"
                      onClick={() => addVacationAndGenerate(newVacay)}
                    >
                      Add & Generate
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-h">Open Vacancies</div>
              <div className="card-c">
                <div
                  style={{
                    marginBottom: 8,
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <label
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        filteredVacancies.length > 0 &&
                        selectedVacancyIds.length ===
                          filteredVacancies.length
                      }
                      onChange={(e) => toggleAllVacancies(e.target.checked)}
                    />
                    All
                  </label>
                  <button
                    className="btn btn-sm"
                    onClick={() => setFiltersOpen((o) => !o)}
                  >
                    {filtersOpen ? "Hide Filters ▲" : "Show Filters ▼"}
                  </button>
                  {selectedVacancyIds.length > 0 && (
                    <>
                      <button
                        className="btn btn-sm"
                        onClick={() => setBulkAwardOpen(true)}
                      >
                        Bulk Award
                      </button>
                      <span className="badge">
                        {selectedVacancyIds.length} selected
                      </span>
                    </>
                  )}
                </div>
                {filtersOpen && (
                  <div className="toolbar" style={{ marginBottom: 8 }}>
                    <select
                      value={filterWing}
                      onChange={(e) => setFilterWing(e.target.value)}
                    >
                      <option value="">All Wings</option>
                      {WINGS.map((w) => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filterClass}
                      onChange={(e) =>
                        setFilterClass(e.target.value as Classification | "")
                      }
                    >
                      <option value="">All Classes</option>
                      {["RCA", "LPN", "RN"].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={filterStart}
                      onChange={(e) => setFilterStart(e.target.value)}
                    />
                    <input
                      type="date"
                      value={filterEnd}
                      onChange={(e) => setFilterEnd(e.target.value)}
                    />
                    <button
                      className="btn"
                      onClick={() => {
                        setFilterWing("");
                        setFilterClass("");
                        setFilterStart("");
                        setFilterEnd("");
                      }}
                    >
                      Clear
                    </button>
                  </div>
                )}
                <table className="vac-table responsive-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          aria-label="Select all vacancies"
                          checked={
                            filteredVacancies.length > 0 &&
                            selectedVacancyIds.length ===
                              filteredVacancies.length
                          }
                          onChange={(e) =>
                            toggleAllVacancies(e.target.checked)
                          }
                        />
                      </th>
                      <th>Shift</th>
                      <th>Wing</th>
                      <th>Class</th>
                      <th>Offering</th>
                      <th>Recommended</th>
                      <th>Countdown</th>
                      <th>Assign</th>
                      <th>Override</th>
                      <th>Reason (if overriding)</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVacancies.map((v) => {
                      const rec = recommendations[v.id];
                      const recId = rec?.id;
                      const recName = recId
                        ? `${employeesById[recId]?.firstName ?? ""} ${employeesById[recId]?.lastName ?? ""}`.trim()
                        : "—";
                      const recWhy = rec?.why ?? [];
                      const dl = deadlineFor(v, settings);
                      const msLeft = dl.getTime() - now;
                      const winMin = pickWindowMinutes(v, settings);
                      const sinceKnownMin = minutesBetween(
                        new Date(),
                        new Date(v.knownAt),
                      );
                      const pct = Math.max(
                        0,
                        Math.min(1, (winMin - sinceKnownMin) / winMin),
                      ); // 1→0 over window
                      let cdClass = "cd-green";
                      if (msLeft <= 0) cdClass = "cd-red";
                      else if (pct < 0.25) cdClass = "cd-yellow";
                      const isDueNext = dueNextId === v.id;
                      return (
                        <VacancyRow
                          key={v.id}
                          v={v}
                          recId={recId}
                          recName={recName}
                          recWhy={recWhy}
                          employees={employees}
                          selected={selectedVacancyIds.includes(v.id)}
                          onToggleSelect={() =>
                            setSelectedVacancyIds((ids) =>
                              ids.includes(v.id)
                                ? ids.filter((id) => id !== v.id)
                                : [...ids, v.id],
                            )
                          }
                          countdownLabel={fmtCountdown(msLeft)}
                          countdownClass={cdClass}
                          isDueNext={!!isDueNext}
                          onAward={(payload) => awardVacancy(v.id, payload)}
                          onResetKnownAt={() => resetKnownAt(v.id)}
                        />
                      );
                    })}
                  </tbody>
                </table>
                {filteredVacancies.length === 0 && (
                  <div className="subtitle" style={{ marginTop: 8 }}>
                    No open vacancies 🎉
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "calendar" && (
          <div className="grid">
            <div className="card">
              <div className="card-h">Monthly Schedule (open shifts)</div>
              <div className="card-c">
                <MonthlySchedule vacancies={vacancies} />
              </div>
            </div>
          </div>
        )}

        {tab === "bids" && (
          <BidsPage
            bids={bids}
            setBids={setBids}
            vacancies={vacancies}
            vacations={vacations}
            employees={employees}
            employeesById={employeesById}
          />
        )}

        {tab === "employees" && (
          <EmployeesPage employees={employees} setEmployees={setEmployees} />
        )}

        {tab === "archive" && <ArchivePage vacations={vacations} />}

        {tab === "alerts" && (
          <div className="grid">
            <div className="card">
              <div className="card-h">Quick Stats</div>
              <div className="card-c">
                <div className="pill">
                  Open: {vacancies.filter((v) => v.status !== "Awarded").length}
                </div>
                <div className="pill" style={{ marginLeft: 6 }}>
                  Archived vacations:{" "}
                  {vacations.filter((v) => v.archived).length}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <SettingsPage settings={settings} setSettings={setSettings} />
        )}
        <BulkAwardDialog
          open={bulkAwardOpen}
          employees={employees}
          vacancies={vacancies.filter((v) => selectedVacancyIds.includes(v.id))}
          onClose={() => setBulkAwardOpen(false)}
          onConfirm={(payload) => {
            setVacancies((prev) =>
              applyAwardVacancies(prev, selectedVacancyIds, payload),
            );
            archiveBids(selectedVacancyIds);
            setSelectedVacancyIds([]);
            setBulkAwardOpen(false);
          }}
        />
      </div>
    </div>
  );
}

// ---------- Pages ----------
function EmployeesPage({
  employees,
  setEmployees,
}: {
  employees: Employee[];
  setEmployees: (u: any) => void;
}) {
  return (
    <div className="grid">
      <div className="card">
        <div className="card-h">Import Staff (CSV)</div>
        <div className="card-c">
          <input
            type="file"
            accept=".csv"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const text = await f.text();
              const { parseCSV } = await import("./utils/csv");
              let rows: Record<string, string>[] = [];
              try {
                rows = parseCSV(text);
              } catch (err) {
                console.error(err);
                alert("Failed to parse CSV");
                return;
              }
              const out: Employee[] = rows.map((r: any, i: number) => ({
                id: String(r.id ?? r.EmployeeID ?? `emp_${i}`),
                firstName: String(r.firstName ?? r.name ?? ""),
                lastName: String(r.lastName ?? ""),
                classification: (["RCA", "LPN", "RN"].includes(
                  String(r.classification),
                )
                  ? r.classification
                  : "RCA") as Classification,
                status: (["FT", "PT", "Casual"].includes(String(r.status))
                  ? r.status
                  : "FT") as Status,
                homeWing: String(r.homeWing ?? ""),
                startDate: String(r.startDate ?? ""),
                seniorityHours: Number(r.seniorityHours ?? 0),
                seniorityRank: Number(r.seniorityRank ?? i + 1),
                active: String(r.active ?? "Yes")
                  .toLowerCase()
                  .startsWith("y"),
              }));
              setEmployees(out.filter((e) => !!e.id));
            }}
          />
          <div className="subtitle">
            Columns: id, firstName, lastName, classification (RCA/LPN/RN),
            status (FT/PT/Casual), homeWing, startDate, seniorityHours,
            seniorityRank, active (Yes/No)
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">Add Employee</div>
        <div className="card-c">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const name = (form.elements.namedItem("name") as HTMLInputElement)
                .value;
              const start = (
                form.elements.namedItem("start") as HTMLInputElement
              ).value;
              const hours = Number(
                (form.elements.namedItem("hours") as HTMLInputElement).value,
              );
              if (!name) return;
              const [first, ...rest] = name.trim().split(" ");
              const newEmp: Employee = {
                id: `emp_${Date.now()}`,
                firstName: first ?? "",
                lastName: rest.join(" "),
                classification: "RCA",
                status: "FT",
                startDate: start,
                seniorityHours: hours || 0,
                seniorityRank: employees.length + 1,
                active: true,
              };
              const sorted = [...employees, newEmp]
                .sort((a, b) => {
                  const hDiff =
                    (b.seniorityHours ?? 0) - (a.seniorityHours ?? 0);
                  if (hDiff !== 0) return hDiff;
                  return (a.seniorityRank ?? 99999) - (b.seniorityRank ?? 99999);
                })
                .map((e, i) => ({ ...e, seniorityRank: i + 1 }));
              setEmployees(sorted);
              form.reset();
            }}
          >
            <div className="row cols3">
              <div>
                <label>Name</label>
                <input name="name" type="text" />
              </div>
              <div>
                <label>Start Date</label>
                <input name="start" type="date" />
              </div>
              <div>
                <label>Seniority Hours</label>
                <input name="hours" type="number" />
              </div>
            </div>
            <button type="submit" style={{ marginTop: 8 }}>
              Add
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-h">Employees</div>
        <div className="card-c">
          <table className="responsive-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Start Date</th>
                <th>Seniority Hrs</th>
                <th>Class</th>
                <th>Status</th>
                <th>Rank</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id}>
                  <td>{e.id}</td>
                  <td>
                    {e.firstName} {e.lastName}
                  </td>
                  <td>{e.startDate}</td>
                  <td>{e.seniorityHours ?? 0}</td>
                  <td>{e.classification}</td>
                  <td>{e.status}</td>
                  <td>{e.seniorityRank}</td>
                  <td>{e.active ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ArchivePage({ vacations }: { vacations: Vacation[] }) {
  const archived = vacations.filter((v) => v.archived);
  return (
    <div className="grid">
      <div className="card">
        <div className="card-h">Archived Vacations (fully covered)</div>
        <div className="card-c">
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Wing</th>
                <th>From</th>
                <th>To</th>
                <th>Archived</th>
              </tr>
            </thead>
            <tbody>
              {archived.map((v) => (
                <tr key={v.id}>
                  <td>{v.employeeName}</td>
                  <td>{v.wing}</td>
                  <td>{formatDateLong(v.startDate)}</td>
                  <td>{formatDateLong(v.endDate)}</td>
                  <td>{new Date(v.archivedAt || "").toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!archived.length && (
            <div className="subtitle" style={{ marginTop: 8 }}>
              Nothing here yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsPage({
  settings,
  setSettings,
}: {
  settings: Settings;
  setSettings: (u: any) => void;
}) {
  return (
    <div className="grid">
      <div className="card">
        <div className="card-h">Appearance & Defaults</div>
        <div className="card-c">
          <div className="row cols2">
            <div>
              <label>Theme</label>
              <select
                value={settings.theme}
                onChange={(e) =>
                  setSettings((s: any) => ({
                    ...s,
                    theme: e.target.value as "dark" | "light",
                  }))
                }
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div>
              <label>Default Shift Template</label>
              <select
                value={settings.defaultShiftPreset}
                onChange={(e) =>
                  setSettings((s: any) => ({
                    ...s,
                    defaultShiftPreset: e.target.value,
                  }))
                }
              >
                {SHIFT_PRESETS.map((p) => (
                  <option key={p.label} value={p.label}>
                    {p.label} ({p.start}–{p.end})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">Dashboard Order</div>
        <div className="card-c">
          <TabOrderEditor
            order={settings.tabOrder}
            setOrder={(o) =>
              setSettings((s: any) => ({ ...s, tabOrder: o }))
            }
          />
          <div className="subtitle" style={{ marginTop: 8 }}>
            Drag items to reorder tabs.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">Response Windows (minutes)</div>
        <div className="card-c">
          <div className="row cols2">
            {(
              [
                ["<2h", "lt2h"],
                ["2–4h", "h2to4"],
                ["4–24h", "h4to24"],
                ["24–72h", "h24to72"],
                [">72h", "gt72"],
              ] as const
            ).map(([label, key]) => (
              <div key={key}>
                <label>{label}</label>
                <input
                  type="number"
                  value={(settings.responseWindows as any)[key]}
                  onChange={(e) =>
                    setSettings((s: any) => ({
                      ...s,
                      responseWindows: {
                        ...s.responseWindows,
                        [key]: Number(e.target.value),
                      },
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabOrderEditor({
  order,
  setOrder,
}: {
  order: string[];
  setOrder: (o: string[]) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {order.map((item, idx) => (
        <li
          key={item}
          draggable
          onDragStart={() => setDragIndex(idx)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragIndex === null) return;
            setOrder(reorder(order, dragIndex, idx));
            setDragIndex(null);
          }}
          style={{
            padding: "8px 10px",
            border: "1px solid var(--stroke)",
            borderRadius: "8px",
            background: "var(--cardAlt)",
            marginBottom: 6,
            cursor: "move",
          }}
        >
          {item[0].toUpperCase() + item.slice(1)}
        </li>
      ))}
    </ul>
  );
}

export function BidsPage({
  bids,
  setBids,
  vacancies,
  vacations,
  employees,
  employeesById,
}: {
  bids: Bid[];
  setBids: (u: any) => void;
  vacancies: Vacancy[];
  vacations: Vacation[];
  employees: Employee[];
  employeesById: Record<string, Employee>;
}) {
  const [newBid, setNewBid] = useState<
    Partial<Bid & { bidDate: string; bidTime: string }>
  >({});
  const bidDateRef = useRef<HTMLInputElement>(null);

  const vacWithCoveredName = (v: Vacancy) => {
    const vac = vacations.find((x) => x.id === v.vacationId);
    const covered = vac ? vac.employeeName : "";
    return `${displayVacancyLabel(v)} — covering ${covered}`.trim();
  };

  const openVacancies = vacancies.filter((v) => v.status !== "Awarded");

  const removeBid = (index: number) => {
    setBids((prev: Bid[]) => prev.filter((_, idx) => idx !== index));
  };

  const setNow = () => {
    const now = new Date();
    const d = isoDate(now);
    const t = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setNewBid((b) => ({ ...b, bidDate: d, bidTime: t }));
  };

  return (
    <div className="grid">
      <div className="card">
        <div className="card-h">Add Bid</div>
        <div className="card-c">
          <div className="row cols2">
            <div>
              <label>Vacancy</label>
              <select
                onChange={(e) =>
                  setNewBid((b) => ({ ...b, vacancyId: e.target.value }))
                }
                value={newBid.vacancyId ?? ""}
              >
                <option value="" disabled>
                  Pick vacancy
                </option>
                {openVacancies.length ? (
                  openVacancies.map((v) => (
                    <option key={v.id} value={v.id}>
                      {vacWithCoveredName(v)}
                    </option>
                  ))
                ) : (
                  <option disabled>No open vacancies</option>
                )}
              </select>
            </div>
            <div>
              <label>Employee</label>
              <EmployeeCombo
                employees={employees}
                onSelect={(id) => {
                  const e = employeesById[id];
                  setNewBid((b) => ({
                    ...b,
                    bidderEmployeeId: id,
                    bidderName: e ? `${e.firstName} ${e.lastName}` : "",
                    bidderStatus: e?.status,
                    bidderClassification: e?.classification,
                  }));
                }}
              />
            </div>
            {/* clicking wrapper triggers picker; use same pattern for future date fields */}
            <div onClick={() => bidDateRef.current?.showPicker()}>
              <label>Bid Date</label>
              <input
                type="date"
                ref={bidDateRef}
                value={newBid.bidDate ?? ""}
                onChange={(e) =>
                  setNewBid((b) => ({ ...b, bidDate: e.target.value }))
                }
              />
            </div>
            <div>
              <label>Bid Time</label>
              <div className="form-row">
                <input
                  type="time"
                  value={newBid.bidTime ?? ""}
                  onChange={(e) =>
                    setNewBid((b) => ({ ...b, bidTime: e.target.value }))
                  }
                />
                <button className="btn" onClick={setNow}>
                  Now
                </button>
              </div>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label>Notes</label>
              <input
                placeholder={'e.g., "available for 06:30-14:30"'}
                onChange={(e) =>
                  setNewBid((b) => ({ ...b, notes: e.target.value }))
                }
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <button
                className="btn"
                onClick={() => {
                  if (!newBid.vacancyId || !newBid.bidderEmployeeId)
                    return alert("Vacancy and employee required");
                  const ts =
                    newBid.bidDate && newBid.bidTime
                      ? new Date(
                          `${newBid.bidDate}T${newBid.bidTime}:00`,
                        ).toISOString()
                      : new Date().toISOString();
                  setBids((prev: Bid[]) => [
                    ...prev,
                    {
                      vacancyId: newBid.vacancyId!,
                      bidderEmployeeId: newBid.bidderEmployeeId!,
                      bidderName: newBid.bidderName ?? "",
                      bidderStatus: (newBid.bidderStatus ?? "Casual") as Status,
                      bidderClassification: (newBid.bidderClassification ??
                        "RCA") as Classification,
                      bidTimestamp: ts,
                      notes: newBid.notes ?? "",
                    },
                  ]);
                  setNewBid({});
                }}
              >
                Add Bid
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">Bids</div>
        <div className="card-c">
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Vacancy</th>
                <th>Employee</th>
                <th>Class</th>
                <th>Status</th>
                <th>Bid at</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bids.map((b, i) => {
                const v = vacancies.find((x) => x.id === b.vacancyId);
                return (
                  <tr key={i}>
                    <td>{v ? displayVacancyLabel(v) : b.vacancyId}</td>
                    <td>{b.bidderName}</td>
                    <td>{b.bidderClassification}</td>
                    <td>{b.bidderStatus}</td>
                    <td>{new Date(b.bidTimestamp).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn"
                        style={{ background: "var(--bad)", color: "#fff" }}
                        onClick={() => removeBid(i)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CoverageDayList({
  dateISO,
  vacancies,
}: {
  dateISO: string;
  vacancies: Vacancy[];
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <div className="pill">
        Vacancies on {formatDateLong(dateISO)}: {vacancies.length}
      </div>
      {vacancies.length > 0 && (
        <table className="responsive-table" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Shift</th>
              <th>Wing</th>
              <th>Class</th>
              <th>Offering</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {vacancies.map((v) => (
              <tr key={v.id}>
                <td>
                  {v.shiftStart}-{v.shiftEnd}
                </td>
                <td>{v.wing ?? ""}</td>
                <td>{v.classification}</td>
                <td>{v.offeringStep}</td>
                <td>{v.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function MonthlySchedule({ vacancies }: { vacancies: Vacancy[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11
  const [selectedISO, setSelectedISO] = useState<string>(isoDate(today));
  const todayISO = isoDate(today);

  const calDays = useMemo(() => buildCalendar(year, month), [year, month]);
  const vacanciesByDay = useMemo(() => {
    const m = new Map<string, Vacancy[]>();
    vacancies.forEach((v) => {
      if (v.status !== "Awarded" || v.shiftDate >= todayISO) {
        const k = v.shiftDate;
        const arr = m.get(k) || [];
        arr.push(v);
        m.set(k, arr);
      }
    });
    return m;
  }, [vacancies, todayISO]);

  const monthLabel = new Date(year, month, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          className="btn"
          onClick={() => prevMonth(setYear, setMonth, year, month)}
        >
          &lt;
        </button>
        <div className="pill">{monthLabel}</div>
        <button
          className="btn"
          onClick={() => nextMonth(setYear, setMonth, year, month)}
        >
          &gt;
        </button>
        <div style={{ marginLeft: "auto" }} className="subtitle">
          Click a day to list shifts
        </div>
      </div>
      <div className="cal-grid">
        {dow.map((d) => (
          <div key={d} className="cal-dow">
            {d}
          </div>
        ))}
        {calDays.map(({ date, inMonth }) => {
          const key = isoDate(date);
          const dayVacancies = vacanciesByDay.get(key) || [];
          const isToday = key === todayISO;
          const isSelected = key === selectedISO;
          return (
            <div
              key={key}
              className={`cal-day ${inMonth ? "" : "mute"} ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
              onClick={() => setSelectedISO(key)}
            >
              <div className="cal-num">{date.getDate()}</div>
              <div className="cal-open">
                {dayVacancies.length ? (
                  <>
                    {dayVacancies.slice(0, 3).map((v) => (
                      <span
                        key={v.id}
                        className="cal-chip"
                        data-wing={v.wing || undefined}
                        data-class={v.classification}
                      >
                        {v.wing ? `${v.wing} ` : ""}
                        {v.classification}
                      </span>
                    ))}
                    {dayVacancies.length > 3 && (
                      <span className="cal-chip">+{dayVacancies.length - 3} more</span>
                    )}
                  </>
                ) : (
                  <span className="subtitle">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <CoverageDayList
        dateISO={selectedISO}
        vacancies={vacanciesByDay.get(selectedISO) || []}
      />
    </div>
  );
}

// ---------- Small components ----------
function VacancyRow({
  v,
  recId,
  recName,
  recWhy,
  employees,
  selected,
  onToggleSelect,
  countdownLabel,
  countdownClass,
  isDueNext,
  onAward,
  onResetKnownAt,
}: {
  v: Vacancy;
  recId?: string;
  recName: string;
  recWhy: string[];
  employees: Employee[];
  selected: boolean;
  onToggleSelect: () => void;
  countdownLabel: string;
  countdownClass: string;
  isDueNext: boolean;
  onAward: (payload: {
    empId?: string;
    reason?: string;
    overrideUsed?: boolean;
  }) => void;
  onResetKnownAt: () => void;
}) {
  const [choice, setChoice] = useState<string>("");
  const [overrideClass, setOverrideClass] = useState<boolean>(false);
  const [reason, setReason] = useState<string>("");

  const chosen = employees.find((e) => e.id === choice);
  const classMismatch = chosen && chosen.classification !== v.classification;
  const needReason =
    (!!recId && choice && choice !== recId) || (classMismatch && overrideClass);

  function handleAward() {
    if (classMismatch && !overrideClass) {
      alert(
        `Selected employee is ${chosen?.classification}; vacancy requires ${v.classification}. Check "Allow class override" to proceed.`,
      );
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

  return (
    <tr
      className={`${isDueNext ? "due-next " : ""}${selected ? "selected" : ""}`.trim()}
      aria-selected={selected}
      tabIndex={0}
    >
      <td>
        <input type="checkbox" checked={selected} onChange={onToggleSelect} />
      </td>
      <td>
        <span className="pill">{formatDowShort(v.shiftDate)}</span>{" "}
        {formatDateLong(v.shiftDate)} • {v.shiftStart}-{v.shiftEnd}
      </td>
      <td>{v.wing ?? ""}</td>
      <td>{v.classification}</td>
      <td>{v.offeringStep}</td>
      <td>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 4,
          }}
        >
          <span>{recName}</span>
          {recWhy.map((w, i) => (
            <span key={i} className="pill">
              {w}
            </span>
          ))}
        </div>
      </td>
      <td>
        <span className={`cd-chip ${countdownClass}`}>{countdownLabel}</span>
      </td>
      <td style={{ minWidth: 220 }}>
        <SelectEmployee
          allowEmpty
          employees={employees}
          value={choice}
          onChange={setChoice}
        />
      </td>
      <td style={{ whiteSpace: "nowrap" }}>
        <input
          id="override-toggle"
          className="toggle-input"
          type="checkbox"
          checked={overrideClass}
          onChange={(e) => setOverrideClass(e.target.checked)}
        />
        <label htmlFor="override-toggle" className="toggle-box">
          <span className="subtitle">Allow class override</span>
        </label>
      </td>
      <td style={{ minWidth: 230 }}>
        {needReason ||
        overrideClass ||
        (recId && choice && choice !== recId) ? (
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Select reason…</option>
            {OVERRIDE_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          <span className="subtitle">—</span>
        )}
      </td>
      <td style={{ display: "flex", gap: 6 }}>
        <button className="btn" onClick={onResetKnownAt}>
          Reset knownAt
        </button>
        <button className="btn" onClick={handleAward} disabled={!choice}>
          Award
        </button>
      </td>
    </tr>
  );
}

function SelectEmployee({
  employees,
  value,
  onChange,
  allowEmpty = false,
}: {
  employees: Employee[];
  value: string;
  onChange: (v: string) => void;
  allowEmpty?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [dropUp, setDropUp] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const list = useMemo(
    () =>
      employees
        .filter((e) => matchText(q, `${e.firstName} ${e.lastName} ${e.id}`))
        .slice(0, 50),
    [q, employees],
  );
  const curr = employees.find((e) => e.id === value);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  useEffect(() => {
    if (!value) setQ("");
  }, [value]);
  useEffect(() => {
    if (open && menuRef.current) {
      const r = menuRef.current.getBoundingClientRect();
      setDropUp(r.bottom > window.innerHeight);
      setRect(r);
    }
  }, [open]);
  return (
    <div className="dropdown" ref={ref}>
      <input
        placeholder={
          curr
            ? `${curr.firstName} ${curr.lastName} (${curr.id})`
            : "Type name or ID…"
        }
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div
          className="menu"
          ref={menuRef}
          style={{
            top: dropUp ? "auto" : "100%",
            bottom: dropUp ? "100%" : "auto",
            maxHeight: rect
              ? Math.min(
                  320,
                  dropUp ? rect.top - 20 : window.innerHeight - rect.top - 20,
                )
              : 320,
            overflow: "auto",
          }}
        >
          {allowEmpty && (
            <div
              className="item"
              onClick={() => {
                onChange("EMPTY");
                setQ("");
                setOpen(false);
              }}
            >
              Empty
            </div>
          )}
          {list.map((e) => (
            <div
              key={e.id}
              className="item"
              onClick={() => {
                onChange(e.id);
                setQ(`${e.firstName} ${e.lastName} (${e.id})`);
                setOpen(false);
              }}
            >
              {e.firstName} {e.lastName}{" "}
              <span className="pill" style={{ marginLeft: 6 }}>
                {e.classification} {e.status}
              </span>
            </div>
          ))}
          {!list.length && (
            <div className="item" style={{ opacity: 0.7 }}>
              No matches
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmployeeCombo({
  employees,
  onSelect,
}: {
  employees: Employee[];
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const list = useMemo(
    () =>
      employees
        .filter((e) => matchText(q, `${e.firstName} ${e.lastName} ${e.id}`))
        .slice(0, 50),
    [q, employees],
  );
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div className="dropdown" ref={ref}>
      <input
        placeholder="Type name or ID…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div className="menu">
          {list.map((e) => (
            <div
              key={e.id}
              className="item"
              onClick={() => {
                onSelect(e.id);
                setQ(`${e.firstName} ${e.lastName} (${e.id})`);
                setOpen(false);
              }}
            >
              {e.firstName} {e.lastName}{" "}
              <span className="pill" style={{ marginLeft: 6 }}>
                {e.classification} {e.status}
              </span>
            </div>
          ))}
          {!list.length && (
            <div className="item" style={{ opacity: 0.7 }}>
              No matches
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Helpers ----------
function dateRangeInclusive(startISO: string, endISO: string) {
  const out: string[] = [];
  const s = new Date(startISO + "T00:00:00");
  const e = new Date(endISO + "T00:00:00");
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1))
    out.push(isoDate(d));
  return out;
}
