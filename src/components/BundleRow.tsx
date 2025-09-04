import React from "react";
import type { Vacancy, Employee, Settings } from "../types";
import type { Recommendation } from "../recommend";
import { formatDateLong, combineDateTime } from "../lib/dates";
import EmployeePickerModal from "./EmployeePickerModal";
import { CellSelect, CellDetails, CellCountdown, CellActions } from "./rows/RowCells";

type Props = {
  groupId: string;
  items: Vacancy[];
  employees: Employee[];
  settings: Settings;
  recommendations: Record<string, Recommendation>;
  selectedIds: string[];
  onToggleSelectMany: (ids: string[]) => void;
  onDeleteMany: (ids: string[]) => void;
  onSplitBundle: (ids: string[]) => void;          // unsets bundleId on every child
  onAwardBundle?: (employeeId: string) => void;     // optional hook
  onEditCoverage?: (bundleId: string) => void;
  dueNextId: string | null;
};

export default function BundleRow({
  groupId,
  items,
  employees,
  settings,
  recommendations,
  selectedIds,
  onToggleSelectMany,
  onDeleteMany,
  onSplitBundle,
  onAwardBundle,
  onEditCoverage,
  dueNextId,
}: Props) {
  const sorted = React.useMemo(() =>
    [...items].sort((a,b) =>
      combineDateTime(a.shiftDate, a.shiftStart).getTime() -
      combineDateTime(b.shiftDate, b.shiftStart).getTime()
    ), [items]);
  const primary = sorted[0];
  const childIds = sorted.map((v) => v.id);
  const allSelected = childIds.every((id) => selectedIds.includes(id));
  const toggleAll = () => onToggleSelectMany(childIds);
  const isDueNext = dueNextId ? childIds.includes(dueNextId) : false;

  const now = Date.now();
  const wingText = primary.wing ?? "Wing";
  const title = `${items.length} days • ${wingText} • ${primary.classification}`;
  const dateList = sorted.map((v) => formatDateLong(v.shiftDate)).join(", ");

  const rec = recommendations[primary.id];
  const recId = rec?.id;
  const recEmp = recId ? employees.find((e) => e.id === recId) : undefined;
  const recName = recEmp
    ? `${recEmp.firstName ?? ""} ${recEmp.lastName ?? ""}`.trim()
    : "";

  const [open, setOpen] = React.useState(false);
  const [pickOpen, setPickOpen] = React.useState(false);

  return (
    <>
      <tr
        data-bundle-id={groupId}
        className={`${isDueNext ? "due-next " : ""}${allSelected ? "selected" : ""}`.trim()}
      >
        <CellSelect checked={allSelected} onChange={toggleAll} />
        <CellDetails
          rightTag=
            {recId ? (
              <span
                className="pill"
                style={{ cursor: "pointer" }}
                onClick={() => onAwardBundle?.(recId)}
              >
                {recName}
              </span>
            ) : undefined}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontWeight: 600 }}>{title}</div>
            <div
              className="subtitle"
              style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {dateList}
            </div>
          </div>
        </CellDetails>
        <CellCountdown vacancy={primary} settings={settings} now={now} />
        <CellActions>
          <button className="btn btn-sm" onClick={() => setOpen((o) => !o)}>
            {open ? "Hide" : "Expand"}
          </button>
          {onEditCoverage && (
            <button
              className="btn btn-sm"
              onClick={() => onEditCoverage(groupId)}
            >
              Edit coverage
            </button>
          )}
          <button className="btn btn-sm" onClick={() => setPickOpen(true)}>
            Award Bundle
          </button>
          <button className="btn btn-sm" onClick={() => onSplitBundle(childIds)}>
            Split
          </button>
          <button
            className="btn btn-sm danger"
            onClick={() => onDeleteMany(childIds)}
          >
            Delete
          </button>
        </CellActions>
      </tr>

      <EmployeePickerModal
        open={pickOpen}
        employees={employees}
        classification={primary.classification}
        onClose={() => setPickOpen(false)}
        onSelect={(eid) => {
          setPickOpen(false);
          onAwardBundle?.(eid);
        }}
      />
      {open && (
        <tr>
          <td />
          <td colSpan={3}>
            <div className="bundle-expand">
              {sorted.map((v) => (
                <div key={v.id} style={{ display: "flex", gap: 8, padding: "4px 0" }}>
                  <div style={{ minWidth: 160 }}>{formatDateLong(v.shiftDate)}</div>
                  <div style={{ minWidth: 100 }}>
                    {v.shiftStart}–{v.shiftEnd}
                  </div>
                  <div style={{ minWidth: 100 }}>{v.wing ?? "-"}</div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

