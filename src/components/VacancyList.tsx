import { useMemo } from "react";
import type { Vacancy, Employee, Settings } from "../types";
import type { Recommendation } from "../recommend";
import VacancyRow from "./VacancyRow";
import { useVacancyFilters } from "../hooks/useVacancyFilters";
import { WINGS, SHIFT_PRESETS } from "../types";
import { deadlineFor, pickWindowMinutes } from "../lib/vacancy";
import { minutesBetween } from "../lib/dates";
import { List, type RowComponentProps } from "react-window";

const ROW_HEIGHT = 220;
const MAX_LIST_HEIGHT = 600;

interface Props {
  vacancies: Vacancy[];
  employees: Employee[];
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
    start,
    setStart,
    end,
    setEnd,
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
      if (start && v.shiftDate < start) return false;
      if (end && v.shiftDate > end) return false;
      return true;
    });
  }, [
    vacancies,
    filterWing,
    filterClass,
    filterShift,
    filterCountdown,
    start,
    end,
    now,
    settings,
  ]);

  const toggleAllVacancies = (checked: boolean) => {
    setSelectedVacancyIds(checked ? filteredVacancies.map((v) => v.id) : []);
  };

  const listHeight = useMemo(() => {
    if (filteredVacancies.length === 0) return 0;
    return Math.min(
      MAX_LIST_HEIGHT,
      Math.max(filteredVacancies.length, 1) * ROW_HEIGHT,
    );
  }, [filteredVacancies.length]);

  const rowProps = useMemo<VacancyListRowProps>(() => {
    return {
      items: filteredVacancies,
      employees,
      recommendations,
      selectedVacancyIds,
      setSelectedVacancyIds,
      awardVacancy,
      resetKnownAt,
      deleteVacancy,
      settings,
      dueNextId,
    };
  }, [
    filteredVacancies,
    employees,
    recommendations,
    selectedVacancyIds,
    setSelectedVacancyIds,
    awardVacancy,
    resetKnownAt,
    deleteVacancy,
    settings,
    dueNextId,
  ]);

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
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            <button
              className="btn"
              onClick={() => {
                setFilterWing("");
                setFilterClass("");
                setFilterShift("");
                setFilterCountdown("");
                setStart("");
                setEnd("");
              }}
            >
              Clear
            </button>
          </div>
        )}
        <div
          className="vac-table virtual-vac-table responsive-table"
          role="table"
          aria-label="Open vacancies"
        >
          <div className="vac-table__header" role="rowgroup">
            <div className="vac-table__header-row" role="row">
              <div className="vac-table__header-cell" role="columnheader">
                <input
                  type="checkbox"
                  aria-label="Select all vacancies"
                  checked={
                    filteredVacancies.length > 0 &&
                    selectedVacancyIds.length === filteredVacancies.length
                  }
                  onChange={(e) => toggleAllVacancies(e.target.checked)}
                />
              </div>
              <div className="vac-table__header-cell" role="columnheader">
                Details
              </div>
              <div className="vac-table__header-cell" role="columnheader">
                Countdown
              </div>
              <div className="vac-table__header-cell" role="columnheader">
                Actions
              </div>
            </div>
          </div>
          {filteredVacancies.length > 0 && listHeight > 0 ? (
            <List
              className="vac-table__body vac-table__scroller"
              style={{ height: listHeight, width: "100%" }}
              rowCount={filteredVacancies.length}
              rowHeight={ROW_HEIGHT}
              overscanCount={4}
              rowComponent={VirtualVacancyRow}
              rowProps={rowProps}
              role="rowgroup"
            />
          ) : (
            <div className="vac-table__empty" role="row">
              <div className="vac-table__cell" role="cell">
                No open vacancies 🎉
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type VacancyListRowProps = {
  items: Vacancy[];
  employees: Employee[];
  recommendations: Record<string, Recommendation>;
  selectedVacancyIds: string[];
  setSelectedVacancyIds: (fn: any) => void;
  awardVacancy: Props["awardVacancy"];
  resetKnownAt: Props["resetKnownAt"];
  deleteVacancy: NonNullable<Props["deleteVacancy"]>;
  settings: Settings;
  dueNextId: string | null;
};

const VirtualVacancyRow = ({
  ariaAttributes,
  index,
  style,
  items,
  employees,
  recommendations,
  selectedVacancyIds,
  setSelectedVacancyIds,
  awardVacancy,
  resetKnownAt,
  deleteVacancy,
  settings,
  dueNextId,
}: RowComponentProps<VacancyListRowProps>) => {
  const vacancy = items[index];
  if (!vacancy) return null;
  const { role: _role, ...restAria } = ariaAttributes ?? {};
  const isDueNext = dueNextId === vacancy.id;
  return (
    <VacancyRow
      as="div"
      style={{ ...style, width: "100%" }}
      ariaProps={restAria}
      v={vacancy}
      recommendation={recommendations[vacancy.id]}
      employees={employees}
      selected={selectedVacancyIds.includes(vacancy.id)}
      onToggleSelect={() =>
        setSelectedVacancyIds((ids: string[]) =>
          ids.includes(vacancy.id)
            ? ids.filter((id) => id !== vacancy.id)
            : [...ids, vacancy.id],
        )
      }
      isDueNext={!!isDueNext}
      awardVacancy={(payload) => awardVacancy(vacancy.id, payload)}
      resetKnownAt={() => resetKnownAt(vacancy.id)}
      onDelete={deleteVacancy}
      settings={settings}
    />
  );
};
