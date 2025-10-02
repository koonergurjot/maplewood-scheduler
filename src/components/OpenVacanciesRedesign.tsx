import React, { useMemo } from "react";
import type { Vacancy, Employee, Settings, Vacation } from "../types";
import { SHIFT_PRESETS } from "../types";
import type { Recommendation } from "../recommend";
import BundleRow from "./BundleRow";
import VacancyRow from "./VacancyRow";
import { combineDateTime } from "../lib/dates";
import SearchFilterBar from "./SearchFilterBar";
import { useVacancyFilters } from "../hooks/useVacancyFilters";

type Props = {
  vacancies: Vacancy[];
  employees: Employee[];
  vacations: Vacation[];
  settings: Settings;
  selectedIds: string[];
  dueNextId: string | null;
  onToggleSelect: (id: string) => void;
  onToggleSelectMany: (ids: string[]) => void;
  onDelete: (id: string) => void;
  onDeleteMany: (ids: string[]) => void;
  awardVacancy: (id: string, payload: any) => void;
  awardBundle?: (bundleId: string, employeeId: string) => void;
  onEditCoverage?: (bundleId: string) => void;
  onSplitBundle?: (ids: string[]) => void;
  resetKnownAt: (id: string) => void;
  resetBundleKnownAt?: (bundleId: string) => void;
  onOpenDetail?: (id: string) => void;
  filters?: {
    search?: string;
    wing?: string;
    classification?: string;
    bundlesOnly?: boolean;
    singlesOnly?: boolean;
  };
  recommendations: Record<string, Recommendation>;
};

export default function OpenVacanciesRedesign(props: Props) {
  const { vacancies, vacations, filters, settings, employees, recommendations } = props;
  const {
    search,
    setSearch,
    start,
    setStart,
    end,
    setEnd,
    selectedPositions,
    setSelectedPositions,
    selectedWings,
    setSelectedWings,
    filterShift,
    setFilterShift,
    bundleMode,
    setBundleMode,
  } = useVacancyFilters();
  const employeesById = useMemo(() => {
    const map: Record<string, Employee> = {};
    employees.forEach((e) => {
      map[e.id] = e;
    });
    return map;
  }, [employees]);
  const vacNameById = useMemo(() => {
    const map: Record<string, string> = {};
    vacations.forEach((v) => {
      map[v.id] = v.employeeName;
    });
    return map;
  }, [vacations]);
  const filtered = useMemo(() => {
    let list = vacancies.filter(
      (v) => v.status !== "Filled" && v.status !== "Awarded",
    );
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((v) => {
        const employeeName = vacNameById[v.vacationId ?? ""] || "";
        return (
          (v.reason || "").toLowerCase().includes(q) ||
          (v.wing || "").toLowerCase().includes(q) ||
          (v.classification || "").toLowerCase().includes(q) ||
          employeeName.toLowerCase().includes(q)
        );
      });
    }
    if (selectedWings.length)
      list = list.filter((v) => selectedWings.includes(v.wing || ""));
    if (selectedPositions.length)
      list = list.filter((v) => selectedPositions.includes(v.classification));
    if (filterShift) {
      const preset = SHIFT_PRESETS.find((p) => p.label === filterShift);
      if (preset)
        list = list.filter(
          (v) => v.shiftStart === preset.start && v.shiftEnd === preset.end,
        );
    }
    if (start) list = list.filter((v) => v.shiftDate >= start);
    if (end) list = list.filter((v) => v.shiftDate <= end);
    if (filters?.wing) list = list.filter((v) => (v.wing || "") === filters!.wing);
    if (filters?.classification)
      list = list.filter((v) => v.classification === filters!.classification);
    if (bundleMode === "bundles") list = list.filter((v) => v.bundleId);
    if (bundleMode === "singles") list = list.filter((v) => !v.bundleId);
    if (filters?.bundlesOnly) list = list.filter((v) => v.bundleId);
    if (filters?.singlesOnly) list = list.filter((v) => !v.bundleId);
    return list;
  }, [
    vacancies,
    search,
    selectedPositions,
    selectedWings,
    filterShift,
    start,
    end,
    filters,
    vacNameById,
    bundleMode,
  ]);

  // Cross-day bundle groups so multi-day vacancies render as ONE row
  const bundleGroups = useMemo(() => {
    const m = new Map<string, Vacancy[]>();
    for (const v of filtered) {
      if (!v.bundleId) continue;
      const a = m.get(v.bundleId) || [];
      a.push(v);
      m.set(v.bundleId, a);
    }
    const out = Array.from(m.entries()).filter(([, arr]) => arr.length >= 2);
    out.sort(([, a], [, b]) =>
      Math.min(
        ...a.map((x) => combineDateTime(x.shiftDate, x.shiftStart).getTime()),
      ) -
      Math.min(
        ...b.map((x) => combineDateTime(x.shiftDate, x.shiftStart).getTime()),
      ),
    );
    return out;
  }, [filtered]);

  const bundledChildIds = useMemo(() => {
    const set = new Set<string>();
    for (const [, arr] of bundleGroups) arr.forEach((v) => set.add(v.id));
    return set;
  }, [bundleGroups]);

  const byDate = useMemo(() => {
    const m = new Map<string, Vacancy[]>();
    for (const v of filtered) {
      if (bundledChildIds.has(v.id)) continue; // skip children already shown in bundles
      const key = v.shiftDate;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(v);
    }
    for (const [k, arr] of m)
      arr.sort(
        (a, b) =>
          combineDateTime(a.shiftDate, a.shiftStart).getTime() -
          combineDateTime(b.shiftDate, b.shiftStart).getTime(),
      );
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, bundledChildIds]);

  const fmtDate = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

  return (
    <div>
      <SearchFilterBar
        query={search}
        startDate={start}
        endDate={end}
        selectedPositions={selectedPositions}
        selectedWings={selectedWings}
        shiftPreset={filterShift}
        onQueryChange={setSearch}
        onStartDateChange={setStart}
        onEndDateChange={setEnd}
        onPositionsChange={setSelectedPositions}
        onWingsChange={setSelectedWings}
        onShiftPresetChange={setFilterShift}
        bundleMode={bundleMode}
        onBundleModeChange={(mode) => setBundleMode(mode)}
        onClear={() => {
          setSearch("");
          setStart("");
          setEnd("");
          setSelectedPositions([]);
          setSelectedWings([]);
          setFilterShift("");
          setBundleMode("all");
        }}
      />
      <table className="vacancies">
        <thead>
          <tr>
            <th style={{ width: 40 }}></th>
            <th>Open Vacancies</th>
            <th style={{ width: 140 }}>Time Left</th>
            <th style={{ width: "1%" }}></th>
          </tr>
        </thead>
        <tbody>
          {bundleGroups.length > 0 && (
            <tr className="section-h">
              <td colSpan={4}>Bundled Vacancies</td>
            </tr>
          )}
          {bundleGroups.map(([key, arr]) => {
              const coveredName = vacNameById[arr[0].vacationId ?? ""];
              return (
                <BundleRow
                  key={`bundle-${key}`}
                  groupId={key}
                  items={arr}
                  employees={employees}
                  settings={settings}
                  recommendations={recommendations}
                  selectedIds={props.selectedIds}
                  onToggleSelectMany={props.onToggleSelectMany}
                  onDeleteMany={props.onDeleteMany}
                  onSplitBundle={(ids) => props.onSplitBundle?.(ids)}
                  onEditCoverage={props.onEditCoverage}
                  onAwardBundle={(eid) => props.awardBundle?.(key, eid)}
                  onResetBundle={props.resetBundleKnownAt}
                  onOpenDetail={props.onOpenDetail}
                  dueNextId={props.dueNextId}
                  coveredName={coveredName}
                />
              );
            })}
          {byDate.map(([date, items]) => {
            const rendered: React.ReactNode[] = [];
            for (const v of items) {
              const recommendation = recommendations[v.id];
              const coveredName = vacNameById[v.vacationId ?? ""];
              rendered.push(
                <VacancyRow
                  key={v.id}
                  v={v}
                  recommendation={recommendation}
                  employees={employees}
                  selected={props.selectedIds.includes(v.id)}
                  onToggleSelect={() => props.onToggleSelect(v.id)}
                  awardVacancy={(payload) => props.awardVacancy(v.id, payload)}
                  resetKnownAt={() => props.resetKnownAt(v.id)}
                  onDelete={props.onDelete}
                  isDueNext={props.dueNextId === v.id}
                  coveredName={coveredName}
                  settings={settings}
                  onOpenDetail={
                    props.onOpenDetail
                      ? () => props.onOpenDetail?.(v.id)
                      : undefined
                  }
                />,
              );
            }
            return (
              <React.Fragment key={`sec-${date}`}>
                <tr className="section-h">
                  <td colSpan={4}>{fmtDate(date)}</td>
                </tr>
                {rendered}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
