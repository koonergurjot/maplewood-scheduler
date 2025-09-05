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

  const grouped = useMemo(() => {
    const m = new Map<string, Vacancy[]>();
    for (const v of openVacancies) {
      const key = v.bundleId || v.id;
      const arr = m.get(key) || [];
      arr.push(v);
      m.set(key, arr);
    }
    return Array.from(m.values());
  }, [openVacancies]);

  const allChecked =
    openVacancies.length > 0 && selected.length === openVacancies.length;

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? openVacancies.map((v) => v.id) : []);
  };

  const confirmDelete = (ids: string[]) => {
    setPending(ids);
  };

  const toggleGroup = (ids: string[]) => {
    setSelected((prev) => {
      const allSelected = ids.every((id) => prev.includes(id));
      return allSelected
        ? prev.filter((id) => !ids.includes(id))
        : [...prev, ...ids.filter((id) => !prev.includes(id))];
    });
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
          {grouped.map((group) => {
            const primary = group[0];
            const ids = group.map((v) => v.id);
            const checked = ids.every((id) => selected.includes(id));
            const sameTime = group.every(
              (v) => v.shiftStart === primary.shiftStart && v.shiftEnd === primary.shiftEnd,
            );
            return (
              <tr key={primary.bundleId || primary.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      group.length === 1
                        ? toggleSelect(primary.id)
                        : toggleGroup(ids)
                    }
                    aria-label={
                      group.length === 1
                        ? `Select vacancy ${primary.id}`
                        : `Select bundle ${primary.bundleId}`
                    }
                  />
                </td>
                <td>{primary.classification}</td>
                <td>{vacNameById[primary.vacationId ?? ""] || "—"}</td>
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
                      {primary.startDate && primary.endDate && primary.startDate !== primary.endDate
                        ? `${primary.startDate}–${primary.endDate}`
                        : primary.shiftDate}
                    </span>
                    <CoverageChip
                      startDate={primary.startDate}
                      endDate={primary.endDate}
                      coverageDates={primary.coverageDates}
                    />
                  </div>
                </td>
                <td>
                  {sameTime
                    ? `${primary.shiftStart}–${primary.shiftEnd}`
                    : "Varies"}
                </td>
                <td style={{ textAlign: "right" }}>
                  {!readOnly && (
                    <button
                      className="btn btn-sm"
                      title="Delete vacancy"
                      aria-label="Delete vacancy"
                      data-testid={`vacancy-delete-${primary.id}`}
                      tabIndex={0}
                      onClick={() => confirmDelete(ids)}
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
            );
          })}
          {grouped.length === 0 && (
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
