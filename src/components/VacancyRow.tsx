import { useState, useEffect } from "react";
import { formatDateLong, formatDowShort } from "../lib/dates";
import type { Vacancy, Employee } from "../types";
import { OVERRIDE_REASONS } from "../types";
import { matchText } from "../lib/text";
import CoverageChip from "./ui/CoverageChip";
import { TrashIcon } from "./ui/Icon";

export default function VacancyRow({
  v,
  recId,
  recName,
  recWhy,
  employees,
  selected,
  onToggleSelect,
  countdownLabel,
  countdownClass,
  isDueNext,
  onAward,
  onResetKnownAt,
  onDelete,
  coveredName,
}: {
  v: Vacancy;
  recId?: string;
  recName: string;
  recWhy: string[];
  employees: Employee[];
  selected: boolean;
  onToggleSelect: () => void;
  countdownLabel: string;
  countdownClass: string;
  isDueNext: boolean;
  onAward: (payload: { empId?: string; reason?: string; overrideUsed?: boolean }) => void;
  onResetKnownAt: () => void;
  onDelete: (id: string) => void;
  coveredName?: string;
}) {
  const [choice, setChoice] = useState<string>("");
  const [overrideClass, setOverrideClass] = useState<boolean>(false);
  const [reason, setReason] = useState<string>("");

  const chosen = employees.find((e) => e.id === choice);
  const classMismatch = chosen && chosen.classification !== v.classification;
  const needReason = (!!recId && choice && choice !== recId) || (classMismatch && overrideClass);

  function handleAward() {
    if (classMismatch && !overrideClass) {
      alert(`Selected employee is ${chosen?.classification}; vacancy requires ${v.classification}. Check "Allow class override" to proceed.`);
      return;
    }
    if (needReason && !reason) {
      alert("Please select a reason for this override.");
      return;
    }
    onAward({ empId: choice || undefined, reason: reason || undefined, overrideUsed: overrideClass });
    setChoice("");
    setReason("");
    setOverrideClass(false);
  }

  return (
    <tr className={`${isDueNext ? "due-next " : ""}${selected ? "selected" : ""}`.trim()} aria-selected={selected} tabIndex={0}>
      <td>
        <input type="checkbox" checked={selected} onChange={onToggleSelect} />
      </td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span>
            <span className="pill">{formatDowShort(v.shiftDate)}</span> {formatDateLong(v.shiftDate)} • {v.shiftStart}-{v.shiftEnd}
            {coveredName && <> • Covering {coveredName}</>}
          </span>
          <CoverageChip
            startDate={v.startDate}
            endDate={v.endDate}
            coverageDates={v.coverageDates}
            variant="compact"
          />
        </div>
      </td>
      <td>{v.wing ?? ""}</td>
      <td>{v.classification}</td>
      <td>{v.offeringStep}</td>
      <td>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
          <span>{recName}</span>
          {recWhy.map((w, i) => (
            <span key={i} className="pill">
              {w}
            </span>
          ))}
        </div>
      </td>
      <td>
        <span className={`cd-chip ${countdownClass}`}>{countdownLabel}</span>
      </td>
      <td style={{ minWidth: 220 }}>
        <SelectEmployee allowEmpty employees={employees} value={choice} onChange={setChoice} />
      </td>
      <td style={{ whiteSpace: "nowrap" }}>
        <input
          id="override-toggle"
          className="toggle-input"
          type="checkbox"
          checked={overrideClass}
          onChange={(e) => setOverrideClass(e.target.checked)}
        />
        <label htmlFor="override-toggle" className="toggle-box">
          <span className="subtitle">Allow class override</span>
        </label>
      </td>
      <td style={{ minWidth: 230 }}>
        {needReason || overrideClass || (recId && choice && choice !== recId) ? (
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Select reason…</option>
            {OVERRIDE_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          <span className="subtitle">—</span>
        )}
      </td>
      <td style={{ display: "flex", gap: 6 }}>
        <button className="btn" onClick={onResetKnownAt}>
          Reset timer
        </button>
        <button className="btn" onClick={handleAward} disabled={!choice}>
          Award
        </button>
      </td>
      <td>
        <button
          className="btn btn-sm"
          aria-label="Delete vacancy"
          title="Delete vacancy"
          data-testid={`vacancy-delete-${v.id}`}
          tabIndex={0}
          onClick={() => onDelete(v.id)}
        >
          {TrashIcon ? (
            <TrashIcon style={{ width: 16, height: 16 }} aria-hidden="true" />
          ) : (
            "Delete"
          )}
        </button>
      </td>
    </tr>
  );
}

function SelectEmployee({
  employees,
  value,
  onChange,
  allowEmpty = false,
}: {
  employees: Employee[];
  value: string;
  onChange: (v: string) => void;
  allowEmpty?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!value) setQ("");
  }, [value]);
  const list = employees
    .filter((e) => matchText(q, `${e.firstName} ${e.lastName} ${e.id}`))
    .slice(0, 50);
  const curr = employees.find((e) => e.id === value);
  return (
    <div className="dropdown">
      <input
        placeholder={curr ? `${curr.firstName} ${curr.lastName} (${curr.id})` : "Type name or ID…"}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div className="menu" style={{ maxHeight: 320, overflow: "auto" }}>
          {allowEmpty && (
            <div
              className="item"
              onClick={() => {
                onChange("EMPTY");
                setQ("");
                setOpen(false);
              }}
            >
              Empty
            </div>
          )}
          {list.map((e) => (
            <div
              key={e.id}
              className="item"
              onClick={() => {
                onChange(e.id);
                setQ(`${e.firstName} ${e.lastName} (${e.id})`);
                setOpen(false);
              }}
            >
              {e.firstName} {e.lastName}{" "}
              <span className="pill" style={{ marginLeft: 6 }}>
                {e.classification} {e.status}
              </span>
            </div>
          ))}
          {!list.length && <div className="item" style={{ opacity: 0.7 }}>No matches</div>}
        </div>
      )}
    </div>
  );
}
