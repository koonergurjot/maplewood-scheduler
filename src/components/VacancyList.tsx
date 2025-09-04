import { useMemo } from "react";
import type { Vacancy, Employee, Settings } from "../types";
import VacancyRow from "./VacancyRow";
import { useVacancyFilters } from "../hooks/useVacancyFilters";
import { WINGS, SHIFT_PRESETS } from "../types";
import { deadlineFor, pickWindowMinutes, fmtCountdown, archiveBidsForVacancy } from "../lib/vacancy";
import { minutesBetween } from "../lib/dates";

export interface Recommendation {
  id?: string;
  why: string[];
}

interface Props {
  vacancies: Vacancy[];
  employees: Employee[];
  employeesById: Record<string, Employee>;
  recommendations: Record<string, Recommendation>;
  selectedVacancyIds: string[];
  setSelectedVacancyIds: (fn: any) => void;
  settings: Settings;
  now: number;
  dueNextId: string | null;
  awardVacancy: (
    id: string,
    payload: {
      empId?: string;
      reason?: string;
      overrideUsed?: boolean;
      skipConflictCheck?: boolean;
    },
  ) => void;
  resetKnownAt: (id: string) => void;
  setBids?: (u: any) => void;
  bids?: any[];
  archivedBids?: Record<string, any[]>;
  deleteVacancy?: (id: string) => void;
}

export default function VacancyList({
  vacancies,
  employees,
  employeesById,
  recommendations,
  selectedVacancyIds,
  setSelectedVacancyIds,
  settings,
  now,
  dueNextId,
  awardVacancy,
  resetKnownAt,
  deleteVacancy = () => {},
}: Props) {
  const {
    filterWing,
    setFilterWing,
    filterClass,
    setFilterClass,
    filterShift,
    setFilterShift,
    filterCountdown,
    setFilterCountdown,
    filterStart,
    setFilterStart,
    filterEnd,
    setFilterEnd,
    filtersOpen,
    setFiltersOpen,
  } = useVacancyFilters();

  const filteredVacancies = useMemo(() => {
    return vacancies.filter((v) => {
      if (v.status === "Filled" || v.status === "Awarded") return false;
      if (filterWing && v.wing !== filterWing) return false;
      if (filterClass && v.classification !== filterClass) return false;
      if (filterShift) {
        const preset = SHIFT_PRESETS.find((p) => p.label === filterShift);
        if (preset && (v.shiftStart !== preset.start || v.shiftEnd !== preset.end)) return false;
      }
      if (filterCountdown) {
        const msLeft = deadlineFor(v, settings).getTime() - now;
        const winMin = pickWindowMinutes(v, settings);
        const sinceKnownMin = minutesBetween(new Date(), new Date(v.knownAt));
        const pct = Math.max(0, Math.min(1, (winMin - sinceKnownMin) / winMin));
        let cdClass: string = "green";
        if (msLeft <= 0) cdClass = "red";
        else if (pct < 0.25) cdClass = "yellow";
        if (filterCountdown !== cdClass) return false;
      }
      if (filterStart && v.shiftDate < filterStart) return false;
      if (filterEnd && v.shiftDate > filterEnd) return false;
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

  const toggleAllVacancies = (checked: boolean) => {
    setSelectedVacancyIds(checked ? filteredVacancies.map((v) => v.id) : []);
  };

  return (
    <div className="card">
      <div className="card-h">Open Vacancies</div>
      <div className="card-c">
        <div style={{ marginBottom: 8, display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="checkbox"
              checked={
                filteredVacancies.length > 0 &&
                selectedVacancyIds.length === filteredVacancies.length
              }
              onChange={(e) => toggleAllVacancies(e.target.checked)}
            />
            All
          </label>
          <button className="btn btn-sm" onClick={() => setFiltersOpen(!filtersOpen)}>
            {filtersOpen ? "Hide Filters ▲" : "Show Filters ▼"}
          </button>
        </div>
        {filtersOpen && (
          <div className="toolbar" style={{ marginBottom: 8 }}>
            <select value={filterWing} onChange={(e) => setFilterWing(e.target.value)}>
              <option value="">All Wings</option>
              {WINGS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value as any)}>
              <option value="">All Classes</option>
              {["RCA", "LPN", "RN"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select value={filterShift} onChange={(e) => setFilterShift(e.target.value)}>
              <option value="">All Shifts</option>
              {SHIFT_PRESETS.map((s) => (
                <option key={s.label} value={s.label}>
                  {s.label}
                </option>
              ))}
            </select>
            <select value={filterCountdown} onChange={(e) => setFilterCountdown(e.target.value)}>
              <option value="">All Countdowns</option>
              <option value="green">Green</option>
              <option value="yellow">Yellow</option>
              <option value="red">Red</option>
            </select>
            <input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} />
            <input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} />
            <button
              className="btn"
              onClick={() => {
                setFilterWing("");
                setFilterClass("");
                setFilterShift("");
                setFilterCountdown("");
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
                    selectedVacancyIds.length === filteredVacancies.length
                  }
                  onChange={(e) => toggleAllVacancies(e.target.checked)}
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
              <th colSpan={2} style={{ textAlign: "center" }}>
                Actions
              </th>
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
              const sinceKnownMin = minutesBetween(new Date(), new Date(v.knownAt));
              const pct = Math.max(0, Math.min(1, (winMin - sinceKnownMin) / winMin));
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
                    setSelectedVacancyIds((ids: string[]) =>
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
                  onDelete={deleteVacancy}
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
  );
}
