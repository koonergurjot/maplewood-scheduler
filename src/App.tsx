
onConfirm={(payload) => {
            const snapshot = { vacancies: [...vacancies], bids: [...bids] };
            setVacancies((prev) =>
              applyAwardVacancies(prev, selectedVacancyIds, payload),
            );
            archiveBids(selectedVacancyIds);
            setSelectedVacancyIds([]);
            setBulkAwardOpen(false);
            setToast({
              message: "Bulk award applied",
              undo: () => {
                setVacancies(snapshot.vacancies);
                setBids(snapshot.bids);
              }
            });
            setTimeout(() => setToast(null), 10000);
          }}const
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
  combineDateTimeTZ,
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
          const start = combineDateTimeTZ(v.shiftDate, v.shiftStart);
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
  const [expandedBundles, setExpandedBundles] = useState<Record<string, boolean>>({});
  const [bulkAwardOpen, setBulkAwardOpen] = useState(false)
  const [toast, setToast] = useState<{message: string; undo?: () => void} | null>(null);
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
  const [virtScroll, setVirtScroll] = useState(0);
  const rowHeight = 56;

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
                        
                          onArchive={(id) => {
                            if (!confirm('Archive this vacancy?')) return;
                            // For now, archive is a no-op on status; you can add a dedicated archived flag later.
                            setVacancies(prev => prev.map(v => v.id === id ? { ...v, status: v.status } : v));
                          }}
                          onDelete={(id) => {
                            if (!confirm('Delete this vacancy? This also removes its bids.')) return;
                            setVacancies(prev => prev.filter(v => v.id !== id));
                            setBids(prev => prev.filter(b => b.vacancyId !== id));
                          }}
                        
<tbody>
  {!groupByBundle && filteredVacancies.map((v) => {
    const rec = recs[v.id] || {};
    const isSel = selectedVacancyIds.includes(v.id);
    return (
      <VacancyRow
        key={v.id}
        v={v}
        recId={rec.id}
        recName={employeesById[rec.id || ""] ? employeesById[rec.id || ""].firstName + " " + employeesById[rec.id || ""].lastName : ""}
        recWhy={rec.why || []}
        employees={employees}
        selected={isSel}
        onToggleSelect={(checked) => toggleVacancy(v.id, checked)}
        countdownLabel={countdownLabels[v.id]}
        countdownClass={countdownClasses[v.id]}
        isDueNext={dueNextId === v.id}
        onAward={(id, payload) => {
          if (payload.empId) {
            const target = vacancies.find(x => x.id === id);
            const overlap = vacancies.some(x =>
              x.id !== id && x.awardedTo === payload.empId && x.status !== "Filled" && x.shiftDate === target?.shiftDate &&
              !(x.shiftEnd <= target.shiftStart || x.shiftStart >= target.shiftEnd)
            );
            if (overlap && !confirm("This employee may already be awarded overlapping times. Continue?")) return;
          }
          setVacancies((prev) => applyAwardVacancy(prev, id, payload));
        }}
        onResetKnownAt={() => resetKnownAt(v.id)}
        onMarkFilled={(id) => setVacancies(prev => prev.map(x => x.id===id ? { ...x, status: "Filled" } : x))}
        onArchive={(id) => {
          if (!confirm('Archive this vacancy?')) return;
          setVacancies(prev => prev.map(x => x.id === id ? { ...x, status: x.status } : x));
        }}
        onDelete={(id) => {
          if (!confirm('Delete this vacancy? This also removes its bids.')) return;
          setVacancies(prev => prev.filter(x => x.id !== id));
          setBids(prev => prev.filter(b => b.vacancyId !== id));
        }}
      />
    );
  })}
  {groupByBundle && Object.entries(bundleGroups).map(([bundleId, ids]) => {
    const rows = ids.map(id => allVacanciesById[id]).filter(Boolean);
    const openRows = rows.filter(r => r.status !== "Awarded" && r.status !== "Filled");
    const isOpen = expandedBundles[bundleId];
    const first = rows[0];
    return (
      <Fragment key={bundleId}>
        <tr className="bundle-row">
          <td>
            <input type="checkbox"
              checked={ids.every(id => selectedVacancyIds.includes(id)) && ids.length > 0}
              onChange={(e) => {
                const checked = e.target.checked;
                ids.forEach(id => toggleVacancy(id, checked));
              }}
            />
          </td>
          <td colSpan={3}>
            <strong>Bundle</strong> {bundleId} — {rows.length} days
            <div style={{ fontSize: 12, opacity: 0.8 }}>{first?.wing} • {first?.classification}
      {toast && (
        <div style={{position: "fixed", right: 16, bottom: 16, background: "#222", color: "white", padding: "10px 14px", borderRadius: 8, boxShadow: "0 4px 10px rgba(0,0,0,0.3)"}}>
          <span>{toast.message}</span>
          {toast.undo && <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => { toast.undo?.(); setToast(null); }}>Undo</button>}
          <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => setToast(null)}>Dismiss</button>
        </div>
      )}
    </div>
          </td>
          <td colSpan={3}>
            <button className="btn btn-sm" onClick={() => setExpandedBundles(prev => ({ ...prev, [bundleId]: !prev[bundleId] }))}>
              {isOpen ? "Collapse" : "Expand"}
            </button>
            <button className="btn btn-sm" style={{ marginLeft: 6 }}
              onClick={() => {
                setSelectedVacancyIds(ids);
                setBulkAwardOpen(true);
              }}
            >
              Bulk Award Bundle
            </button>
          </td>
        </tr>
        {isOpen && rows.map((v) => {
          const rec = recs[v.id] || {};
          const isSel = selectedVacancyIds.includes(v.id);
          return (
            <VacancyRow
              key={v.id}
              v={v}
              recId={rec.id}
              recName={employeesById[rec.id || ""] ? employeesById[rec.id || ""].firstName + " " + employeesById[rec.id || ""].lastName : ""}
              recWhy={rec.why || []}
              employees={employees}
              selected={isSel}
              onToggleSelect={(checked) => toggleVacancy(v.id, checked)}
              countdownLabel={countdownLabels[v.id]}
              countdownClass={countdownClasses[v.id]}
              isDueNext={dueNextId === v.id}
              onAward={(id, payload) => {
                if (payload.empId) {
                  const target = vacancies.find(x => x.id === id);
                  const overlap = vacancies.some(x =>
                    x.id !== id && x.awardedTo === payload.empId && x.status !== "Filled" && x.shiftDate === target?.shiftDate &&
                    !(x.shiftEnd <= target.shiftStart || x.shiftStart >= target.shiftEnd)
                  );
                  if (overlap && !confirm("This employee may already be awarded overlapping times. Continue?")) return;
                }
                setVacancies((prev) => applyAwardVacancy(prev, id, payload));
              }}
              onResetKnownAt={() => resetKnownAt(v.id)}
              onMarkFilled={(id) => setVacancies(prev => prev.map(x => x.id===id ? { ...x, status: "Filled" } : x))}
              onArchive={(id) => {
                if (!confirm('Archive this vacancy?')) return;
                setVacancies(prev => prev.map(x => x.id === id ? { ...x, status: x.status } : x));
              }}
              onDelete={(id) => {
                if (!confirm('Delete this vacancy? This also removes its bids.')) return;
                setVacancies(prev => prev.filter(x => x.id !== id));
                setBids(prev => prev.filter(b => b.vacancyId !== id));
              }}
            />
          );
        })}
      </Fragment>
    );
  })}
</tbody>

  const allVacanciesById = Object.fromEntries(vacancies.map(v => [v.id, v]));
  const bundleGroups = vacancies.reduce<Record<string, string[]>>((acc, v) => {
    if (v.bundleId) {
      if (!acc[v.bundleId]) acc[v.bundleId] = [];
      acc[v.bundleId].push(v.id);
    }
    return acc;
  }, {});
const virtualizationEnabled = !groupByBundle && filteredVacancies.length > 300;
  const startIndex = virtualizationEnabled ? Math.floor(virtScroll / rowHeight) : 0;
  const viewportRows = virtualizationEnabled ? Math.ceil(520 / rowHeight) + 10 : filteredVacancies.length;
  const endIndex = virtualizationEnabled ? Math.min(filteredVacancies.length, startIndex + viewportRows) : filteredVacancies.length;
  const visibleVacancies = virtualizationEnabled ? filteredVacancies.slice(startIndex, endIndex) : filteredVacancies;

onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const text = await f.text();
              const lines = text.split(/\r?\n/).filter(Boolean);
              if (!lines.length) return alert("Empty CSV");
              const headers = lines[0].split(",").map((h) => h.trim());
              const required = ["firstName","lastName","classification","status"];
              const missing = required.filter((r) => !headers.some(h => h.toLowerCase() === r.toLowerCase()));
              const rows: any[] = [];
              const errors: string[] = [];
              for (let i = 1; i < lines.length; i++) {
                const vals = lines[i].split(",");
                const obj: any = {};
                headers.forEach((h, idx) => (obj[h] = (vals[idx] ?? "").trim()));
                // validations
                if (!obj.firstName || !obj.lastName) errors.push(`Row ${i+1}: missing name`);
                if (!["RCA","LPN","RN"].includes((obj.classification || "").toUpperCase())) errors.push(`Row ${i+1}: invalid classification`);
                if (!["FT","PT","Casual"].includes(obj.status)) errors.push(`Row ${i+1}: invalid status`);
                rows.push(obj);
              }
              if (missing.length) errors.unshift("Missing headers: " + missing.join(", "));
              setDryRun({ headers, rows, errors });
            }}onConfirm={(payload) => {
            const snapshot = { vacancies: [...vacancies], bids: [...bids] };
            setVacancies((prev) =>
              applyAwardVacancies(prev, selectedVacancyIds, payload),
            );
            archiveBids(selectedVacancyIds);
            setSelectedVacancyIds([]);
            setBulkAwardOpen(false);
            setToast({
              message: "Bulk award applied",
              undo: () => {
                setVacancies(snapshot.vacancies);
                setBids(snapshot.bids);
              }
            });
            setTimeout(() => setToast(null), 10000);
          }}const
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
  combineDateTimeTZ,
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
          const start = combineDateTimeTZ(v.shiftDate, v.shiftStart);
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
  const [expandedBundles, setExpandedBundles] = useState<Record<string, boolean>>({});
  const [bulkAwardOpen, setBulkAwardOpen] = useState(false)
  const [toast, setToast] = useState<{message: string; undo?: () => void} | null>(null);
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
  const [virtScroll, setVirtScroll] = useState(0);
  const rowHeight = 56;

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
                        
                          onArchive={(id) => {
                            if (!confirm('Archive this vacancy?')) return;
                            // For now, archive is a no-op on status; you can add a dedicated archived flag later.
                            setVacancies(prev => prev.map(v => v.id === id ? { ...v, status: v.status } : v));
                          }}
                          onDelete={(id) => {
                            if (!confirm('Delete this vacancy? This also removes its bids.')) return;
                            setVacancies(prev => prev.filter(v => v.id !== id));
                            setBids(prev => prev.filter(b => b.vacancyId !== id));
                          }}
                        
<tbody>
  {!groupByBundle && filteredVacancies.map((v) => {
    const rec = recs[v.id] || {};
    const isSel = selectedVacancyIds.includes(v.id);
    return (
      <VacancyRow
        key={v.id}
        v={v}
        recId={rec.id}
        recName={employeesById[rec.id || ""] ? employeesById[rec.id || ""].firstName + " " + employeesById[rec.id || ""].lastName : ""}
        recWhy={rec.why || []}
        employees={employees}
        selected={isSel}
        onToggleSelect={(checked) => toggleVacancy(v.id, checked)}
        countdownLabel={countdownLabels[v.id]}
        countdownClass={countdownClasses[v.id]}
        isDueNext={dueNextId === v.id}
        onAward={(id, payload) => {
          if (payload.empId) {
            const target = vacancies.find(x => x.id === id);
            const overlap = vacancies.some(x =>
              x.id !== id && x.awardedTo === payload.empId && x.status !== "Filled" && x.shiftDate === target?.shiftDate &&
              !(x.shiftEnd <= target.shiftStart || x.shiftStart >= target.shiftEnd)
            );
            if (overlap && !confirm("This employee may already be awarded overlapping times. Continue?")) return;
          }
          setVacancies((prev) => applyAwardVacancy(prev, id, payload));
        }}
        onResetKnownAt={() => resetKnownAt(v.id)}
        onMarkFilled={(id) => setVacancies(prev => prev.map(x => x.id===id ? { ...x, status: "Filled" } : x))}
        onArchive={(id) => {
          if (!confirm('Archive this vacancy?')) return;
          setVacancies(prev => prev.map(x => x.id === id ? { ...x, status: x.status } : x));
        }}
        onDelete={(id) => {
          if (!confirm('Delete this vacancy? This also removes its bids.')) return;
          setVacancies(prev => prev.filter(x => x.id !== id));
          setBids(prev => prev.filter(b => b.vacancyId !== id));
        }}
      />
    );
  })}
  {groupByBundle && Object.entries(bundleGroups).map(([bundleId, ids]) => {
    const rows = ids.map(id => allVacanciesById[id]).filter(Boolean);
    const openRows = rows.filter(r => r.status !== "Awarded" && r.status !== "Filled");
    const isOpen = expandedBundles[bundleId];
    const first = rows[0];
    return (
      <Fragment key={bundleId}>
        <tr className="bundle-row">
          <td>
            <input type="checkbox"
              checked={ids.every(id => selectedVacancyIds.includes(id)) && ids.length > 0}
              onChange={(e) => {
                const checked = e.target.checked;
                ids.forEach(id => toggleVacancy(id, checked));
              }}
            />
          </td>
          <td colSpan={3}>
            <strong>Bundle</strong> {bundleId} — {rows.length} days
            <div style={{ fontSize: 12, opacity: 0.8 }}>{first?.wing} • {first?.classification}
      {toast && (
        <div style={{position: "fixed", right: 16, bottom: 16, background: "#222", color: "white", padding: "10px 14px", borderRadius: 8, boxShadow: "0 4px 10px rgba(0,0,0,0.3)"}}>
          <span>{toast.message}</span>
          {toast.undo && <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => { toast.undo?.(); setToast(null); }}>Undo</button>}
          <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => setToast(null)}>Dismiss</button>
        </div>
      )}
    
      {dryRun && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <div className="card" style={{ width: "min(1000px, 95vw)", maxHeight: "80vh", overflow: "auto" }}>
            <div className="card-h">CSV Dry Run Preview</div>
            <div className="card-c">
              {dryRun.errors.length > 0 && (
                <div className="alert" style={{ marginBottom: 8 }}>
                  <strong>{dryRun.errors.length} issues found:</strong>
                  <ul>{dryRun.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </div>
              )}
              <table className="table">
                <thead><tr>{dryRun.headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {dryRun.rows.slice(0,200).map((r, i) => (
                    <tr key={i}>
                      {dryRun.headers.map((h) => <td key={h}>{String(r[h] ?? "")}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <button className="btn" onClick={() => setDryRun(null)}>Cancel</button>
                <button className="btn" disabled={dryRun.errors.length > 0} onClick={() => {
                  // Commit import
                  const toAdd = dryRun.rows
                    .filter((r) => ["RCA","LPN","RN"].includes((r.classification || "").toUpperCase()) && ["FT","PT","Casual"].includes(r.status))
                    .map((r, idx) => ({
                      id: (crypto?.randomUUID ? crypto.randomUUID() : `emp_${Date.now()}_${idx}`),
                      firstName: r.firstName || "",
                      lastName: r.lastName || "",
                      classification: (r.classification || "RCA").toUpperCase(),
                      status: r.status as any,
                      seniorityRank: 9999,
                    }));
                  setEmployees((prev) => [...toAdd, ...prev]);
                  setDryRun(null);
                  setToast({ message: `Imported ${toAdd.length} employees` });
                }}>Import Valid Rows</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
          </td>
          <td colSpan={3}>
            <button className="btn btn-sm" onClick={() => setExpandedBundles(prev => ({ ...prev, [bundleId]: !prev[bundleId] }))}>
              {isOpen ? "Collapse" : "Expand"}
            </button>
            <button className="btn btn-sm" style={{ marginLeft: 6 }}
              onClick={() => {
                setSelectedVacancyIds(ids);
                setBulkAwardOpen(true);
              }}
            >
              Bulk Award Bundle
            </button>
          </td>
        </tr>
        {isOpen && rows.map((v) => {
          const rec = recs[v.id] || {};
          const isSel = selectedVacancyIds.includes(v.id);
          return (
            <VacancyRow
              key={v.id}
              v={v}
              recId={rec.id}
              recName={employeesById[rec.id || ""] ? employeesById[rec.id || ""].firstName + " " + employeesById[rec.id || ""].lastName : ""}
              recWhy={rec.why || []}
              employees={employees}
              selected={isSel}
              onToggleSelect={(checked) => toggleVacancy(v.id, checked)}
              countdownLabel={countdownLabels[v.id]}
              countdownClass={countdownClasses[v.id]}
              isDueNext={dueNextId === v.id}
              onAward={(id, payload) => {
                if (payload.empId) {
                  const target = vacancies.find(x => x.id === id);
                  const overlap = vacancies.some(x =>
                    x.id !== id && x.awardedTo === payload.empId && x.status !== "Filled" && x.shiftDate === target?.shiftDate &&
                    !(x.shiftEnd <= target.shiftStart || x.shiftStart >= target.shiftEnd)
                  );
                  if (overlap && !confirm("This employee may already be awarded overlapping times. Continue?")) return;
                }
                setVacancies((prev) => applyAwardVacancy(prev, id, payload));
              }}
              onResetKnownAt={() => resetKnownAt(v.id)}
              onMarkFilled={(id) => setVacancies(prev => prev.map(x => x.id===id ? { ...x, status: "Filled" } : x))}
              onArchive={(id) => {
                if (!confirm('Archive this vacancy?')) return;
                setVacancies(prev => prev.map(x => x.id === id ? { ...x, status: x.status } : x));
              }}
              onDelete={(id) => {
                if (!confirm('Delete this vacancy? This also removes its bids.')) return;
                setVacancies(prev => prev.filter(x => x.id !== id));
                setBids(prev => prev.filter(b => b.vacancyId !== id));
              }}
            />
          );
        })}
      </Fragment>
    );
  })}
</tbody>

  const allVacanciesById = Object.fromEntries(vacancies.map(v => [v.id, v]));
  const bundleGroups = vacancies.reduce<Record<string, string[]>>((acc, v) => {
    if (v.bundleId) {
      if (!acc[v.bundleId]) acc[v.bundleId] = [];
      acc[v.bundleId].push(v.id);
    }
    return acc;
  }, {});
const virtualizationEnabled = !groupByBundle && filteredVacancies.length > 300;
  const startIndex = virtualizationEnabled ? Math.floor(virtScroll / rowHeight) : 0;
  const viewportRows = virtualizationEnabled ? Math.ceil(520 / rowHeight) + 10 : filteredVacancies.length;
  const endIndex = virtualizationEnabled ? Math.min(filteredVacancies.length, startIndex + viewportRows) : filteredVacancies.length;
  const visibleVacancies = virtualizationEnabled ? filteredVacancies.slice(startIndex, endIndex) : filteredVacancies;

)