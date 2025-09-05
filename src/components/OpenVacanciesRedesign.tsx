import React, { useMemo } from "react";
import type { Vacancy, Employee, Settings, Vacation } from "../types";
import type { Recommendation } from "../recommend";
import BundleRow from "./BundleRow";
import VacancyRow from "./VacancyRow";
import { combineDateTime } from "../lib/dates";

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
  resetKnownAt: (id: string) => void;
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
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (v) =>
          (v.reason || "").toLowerCase().includes(q) ||
          (v.wing || "").toLowerCase().includes(q),
      );
    }
    if (filters?.wing) list = list.filter((v) => (v.wing || "") === filters!.wing);
    if (filters?.classification)
      list = list.filter((v) => v.classification === filters!.classification);
    if (filters?.bundlesOnly) list = list.filter((v) => v.bundleId);
    if (filters?.singlesOnly) list = list.filter((v) => !v.bundleId);
    return list;
  }, [vacancies, filters]);

  const byDate = useMemo(() => {
    const m = new Map<string, Vacancy[]>();
    for (const v of filtered) {
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
  }, [filtered]);

  const fmtDate = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

  return (
    <div>
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
          {byDate.map(([date, items]) => {
            const groups = new Map<string, Vacancy[]>();
            items.forEach((v) => {
              if (v.bundleId) {
                const a = groups.get(v.bundleId) || [];
                a.push(v);
                groups.set(v.bundleId, a);
              }
            });
            const rendered: React.ReactNode[] = [];
            for (const [key, arr] of groups) {
              if (arr.length < 2) continue;
              const coveredName = vacNameById[arr[0].vacationId ?? ""];
              rendered.push(
                <BundleRow
                  key={`bundle-${key}-${date}`}
                  groupId={key}
                  items={arr}
                  employees={employees}
                  settings={settings}
                  recommendations={recommendations}
                  selectedIds={props.selectedIds}
                  onToggleSelectMany={props.onToggleSelectMany}
                  onDeleteMany={props.onDeleteMany}
                  onSplitBundle={(ids) => console.warn("split bundle", ids)}
                  onEditCoverage={props.onEditCoverage}
                  onAwardBundle={(eid) => props.awardBundle?.(key, eid)}
                  dueNextId={props.dueNextId}
                  coveredName={coveredName}
                />,
              );
            }
            for (const v of items) {
              const size = v.bundleId ? groups.get(v.bundleId)?.length || 0 : 0;
              if (size >= 2) continue;
              const rec = recommendations[v.id];
              const recId = rec?.id;
              const recName = recId
                ? `${employeesById[recId]?.firstName ?? ""} ${
                    employeesById[recId]?.lastName ?? ""
                  }`.trim()
                : "—";
              const recWhy = rec?.why ?? [];
              const coveredName = vacNameById[v.vacationId ?? ""];
              rendered.push(
                <VacancyRow
                  key={v.id}
                  v={v}
                  recId={recId}
                  recName={recName}
                  recWhy={recWhy}
                  employees={employees}
                  selected={props.selectedIds.includes(v.id)}
                  onToggleSelect={() => props.onToggleSelect(v.id)}
                  awardVacancy={(payload) => props.awardVacancy(v.id, payload)}
                  resetKnownAt={() => props.resetKnownAt(v.id)}
                  onDelete={props.onDelete}
                  isDueNext={props.dueNextId === v.id}
                  coveredName={coveredName}
                  settings={settings}
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
