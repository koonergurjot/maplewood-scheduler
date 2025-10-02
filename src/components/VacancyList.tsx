import { useMemo } from "react";
import type { Vacancy, Employee, Settings, Classification } from "../types";
import type { Recommendation } from "../recommend";
import VacancyRow from "./VacancyRow";
import { useVacancyFilters } from "../hooks/useVacancyFilters";
import { WINGS, SHIFT_PRESETS, CLASSIFICATIONS } from "../types";
import { MultiSelectDropdown } from "./SearchFilterBar";
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
    selectedWings,
    setSelectedWings,
    selectedPositions,
    setSelectedPositions,
    filterShift,
    setFilterShift,
    start,
    setStart,
    end,
    setEnd,
    filtersOpen,
    setFiltersOpen,
    resetFilters,
  } = useVacancyFilters();

  const filteredVacancies = useMemo(() => {
    return vacancies.filter((v) => {
      if (v.status === "Filled" || v.status === "Awarded") return false;
      if (selectedWings.length && !selectedWings.includes(v.wing || "")) return false;
      if (selectedPositions.length && !selectedPositions.includes(v.classification))
        return false;
      if (filterShift) {
        const preset = SHIFT_PRESETS.find((p) => p.label === filterShift);
        if (preset && (v.shiftStart !== preset.start || v.shiftEnd !== preset.end)) return false;
      }
      if (start && v.shiftDate < start) return false;
      if (end && v.shiftDate > end) return false;
      return true;
    });
  }, [vacancies, selectedWings, selectedPositions, filterShift, start, end, now]);

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
            <MultiSelectDropdown
              label="Wings"
              namePrefix="vacancy-list-wings"
              options={WINGS.map((wing) => ({ value: wing, label: wing }))}
              selected={selectedWings}
              onChange={setSelectedWings}
            />
            <MultiSelectDropdown<Classification>
              label="Positions"
              namePrefix="vacancy-list-positions"
              options={CLASSIFICATIONS.map((classification) => ({
                value: classification,
                label: classification,
              }))}
              selected={selectedPositions}
              onChange={setSelectedPositions}
            />
            <select value={filterShift} onChange={(e) => setFilterShift(e.target.value)}>
              <option value="">All Shifts</option>
              {SHIFT_PRESETS.map((s) => (
                <option key={s.label} value={s.label}>
                  {s.label}
                </option>
              ))}
            </select>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            <button
              className="btn"
              onClick={resetFilters}
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
