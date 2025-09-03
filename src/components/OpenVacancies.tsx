import { useState } from "react";
import type { Vacancy } from "../types";
import useVacancies from "../state/useVacancies";
import ConfirmDialog from "./ui/ConfirmDialog";
import Toast from "./ui/Toast";
import { datesInRange } from "../utils/date";

export default function OpenVacancies() {
  const { vacancies, stageDelete, undoDelete, staged } = useVacancies();
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState<string[] | null>(null);

  const toggleSelect = (id: string) => {
    setSelected((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id],
    );
  };

  const allChecked =
    vacancies.length > 0 && selected.length === vacancies.length;

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? vacancies.map((v) => v.id) : []);
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
      {selected.length > 0 && (
        <button
          className="btn btn-sm danger"
          data-testid="vacancy-delete-selected"
          aria-label="Delete selected vacancies"
          onClick={() => confirmDelete(selected)}
        >
          Delete selected
        </button>
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
            <th>Date</th>
            <th>Time</th>
            <th>Coverage</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {vacancies.map((v) => {
            const dates =
              v.coverageDates && v.coverageDates.length
                ? v.coverageDates
                : v.startDate && v.endDate
                ? datesInRange(v.startDate, v.endDate)
                : [v.shiftDate];
            return (
            <tr key={v.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selected.includes(v.id)}
                  onChange={() => toggleSelect(v.id)}
                />
              </td>
              <td>{v.classification}</td>
              <td>{v.shiftDate}</td>
              <td>
                {v.shiftStart}–{v.shiftEnd}
              </td>
              <td>
                {dates.length > 1 && (
                  <span
                    className="pill"
                    title={dates.join(", ")}
                  >
                    Coverage: {dates.length} days
                  </span>
                )}
              </td>
              <td>
                <button
                  className="btn btn-sm"
                  title="Delete vacancy"
                  aria-label="Delete vacancy"
                  data-testid={`vacancy-delete-${v.id}`}
                  onClick={() => confirmDelete([v.id])}
                >
                  🗑
                </button>
              </td>
            </tr>
            );
          })}
          {vacancies.length === 0 && (
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
