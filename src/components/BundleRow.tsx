import React from "react";
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

  const wingText = primary.wing ?? "Wing";
  const coverText = coveredName ? ` • Covering ${coveredName}` : "";
  const first = sorted[0]?.shiftDate;
  const last = sorted[sorted.length - 1]?.shiftDate;
  const rangeLabel = first && last && first !== last
    ? `${formatDateLong(first)} – ${formatDateLong(last)}`
    : formatDateLong(first || primary.shiftDate);
  const dateList = sorted.map((v) => formatDateLong(v.shiftDate)).join(", ");

  const rec = recommendations[primary.id];
  const topCandidate = rec?.candidates?.[0];
  const recId = topCandidate?.id ?? rec?.id;
  const recWhy = topCandidate?.why ?? rec?.why ?? [];
  const recCandidates = rec?.candidates ?? [];
  const recEmp = recId ? employees.find((e) => e.id === recId) : undefined;
  const recName = recEmp
    ? `${recEmp.firstName ?? ""} ${recEmp.lastName ?? ""}`.trim()
    : "—";

  const distinctWings = Array.from(
    new Set(sorted.map((v) => v.wing).filter(Boolean))
  );
  const multipleWings = distinctWings.length > 1;

  const [open, setOpen] = React.useState(false);
  const [awardOpen, setAwardOpen] = React.useState(false);

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
            <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className="pill">{items.length} days</span>
              <span className="pill" title="First day">{formatDateLong(primary.shiftDate)}</span>
              <span>
                {primary.classification}
                {open ? ` • ${wingText}${coverText}` : ""}
              </span>
            </div>
          }
          subtitle={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span className="subtitle">{rangeLabel}</span>
            </div>
          }
          rightTag={
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {recId ? (
                <span
                  className="pill"
                  style={{ cursor: "pointer" }}
                  title={recName}
                  onClick={() => onAwardBundle?.(recId)}
                >
                  {recName}
                </span>
              ) : (
                <span className="subtitle">—</span>
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
          <button className="btn btn-sm" onClick={()=> setAwardOpen((o)=> !o)}>{awardOpen?"Hide Award":"Award"}</button>
          {awardOpen && (
            <InlineEmployeePicker
              employees={employees}
              value={recId ?? ""}
              rankedCandidates={recCandidates}
              onChange={(id)=> onAwardBundle?.(id)}
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
          <button className="btn btn-sm" onClick={async () => { if (await (window as any).appShowConfirm?.(`Split this bundle into ${childIds.length} individual shifts?`, "Split bundle")) onSplitBundle(childIds); }}>
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
              {sorted.map((v, i) => (
                <div
                  key={v.id}
                  style={{
                    display: "flex",
                    gap: 8,
                    padding: "4px 0",
                    borderTop: i === 0 ? undefined : "1px solid var(--stroke)",
                  }}
                >
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

function InlineEmployeePicker({
  employees,
  value,
  onChange,
  rankedCandidates = [],
}: {
  employees: Employee[];
  value: string;
  onChange: (id: string) => void;
  rankedCandidates?: Recommendation["candidates"];
}) {
  const [q, setQ] = React.useState("");
  const [showRanked, setShowRanked] = React.useState(false);
  React.useEffect(() => {
    if (!rankedCandidates.length) setShowRanked(false);
  }, [rankedCandidates.length]);
  const list = React.useMemo(
    () =>
      employees
        .filter((e) =>
          `${e.firstName} ${e.lastName}`
            .toLowerCase()
            .includes(q.toLowerCase()),
        )
        .slice(0, 50),
    [employees, q],
  );
  const ranked = React.useMemo(() => {
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
  return (
    <div className="dropdown">
      <input
        placeholder="Type name…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => {}}
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
      {q && (
        <div className="menu" style={{ maxHeight: 240, overflow: "auto" }}>
          {list.map((e) => (
            <div
              key={e.id}
              className="item"
              onClick={() => {
                onChange(e.id);
                setQ("");
                setShowRanked(false);
              }}
            >
              {e.firstName} {e.lastName}
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
                setQ("");
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

