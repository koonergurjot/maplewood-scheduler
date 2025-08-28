const
                  <div style={{ marginTop: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input type="checkbox" checked={groupByBundle} onChange={(e) => setGroupByBundle(e.target.checked)} />
                      Group by Bundle
                    </label>
                  </div>
 vacWithCoveredName = (v: Vacancy) => {
    const vac = vacations.find((x) => x.id === v.vacationId);
    const covered = vac ? vac.employeeName : "";
    const bundleCount = v.bundleId ? vacancies.filter(x => x.bundleId === v.bundleId).length : 0;
    const bundleTag = v.bundleId ? ` [Bundle of ${bundleCount} days]` : "";
    return `${displayVacancyLabel(v)}${bundleTag} — covering ${covered}`.trim();
  };
onClick={() => {
                  if (!newBid.vacancyId || !newBid.bidderEmployeeId)
                    return alert("Vacancy and employee required");
                  const ts =
                    newBid.bidDate && newBid.bidTime
                      ? new Date(
                          `${newBid.bidDate}T${newBid.bidTime}:00`,
                        ).toISOString()
                      : new Date().toISOString();

                  const targetVacancyIds = (() => {
                    if (applyToBundle && selectedBundleId) {
                      return vacancies
                        .filter(v => v.bundleId === selectedBundleId && v.status !== "Filled" && v.status !== "Awarded")
                        .map(v => v.id);
                    }
                    return [newBid.vacancyId!];
                  })();

                  setBids((prev: Bid[]) => {
                    const next = [...prev];
                    for (const vid of targetVacancyIds) {
                      next.push({
                        vacancyId: vid,
                        bidderEmployeeId: newBid.bidderEmployeeId!,
                        bidderName: newBid.bidderName ?? "",
                        bidderStatus: (newBid.bidderStatus ?? "Casual") as Status,
                        bidderClassification: (newBid.bidderClassification ?? "RCA") as Classification,
                        bidTimestamp: ts,
                        notes: newBid.notes ?? "",
                      });
                    }
                    return next;
                  });
                  setNewBid({});
                }}
import {
            {selectedBundleId && (
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }} title="Apply this bid to every day in the bundle.">
                <input
                  type="checkbox"
                  checked={applyToBundle}
                  onChange={(e) => setApplyToBundle(e.target.checked)}
                />
                Apply to entire bundle ({vacancies.filter(v => v.bundleId === selectedBundleId && v.status !== "Filled" && v.status !== "Awarded").length} days open)
              </label>
            )}
 Fragment, useEffect, useMemo, useRef, useState } from "react";
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
 * ✔ Auto "knownAt" (already existed) + per-row “Reset knownAt” button for re-announcing
 * ✔ Sticky table header for Open Vacancies + scrollable panel; highlight the row that’s “due next”
 * ✔ Theme toggle (Dark/Light) + text size slider (great for wall displays)
 * ✔ Reason codes required when you override the recommendation (audit‑friendly trail)
 * ✔ Eligibility gate: block awards outside vacancy class (RCA/LPN/RN) unless “Allow class override” is checked
 * ✔ Open Vacancies layout reformatted to take most of the page and avoid cut‑off
 */


  // AUTO FILL: Promote Awarded -> Filled when shift start has passed or on manual confirm
  useEffect(() => {
    const now = new Date();
    setVacancies((prev) =>
      prev.map((v) => {
        if (v.status === "Awarded") {
          const start = combineDateTime(v.shiftDate, v.shiftStart);
          if (start.getTime() <= now.getTime()) {
            return { ...v, status: "Filled" };
          }
        }
        return v;
      }),
    );
  }, []);
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
  wing: string; // wing where the employee's shift is being covered
  startDate: string; // ISO YYYY-MM-DD
  endDate: string; // ISO YYYY-MM-DD
  notes?: string;
  archived?: boolean;
  archivedAt?: string; // ISO
};

export type Vacancy = {
  id: string;
  vacationId?: string;
  bundleId?: string; // if set, groups same-date-range days into one bundle
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
  offeringStep: "CASUALS" | "OT_FULL_TIME" | "OT_CASUALS";
  status: "Open" | "Pending Award" | "Awarded" | "Filled";
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
          status: "Filled",
          awardedTo: empId,
          awardedAt: new Date().toISOString(),
          awardReason: payload.reason,
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
  const [filterShift, setFilterShift] = useState<string>("");
  const [filterCountdown, setFilterCountdown] = useState<string>("");
  const [filterStart, setFilterStart] = useState<string>("");
  const [filterEnd, setFilterEnd] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [groupByBundle, setGroupByBundle] = useState(false);

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
        const allFilled =
          list.length > 0 &&
          list.every((x) => x.status === "Filled" || x.status === "Awarded");
        if (allFilled && !vac.archived)
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
  const [bundleAsOne, setBundleAsOne] = useState(false);

  // Actions
  const addVacationAndGenerate = (
    v: Partial<
      Vacation & { shiftStart: string; shiftEnd: string; shiftPreset: string }
    >,
  ) => {
    
    if (!multiDay) {
      v.endDate = v.startDate;
    }
    if (v.startDate && v.endDate && v.endDate < v.startDate) {
      alert("End date cannot be before start date.");
      return;
    }
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
    const bundleId = bundleAsOne ? (crypto?.randomUUID ? crypto.randomUUID() : `BUNDLE-${Math.random().toString(36).slice(2,7).toUpperCase()}`) : undefined;
    const vxs: Vacancy[] = days.map((d) => ({
      id: (crypto?.randomUUID ? crypto.randomUUID() : `VAC-${Math.random().toString(36).slice(2,7).toUpperCase()}`),
      vacationId: vac.id,
      bundleId,
      reason: "Vacation Backfill",
      classification: vac.classification,
      wing: vac.wing,
      shiftDate: d,
      shiftStart: v.shiftStart ?? defaultShift.start,
      shiftEnd: v.shiftEnd ?? defaultShift.end,
      knownAt: nowISO,
      offeringTier: "CASUALS",
      offeringRoundStartedAt: nowISO,
      offeringRoundMinutes: 120,      offeringRoundMinutes: 120,
      offeringAutoProgress: true,
      offeringStep: "CASUALS",
      status: "Open",
    })
  const [applyToBundle, setApplyToBundle] = useState(false);
  const selectedVacancy = vacancies.find((x) => x.id === (newBid.vacancyId || ""));
  const selectedBundleId = selectedVacancy?.bundleId;

                          onMarkFilled={(id) => setVacancies(prev => prev.map(v => v.id===id ? { ...v, status: "Filled" } : v))}
                        )