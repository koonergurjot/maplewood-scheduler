import { useState } from "react";
import type { Vacancy } from "../types";
import ConfirmDialog from "./ui/ConfirmDialog";
import Toast from "./ui/Toast";

interface Props {
  vacancies: Vacancy[];
  stageDelete: (ids: string[]) => void;
  undoDelete: () => void;
  staged: Vacancy[] | null;
}

export default function OpenVacancies({
  vacancies,
  stageDelete,
  undoDelete,
  staged,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState<string[] | null>(null);

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
            <th></th>
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
                />
              </td>
              <td>{v.classification}</td>
              <td>{v.shiftDate}</td>
              <td>
                {v.shiftStart}–{v.shiftEnd}
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
          ))}
          {openVacancies.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: "center" }}>
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
