import { useMemo, useState } from "react";
import type { Employee, Vacation } from "./App";
import CalendarView, {
  type CalendarVacancyActionContext,
} from "./components/CalendarView";
import EventForm from "./components/EventForm";
import OpenVacancies from "./components/OpenVacancies";
import VacancyRangeForm from "./components/VacancyRangeForm";
import { createVacanciesFromRange } from "./lib/bundles";
import type { Vacancy, VacancyRange } from "./types";
import type { Tag } from "./models/tag";
import useVacancies from "./state/useVacancies";
import "./styles/branding.css";
import { loadState } from "./utils/storage";
import { randomId } from "./utils/id";
import Button from "./components/ui/Button";

type State = {
  employees: Employee[];
  vacations: Vacation[];
};

type PersistedDashboardState = Partial<State>;

export default function Dashboard() {
  const [persisted] = useState<PersistedDashboardState>(
    () => loadState<PersistedDashboardState>() ?? {},
  );
  const data: State = {
    employees: persisted.employees ?? [],
    vacations: persisted.vacations ?? [],
  };
  const { employees, vacations } = data;
  const {
    vacancies,
    stageDelete,
    undoDelete,
    staged,
    addVacancies,
    updateVacancy,
  } = useVacancies(persisted);

  const [view, setView] = useState<"list" | "calendar">("list");
  const [showRangeForm, setShowRangeForm] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState<Vacancy | null>(null);
  const [editingTagIds, setEditingTagIds] = useState<string[]>([]);

  const filled = useMemo(
    () => vacancies.filter((v) => v.status === "Filled" || v.status === "Awarded"),
    [vacancies],
  );

  const availableTags = useMemo<Tag[]>(() => {
    const map: Record<string, Tag> = {};
    for (const v of vacancies) {
      for (const t of v.tags ?? []) map[t.id] = t;
    }
    return Object.values(map);
  }, [vacancies]);

  const tagsById = useMemo(
    () => Object.fromEntries(availableTags.map((tag) => [tag.id, tag])),
    [availableTags],
  );

  const employeeLastAssigned = useMemo(() => {
    const map: Record<string, string> = {};
    for (const v of filled) {
      if (v.awardedTo && v.awardedAt) {
        const prev = map[v.awardedTo];
        if (!prev || new Date(v.awardedAt) > new Date(prev)) {
          map[v.awardedTo] = v.awardedAt;
        }
      }
    }
    return map;
  }, [filled]);

  const employeesWithLast = useMemo(
    () =>
      employees
        .map((e) => ({ ...e, lastAssigned: employeeLastAssigned[e.id] }))
        .sort((a, b) => {
          const ad = a.lastAssigned ? new Date(a.lastAssigned).getTime() : 0;
          const bd = b.lastAssigned ? new Date(b.lastAssigned).getTime() : 0;
          return bd - ad;
        }),
    [employees, employeeLastAssigned],
  );

  const isRecent = (date?: string) => {
    if (!date) return false;
    const d = new Date(date);
    const diff = Date.now() - d.getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  };

  const handleSaveRange = (range: VacancyRange, _awardAsBlock: boolean) => {
    const newVacancies = createVacanciesFromRange(range);
    addVacancies(newVacancies);
  };

  const handleEditVacancy = (
    _vacancyId: string,
    context: CalendarVacancyActionContext,
  ) => {
    setEditingVacancy(context.vacancy);
    setEditingTagIds((context.vacancy.tags ?? []).map((t) => t.id));
  };

  const handleDuplicateVacancy = (
    _vacancyId: string,
    context: CalendarVacancyActionContext,
  ) => {
    const source = context.vacancy;
    const newId = randomId();
    const duplicate: Vacancy = {
      ...source,
      id: newId,
      status: "Open",
      awardedTo: undefined,
      awardedAt: undefined,
      awardReason: undefined,
      overrideUsed: undefined,
      bundleId: undefined,
      bundleMode: undefined,
      knownAt: new Date().toISOString(),
    };
    addVacancies([duplicate]);
  };

  const handleDeleteVacancy = (vacancyId: string) => {
    stageDelete([vacancyId]);
  };

  const closeEditModal = () => {
    setEditingVacancy(null);
    setEditingTagIds([]);
  };

  const handleSaveEdit = () => {
    if (!editingVacancy) return;
    const nextTags = editingTagIds
      .map((id) => tagsById[id])
      .filter((tag): tag is Tag => Boolean(tag));
    updateVacancy(editingVacancy.id, {
      tags: nextTags.length ? nextTags : undefined,
    });
    closeEditModal();
  };

  return (
    <div className="dashboard">
      <header className="maplewood-header">
        <img src="/maplewood-logo.svg" alt="Maplewood logo" height={40} />
        <h1>Shift Dashboard</h1>
      </header>

      <nav className="dashboard-nav">
        <button
          onClick={() => setView("list")}
          className={view === "list" ? "active" : undefined}
          disabled={view === "list"}
        >
          List View
        </button>
        <button
          onClick={() => setView("calendar")}
          className={view === "calendar" ? "active" : undefined}
          disabled={view === "calendar"}
        >
          Calendar View
        </button>
      </nav>

      <main className="dashboard-content">
        {view === "calendar" ? (
          <CalendarView
            vacancies={vacancies}
            onCreateVacancy={() => setShowRangeForm(true)}
            onEditVacancy={handleEditVacancy}
            onDuplicateVacancy={handleDuplicateVacancy}
            onDeleteVacancy={handleDeleteVacancy}
          />
        ) : (
          <>
            <section>
              <h2>Filled Shifts</h2>
              <div className="shift-list">
                {filled.map((v) => (
                  <div key={v.id} className="shift-card awarded">
                    {v.shiftDate} {v.shiftStart}–{v.shiftEnd} • {v.wing ?? ""} • {v.classification}
                  </div>
                ))}
                {filled.length === 0 && <p>No filled shifts.</p>}
              </div>
            </section>

            <section>
              <h2>Open Shifts</h2>
              <OpenVacancies
                vacancies={vacancies}
                vacations={vacations}
                stageDelete={stageDelete}
                undoDelete={undoDelete}
                staged={staged}
              />
            </section>

            <section className="employee-list">
              <h2>Recent Assignments</h2>
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Last Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {employeesWithLast.map((e) => (
                    <tr
                      key={e.id}
                      className={isRecent(e.lastAssigned) ? "recent" : undefined}
                    >
                      <td>
                        {e.firstName} {e.lastName}
                      </td>
                      <td>
                        {e.lastAssigned
                          ? new Date(e.lastAssigned).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>
      <VacancyRangeForm
        open={showRangeForm}
        onClose={() => setShowRangeForm(false)}
        onSave={handleSaveRange}
        existingVacancies={vacancies}
      />
      {editingVacancy && (
        <div
          className="dashboard-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-vacancy-title"
        >
          <div className="dashboard-modal__panel">
            <div className="flex items-center justify-between mb-4">
              <h2 id="edit-vacancy-title" className="text-lg font-semibold">
                Edit Vacancy
              </h2>
              <Button onClick={closeEditModal} size="sm" variant="ghost">
                Close
              </Button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Adjust tags for {editingVacancy.shiftDate} {editingVacancy.shiftStart}–
              {editingVacancy.shiftEnd}.
            </p>
            <EventForm
              availableTags={availableTags}
              selectedTagIds={editingTagIds}
              onTagChange={setEditingTagIds}
            />
            <div className="dashboard-modal__actions">
              <Button onClick={closeEditModal} variant="ghost">
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} variant="primary">
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
