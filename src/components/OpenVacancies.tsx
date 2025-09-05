import { useState, useMemo } from "react";
import type { Vacancy, Vacation } from "../types";
import ConfirmDialog from "./ui/ConfirmDialog";
import Toast from "./ui/Toast";
import { TrashIcon } from "./ui/Icon";
import CoverageChip from "./ui/CoverageChip";

interface Props {
  vacancies: Vacancy[];
  vacations?: Vacation[];
  stageDelete: (ids: string[]) => void;
  undoDelete: () => void;
  staged: Vacancy[] | null;
  readOnly?: boolean;
}

export default function OpenVacancies({
  vacancies,
  vacations = [],
  stageDelete,
  undoDelete,
  staged,
  readOnly = false,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState<string[] | null>(null);

  const vacNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const v of vacations) m[v.id] = v.employeeName;
    return m;
  }, [vacations]);

  const toggleSelect = (id: string) => {
    setSelected((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id],
    );
  };

  const openVacancies = vacancies.filter(
    (v) => v.status !== "Filled" && v.status !== "Awarded",
  );

  const allChecked =
    openVacancies.length > 0 && selected.length === openVacancies.length;

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? openVacancies.map((v) => v.id) : []);
  };

  const confirmDelete = (ids: string[]) => {
    setPending(ids);
  };

  const handleConfirm = () => {
    if (pending) {
      stageDelete(pending);
      setSelected((ids) => ids.filter((id) => !pending.includes(id)));
      setPending(null);
    }
  };

  const handleCancel = () => setPending(null);

  const singleMessage = (v: Vacancy) =>
    `This will remove the vacancy for ${v.classification} – ${v.shiftDate} ${v.shiftStart}. You can undo within 10 seconds.`;

  return (
    <div>
      {!readOnly && selected.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
            border: "1px solid var(--stroke)",
            padding: 8,
            borderRadius: 8,
          }}
        >
          <span>{selected.length} selected</span>
          <button
            className="btn btn-sm danger"
            data-testid="vacancy-delete-selected"
            aria-label="Delete selected vacancies"
            tabIndex={0}
            onClick={() => confirmDelete(selected)}
            title="Delete selected vacancies"
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              {TrashIcon ? (
                <TrashIcon style={{ width: 16, height: 16 }} aria-hidden="true" />
              ) : (
                "Delete"
              )}
              <span>Delete selected</span>
            </span>
          </button>
        </div>
      )}
      <table className="responsive-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={allChecked}
                onChange={(e) => toggleAll(e.target.checked)}
                aria-label="Select all vacancies"
              />
            </th>
            <th>Role</th>
            <th>Covering</th>
            <th>Date</th>
            <th>Time</th>
            <th style={{ textAlign: "right", minWidth: 60 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {openVacancies.map((v) => (
            <tr key={v.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selected.includes(v.id)}
                  onChange={() => toggleSelect(v.id)}
                  aria-label={`Select vacancy ${v.id}`}
                />
              </td>
              <td>{v.classification}</td>
              <td>{vacNameById[v.vacationId ?? ""] || "—"}</td>
              <td>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    flexWrap: "wrap",
                  }}
                >
                  <span>
                    {v.startDate && v.endDate && v.startDate !== v.endDate
                      ? `${v.startDate}–${v.endDate}`
                      : v.shiftDate}
                  </span>
                  <CoverageChip
                    startDate={v.startDate}
                    endDate={v.endDate}
                    coverageDates={v.coverageDates}
                  />
                </div>
              </td>
              <td>
                {v.shiftStart}–{v.shiftEnd}
              </td>
              <td style={{ textAlign: "right" }}>
                {!readOnly && (
                  <button
                    className="btn btn-sm"
                    title="Delete vacancy"
                    aria-label="Delete vacancy"
                    data-testid={`vacancy-delete-${v.id}`}
                    tabIndex={0}
                    onClick={() => confirmDelete([v.id])}
                  >
                    {TrashIcon ? (
                      <>
                        <TrashIcon
                          style={{ width: 16, height: 16 }}
                          aria-hidden="true"
                        />
                        <span className="sr-only">Delete vacancy</span>
                      </>
                    ) : (
                      "Delete"
                    )}
                  </button>
                )}
              </td>
            </tr>
          ))}
          {openVacancies.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: "center" }}>
                No vacancies
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <ConfirmDialog
        open={!!pending}
        title="Delete vacancy?"
        body={
          pending && pending.length === 1
            ? singleMessage(vacancies.find((v) => v.id === pending[0]) as Vacancy)
            : `This will remove ${pending?.length ?? 0} selected vacancies. You can undo within 10 seconds.`
        }
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      <Toast
        open={!!staged}
        message={staged && staged.length > 1 ? "Vacancies deleted." : "Vacancy deleted."}
        actionLabel="Undo"
        onAction={undoDelete}
      />
    </div>
  );
}
