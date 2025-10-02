import { useState, useEffect, useMemo } from "react";
import type { CSSProperties } from "react";
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
import type { Recommendation } from "../recommend";

export default function VacancyRow({
  v,
  recommendation,
  employees,
  selected,
  onToggleSelect,
  isDueNext,
  awardVacancy,
  resetKnownAt,
  onDelete,
  coveredName,
  settings,
  as = "tr",
  style,
  ariaProps,
  onOpenDetail,
}: {
  v: Vacancy;
  recommendation?: Recommendation;
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
  as?: "tr" | "div";
  style?: CSSProperties;
  ariaProps?: Record<string, string | number | undefined>;
  onOpenDetail?: () => void;
}) {
  const [choice, setChoice] = useState<string>("");
  const [choiceManual, setChoiceManual] = useState<boolean>(false);
  const [overrideClass, setOverrideClass] = useState<boolean>(false);
  const [reason, setReason] = useState<string>("");
  const [awardOpen, setAwardOpen] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const isBundleChild = v.bundleMode === "one-person" && !!v.bundleId;

  const chosen = employees.find((e) => e.id === choice);
  const classMismatch = chosen && chosen.classification !== v.classification;

  const candidates = recommendation?.candidates ?? [];
  const hasCandidates = candidates.length > 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [recommendation]);

  useEffect(() => {
    if (activeIndex >= candidates.length && candidates.length > 0) {
      setActiveIndex(candidates.length - 1);
    }
  }, [activeIndex, candidates.length]);

  const activeCandidate = candidates[activeIndex];

  const recommendedEmployee = useMemo(() => {
    if (!activeCandidate) return undefined;
    return employees.find((e) => e.id === activeCandidate.id);
  }, [activeCandidate, employees]);

  const recName = recommendedEmployee
    ? `${recommendedEmployee.firstName ?? ""} ${recommendedEmployee.lastName ?? ""}`.trim()
    : activeCandidate?.id
    ? activeCandidate.id
    : "—";
  const recWhy = activeCandidate?.why ?? recommendation?.why ?? [];
  const recommendedId = activeCandidate?.id;

  useEffect(() => {
    if (!awardOpen) return;
    if (choiceManual) return;
    if (recommendedId) {
      setChoice(recommendedId);
    } else {
      setChoice("");
    }
  }, [awardOpen, recommendedId, choiceManual]);

  const needReason =
    (!!recommendedId && choice && choice !== recommendedId) ||
    (classMismatch && overrideClass);

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
    setChoiceManual(false);
    setReason("");
    setOverrideClass(false);
  }

  const cycle = (dir: 1 | -1) => {
    if (!hasCandidates) return;
    setActiveIndex((idx) => {
      const next = (idx + dir + candidates.length) % candidates.length;
      return next;
    });
    setChoiceManual(false);
  };

  const RowComponent = (as === "div" ? "div" : "tr") as keyof JSX.IntrinsicElements;
  const cellComponent = as === "div" ? "div" : "td";
  const rowClassName = `${as === "div" ? "vac-table__row " : ""}${
    isDueNext ? "due-next " : ""
  }${selected ? "selected" : ""}`
    .replace(/\s+/g, " ")
    .trim();

  const sanitizedAriaProps = { ...(ariaProps ?? {}) };
  delete sanitizedAriaProps.role;
  const rowExtraProps = as === "div" ? { role: "row", ...sanitizedAriaProps } : {};

  return (
    <RowComponent
      className={rowClassName}
      aria-selected={selected}
      tabIndex={0}
      style={style}
      {...rowExtraProps}
    >
      <CellSelect
        component={cellComponent}
        checked={selected}
        onChange={onToggleSelect}
        ariaLabel={`Select vacancy ${v.id}`}
      />
      <CellDetails
        component={cellComponent}
        title={
          <div className="vacancy-stack vacancy-row__headline">
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
          <div className="vacancy-stack vacancy-row__meta">
            {v.wing && <span className="pill">{v.wing}</span>}
            <span className="pill">{v.classification}</span>
            <span className="pill">{v.offeringStep}</span>
          </div>
        }
        rightTag={
          <div className="vacancy-stack vacancy-row__tagline">
            <span className="subtitle truncate" title={recName}>
              {recName}
            </span>
            {hasCandidates && candidates.length > 1 && (
              <div className="vacancy-row__pager">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => cycle(-1)}
                  aria-label="Previous recommendation"
                >
                  ◀
                </button>
                <span className="subtitle" aria-live="polite">
                  {activeIndex + 1}/{candidates.length}
                </span>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => cycle(1)}
                  aria-label="Next recommendation"
                >
                  ▶
                </button>
              </div>
            )}
            {recWhy.map((w, i) => (
              <span key={i} className="pill">
                {w}
              </span>
            ))}
          </div>
        }
      />
      <CellCountdown component={cellComponent} source={v} settings={settings} />
      <CellActions component={cellComponent}>
        {isBundleChild ? (
          <div className="action-grid">
            {onOpenDetail && (
              <button className="btn btn-sm" onClick={onOpenDetail}>
                Details
              </button>
            )}
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
            {onOpenDetail && (
              <button className="btn btn-sm" onClick={onOpenDetail}>
                Details
              </button>
            )}
            <button
              className="btn btn-sm"
              onClick={() =>
                setAwardOpen((o) => {
                  const next = !o;
                  if (next) {
                    setChoiceManual(false);
                  }
                  return next;
                })
              }
            >
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
                  onChange={(val) => {
                    setChoice(val);
                    setChoiceManual(true);
                  }}
                />
                <div className="vacancy-row__toggle">
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
                {needReason || overrideClass ||
                (recommendedId && choice && choice !== recommendedId) ? (
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
    </RowComponent>
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
    <div className="dropdown vacancy-dropdown">
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
        <div className="menu vacancy-row__menu">
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
              <span className="pill vacancy-row__employee-pill">
                {e.classification} {e.status}
              </span>
            </div>
          ))}
          {!list.length && (
            <div className="item dropdown__empty">No matches</div>
          )}
        </div>
      )}
    </div>
  );
}
