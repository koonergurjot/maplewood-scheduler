import { useState, useEffect, useMemo } from "react";
import { formatDateLong, formatDowShort } from "../lib/dates";
import type { Vacancy, Employee, Settings } from "../types";
import { OVERRIDE_REASONS } from "../types";
import { matchText } from "../lib/text";
import CoverageChip from "./ui/CoverageChip";
import { TrashIcon } from "./ui/Icon";
import {
  CellSelect,
  CellDetails,
  CellCountdown,
  CellActions,
} from "./rows/RowCells";
import type { RecommendationCandidate } from "../recommend";

export default function VacancyRow({
  v,
  recId,
  recName,
  recWhy,
  recCandidates,
  employees,
  selected,
  onToggleSelect,
  isDueNext,
  awardVacancy,
  resetKnownAt,
  onDelete,
  coveredName,
  settings,
}: {
  v: Vacancy;
  recId?: string;
  recName: string;
  recWhy: string[];
  recCandidates: RecommendationCandidate[];
  employees: Employee[];
  selected: boolean;
  onToggleSelect: () => void;
  isDueNext: boolean;
  awardVacancy: (payload: {
    empId?: string;
    reason?: string;
    overrideUsed?: boolean;
  }) => void;
  resetKnownAt: () => void;
  onDelete: (id: string) => void;
  coveredName?: string;
  settings: Settings;
}) {
  const [choice, setChoice] = useState<string>("");
  const [overrideClass, setOverrideClass] = useState<boolean>(false);
  const [reason, setReason] = useState<string>("");
  const [awardOpen, setAwardOpen] = useState<boolean>(false);

  const isBundleChild = v.bundleMode === "one-person" && !!v.bundleId;

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
    awardVacancy({
      empId: choice || undefined,
      reason: reason || undefined,
      overrideUsed: overrideClass,
    });
    setChoice("");
    setReason("");
    setOverrideClass(false);
  }

  return (
    <tr
      className={`${isDueNext ? "due-next " : ""}${
        selected ? "selected" : ""
      }`.trim()}
      aria-selected={selected}
      tabIndex={0}
    >
      <CellSelect
        checked={selected}
        onChange={onToggleSelect}
        ariaLabel={`Select vacancy ${v.id}`}
      />
      <CellDetails
        title={
          <div
            style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
          >
            <span>
              <span className="pill">{formatDowShort(v.shiftDate)}</span>{" "}
              {formatDateLong(v.shiftDate)} • {v.shiftStart}-{v.shiftEnd}
              {coveredName && <> • Covering {coveredName}</>}
            </span>
            <CoverageChip
              startDate={v.startDate}
              endDate={v.endDate}
              coverageDates={v.coverageDates}
              variant="compact"
            />
          </div>
        }
        subtitle={
          <div
            style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
          >
            {v.wing && <span className="pill">{v.wing}</span>}
            <span className="pill">{v.classification}</span>
            <span className="pill">{v.offeringStep}</span>
          </div>
        }
        rightTag={
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="subtitle truncate" title={recName}>
              {recName}
            </span>
            {recWhy.map((w, i) => (
              <span key={i} className="pill">
                {w}
              </span>
            ))}
          </div>
        }
      />
      <CellCountdown source={v} settings={settings} />
      <CellActions>
        {isBundleChild ? (
          <div className="action-grid">
            <button className="btn btn-sm" onClick={resetKnownAt}>
              Reset timer
            </button>
            {v.bundleId && (
              <a href={`#bundle-${v.bundleId}`} className="btn btn-sm">
                Award at bundle level
              </a>
            )}
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
          </div>
        ) : (
          <div className="action-grid">
            <button className="btn btn-sm" onClick={() => setAwardOpen((o) => !o)}>
              {awardOpen ? "Hide Award" : "Award"}
            </button>
            <button className="btn btn-sm" onClick={resetKnownAt}>
              Reset timer
            </button>
            {awardOpen && (
              <>
                <SelectEmployee
                  allowEmpty
                  employees={employees}
                  value={choice}
                  onChange={setChoice}
                  rankedCandidates={recCandidates}
                />
                <div style={{ whiteSpace: "nowrap" }}>
                  <input
                    id={`override-toggle-${v.id}`}
                    className="toggle-input"
                    type="checkbox"
                    checked={overrideClass}
                    onChange={(e) => setOverrideClass(e.target.checked)}
                  />
                  <label htmlFor={`override-toggle-${v.id}`} className="toggle-box">
                    <span className="subtitle">Allow class override</span>
                  </label>
                </div>
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
                <button
                  className="btn btn-sm"
                  onClick={handleAward}
                  disabled={!choice}
                >
                  Confirm Award
                </button>
              </>
            )}
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
          </div>
        )}
      </CellActions>
    </tr>
  );
}

function SelectEmployee({
  employees,
  value,
  onChange,
  allowEmpty = false,
  rankedCandidates = [],
}: {
  employees: Employee[];
  value: string;
  onChange: (v: string) => void;
  allowEmpty?: boolean;
  rankedCandidates?: RecommendationCandidate[];
}) {
  const [open, setOpen] = useState(false);
  const [showRanked, setShowRanked] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!value) setQ("");
  }, [value]);
  useEffect(() => {
    if (!rankedCandidates.length) setShowRanked(false);
  }, [rankedCandidates.length]);
  const list = useMemo(
    () =>
      employees
        .filter((e) => matchText(q, `${e.firstName} ${e.lastName} ${e.id}`))
        .slice(0, 50),
    [employees, q],
  );
  const ranked = useMemo(() => {
    if (!rankedCandidates.length) return [] as Array<{
      id: string;
      name: string;
      subtitle: string;
      why: string[];
    }>;
    return rankedCandidates
      .map((candidate) => {
        const emp = employees.find((e) => e.id === candidate.id);
        const name = emp
          ? `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim() || emp.id
          : candidate.id;
        const subtitle = emp
          ? `${emp.classification} ${emp.status}`.trim()
          : "";
        return { id: candidate.id, why: candidate.why, name, subtitle };
      })
      .filter((c) => !!c.id);
  }, [rankedCandidates, employees]);
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
      {ranked.length > 0 && (
        <button
          type="button"
          className="btn btn-sm"
          style={{ marginTop: 4 }}
          onClick={() => setShowRanked((prev) => !prev)}
        >
          {showRanked ? "Hide ranked bidders" : "View ranked bidders"}
        </button>
      )}
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
      {showRanked && (
        <div className="menu" style={{ maxHeight: 320, overflow: "auto", marginTop: 4 }}>
          {ranked.map((candidate) => (
            <div
              key={candidate.id}
              className="item"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 4,
                fontWeight: candidate.id === value ? 600 : undefined,
              }}
              onClick={() => {
                onChange(candidate.id);
                setQ(`${candidate.name} (${candidate.id})`);
                setOpen(false);
                setShowRanked(false);
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span>{candidate.name}</span>
                <span className="subtitle">{candidate.id}</span>
                {candidate.subtitle && (
                  <span className="pill" style={{ marginLeft: 6 }}>{candidate.subtitle}</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {candidate.why.map((reason, idx) => (
                  <span key={idx} className="pill">
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {!ranked.length && (
            <div className="item" style={{ opacity: 0.7 }}>
              No ranked bidders
            </div>
          )}
        </div>
      )}
    </div>
  );
}
