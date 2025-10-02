import React, { useEffect, useMemo, useState } from "react";
import type { Vacancy, Employee, Settings } from "../types";
import type { Recommendation } from "../recommend";
import { formatDateLong, combineDateTime } from "../lib/dates";
import {
  CellSelect,
  CellDetails,
  CellCountdown,
  CellActions,
} from "./rows/RowCells";

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
  onResetBundle?: (bundleId: string) => void;
  dueNextId: string | null;
  coveredName?: string;
  onOpenDetail?: (id: string) => void;
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
  onResetBundle,
  dueNextId,
  coveredName,
  onOpenDetail,
}: Props) {
  const sorted = useMemo(() =>
    [...items].sort((a,b) =>
      combineDateTime(a.shiftDate, a.shiftStart).getTime() -
      combineDateTime(b.shiftDate, b.shiftStart).getTime()
    ), [items]);
  const primary = sorted[0];
  const childIds = sorted.map((v) => v.id);
  const allSelected = childIds.every((id) => selectedIds.includes(id));
  const toggleAll = () => onToggleSelectMany(childIds);
  const isDueNext = dueNextId ? childIds.includes(dueNextId) : false;

  const wingText = primary.wing ?? "Wing";
  const coverText = coveredName ? ` • Covering ${coveredName}` : "";
  const first = sorted[0]?.shiftDate;
  const last = sorted[sorted.length - 1]?.shiftDate;
  const rangeLabel = first && last && first !== last
    ? `${formatDateLong(first)} – ${formatDateLong(last)}`
    : formatDateLong(first || primary.shiftDate);
  const dateList = sorted.map((v) => formatDateLong(v.shiftDate)).join(", ");

  const rec = recommendations[primary.id];
  const candidates = rec?.candidates ?? [];
  const hasCandidates = candidates.length > 0;
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [rec]);

  useEffect(() => {
    if (activeIndex >= candidates.length && candidates.length > 0) {
      setActiveIndex(candidates.length - 1);
    }
  }, [activeIndex, candidates.length]);

  const activeCandidate = candidates[activeIndex];
  const recId = activeCandidate?.id ?? rec?.id;
  const recWhy = activeCandidate?.why ?? rec?.why ?? [];
  const recEmp = recId ? employees.find((e) => e.id === recId) : undefined;
  const recName = recEmp
    ? `${recEmp.firstName ?? ""} ${recEmp.lastName ?? ""}`.trim()
    : recId ?? "—";

  const distinctWings = Array.from(
    new Set(sorted.map((v) => v.wing).filter(Boolean))
  );
  const multipleWings = distinctWings.length > 1;

  const [open, setOpen] = useState(false);
  const [awardOpen, setAwardOpen] = useState(false);

  const cycle = (dir: 1 | -1) => {
    if (!hasCandidates) return;
    setActiveIndex((idx) => {
      const next = (idx + dir + candidates.length) % candidates.length;
      return next;
    });
  };

  return (
    <>
      <tr
        id={`bundle-${groupId}`}
        data-bundle-id={groupId}
        className={`${isDueNext ? "due-next " : ""}${allSelected ? "selected" : ""}`.trim()}
      >
        <CellSelect
          checked={allSelected}
          onChange={toggleAll}
          ariaLabel="Select bundle"
        />
        <CellDetails
          title={
            <div className="vacancy-stack bundle-row__headline">
              <span className="pill">{items.length} days</span>
              <span className="pill" title="First day">{formatDateLong(primary.shiftDate)}</span>
              <span>
                {primary.classification}
                {open ? ` • ${wingText}${coverText}` : ""}
              </span>
            </div>
          }
          subtitle={
            <div className="vacancy-stack bundle-row__subtitle">
              <span className="subtitle">{rangeLabel}</span>
            </div>
          }
          rightTag={
            <div className="vacancy-stack bundle-row__tagline">
              {recId ? (
                <button
                  type="button"
                  className="pill"
                  title={recName}
                  aria-label={`Award bundle to ${recName}`}
                  onClick={() =>
                    activeCandidate?.id && onAwardBundle?.(activeCandidate.id)
                  }
                >
                  {recName}
                </button>
              ) : (
                <span className="subtitle">—</span>
              )}
              {hasCandidates && candidates.length > 1 && (
                <div className="vacancy-row__pager">
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => cycle(-1)}
                    aria-label="Previous bundle recommendation"
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
                    aria-label="Next bundle recommendation"
                  >
                    ▶
                  </button>
                </div>
              )}
              {multipleWings && (
                <span className="pill" title={distinctWings.join(", ")}>
                  Multiple wings
                </span>
              )}
              {recWhy.map((w, i) => (
                <span key={i} className="pill">
                  {w}
                </span>
              ))}
            </div>
          }
        />
        <CellCountdown source={primary} settings={settings} />
        <CellActions>
          <div className="action-grid">
            {onOpenDetail && (
              <button className="btn btn-sm" onClick={() => onOpenDetail(primary.id)}>
                Details
              </button>
            )}
            <button
              className="btn btn-sm"
              onClick={() => setAwardOpen((o) => !o)}
            >
              {awardOpen ? "Hide Award" : "Award Bundle"}
            </button>
            {awardOpen && (
              <InlineEmployeePicker
                employees={employees}
                value={activeCandidate?.id ?? ""}
                onChange={(id) => onAwardBundle?.(id)}
              />
            )}
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
            <button
              className="btn btn-sm"
              onClick={async () => {
                const confirmed = await (window as any).appShowConfirm?.(
                  `Split this bundle into ${childIds.length} individual shifts?`,
                  "Split bundle",
                );
                if (confirmed) {
                  onSplitBundle(childIds);
                }
              }}
            >
              Split
            </button>
            {onResetBundle && (
              <button className="btn btn-sm" onClick={() => onResetBundle(groupId)}>
                Reset timers
              </button>
            )}
            <button
              className="btn btn-sm danger"
              onClick={() => onDeleteMany(childIds)}
            >
              Delete
            </button>
          </div>
        </CellActions>
        </tr>

      {open && (
        <tr>
          <td />
          <td colSpan={3}>
            <div className="bundle-expand">
              {sorted.map((v) => (
                <div key={v.id} className="bundle-expand__row">
                  <div className="bundle-expand__cell bundle-expand__cell--date">
                    {formatDateLong(v.shiftDate)}
                  </div>
                  <div className="bundle-expand__cell bundle-expand__cell--time">
                    {v.shiftStart}–{v.shiftEnd}
                  </div>
                  <div className="bundle-expand__cell bundle-expand__cell--wing">
                    {v.wing ?? "-"}
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function InlineEmployeePicker({
  employees,
  value,
  onChange,
}: {
  employees: Employee[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const recommended = useMemo(
    () => employees.find((e) => e.id === value),
    [employees, value],
  );
  const placeholder = recommended
    ? `${recommended.firstName ?? ""} ${recommended.lastName ?? ""}`.trim() || recommended.id
    : "Type name…";
  useEffect(() => {
    setQ("");
  }, [value]);
  const list = useMemo(
    () =>
      employees
        .filter((e) =>
          `${e.firstName} ${e.lastName}`.toLowerCase().includes(q.toLowerCase()),
        )
        .slice(0, 50),
    [employees, q],
  );
  return (
    <div className="dropdown vacancy-dropdown">
      <input
        placeholder={placeholder || "Type name…"}
        value={q}
        onChange={(e)=> setQ(e.target.value)}
        onFocus={()=>{}}
      />
      <div className="menu vacancy-dropdown__menu">
        {list.map((e) => (
          <button
            type="button"
            key={e.id}
            className="item"
            onClick={() => {
              onChange(e.id);
              setQ("");
            }}
          >
            {e.firstName} {e.lastName}
          </button>
        ))}
        {!list.length && (
          <div className="item vacancy-dropdown__empty">No matches</div>
        )}
      </div>
    </div>
  );
}

