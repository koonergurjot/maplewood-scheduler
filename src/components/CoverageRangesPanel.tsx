import { useMemo } from "react";
import type { VacancyRange, Bid } from "../types";
import { formatDateLong, formatDowShort } from "../lib/dates";
import { getDatesInRange } from "../utils/date";
import Button from "./ui/Button";

type Props = {
  ranges: VacancyRange[];
  bids: Bid[];
  onBid: (range: VacancyRange) => void;
  onAward: (range: VacancyRange) => void | Promise<void>;
};

type BidSummary = { total: number; partial: number };

export default function CoverageRangesPanel({
  ranges,
  bids,
  onBid,
  onAward,
}: Props) {
  const bidSummary = useMemo(() => {
    const summary = new Map<string, BidSummary>();
    for (const bid of bids) {
      const entry = summary.get(bid.vacancyId) ?? { total: 0, partial: 0 };
      entry.total += 1;
      if (bid.coverageType && bid.coverageType !== "full") {
        entry.partial += 1;
      }
      summary.set(bid.vacancyId, entry);
    }
    return summary;
  }, [bids]);

  const sortedRanges = useMemo(
    () => [...ranges].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [ranges],
  );

  return (
    <div className="grid">
      <div className="card">
        <div className="card-h">Multi-day coverage ranges</div>
        <div className="card-c">
          {sortedRanges.length === 0 ? (
            <div className="subtitle">
              No saved ranges yet. Use “New Multi-Day Vacancy” to add one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 220 }}>Range</th>
                    <th style={{ minWidth: 220 }}>Coverage days</th>
                    <th style={{ width: 120 }}>Bids</th>
                    <th style={{ width: 180 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRanges.map((range) => {
                    const days = range.workingDays?.length
                      ? range.workingDays
                      : getDatesInRange(range.startDate, range.endDate);
                    const summary = bidSummary.get(range.id) ?? {
                      total: 0,
                      partial: 0,
                    };
                    const daySummary = buildCoverageSummary(days);
                    return (
                      <tr key={range.id}>
                        <td>
                          <div className="font-medium">
                            {formatDateLong(range.startDate)}
                            {range.endDate !== range.startDate && (
                              <>
                                {" "}– {formatDateLong(range.endDate)}
                              </>
                            )}
                          </div>
                          <div style={{ color: "var(--muted)", fontSize: 12 }}>
                            {range.classification}
                            {range.wing ? ` • ${range.wing}` : ""}
                            {range.awardAsBlock === false
                              ? " • Split awards allowed"
                              : ""}
                          </div>
                        </td>
                        <td>
                          <div>{daySummary.label}</div>
                          {daySummary.extra && (
                            <div style={{ color: "var(--muted)", fontSize: 12 }}>
                              {daySummary.extra}
                            </div>
                          )}
                        </td>
                        <td>
                          {summary.total === 0 ? (
                            <span style={{ color: "var(--muted)", fontSize: 12 }}>
                              No bids
                            </span>
                          ) : (
                            <div className="flex flex-col text-sm">
                              <span>
                                {summary.total} bid{summary.total === 1 ? "" : "s"}
                              </span>
                              {summary.partial > 0 && (
                                <span style={{ color: "var(--muted)" }}>
                                  {summary.partial} partial
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => onBid(range)}>
                              Bid
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => onAward(range)}
                            >
                              Award
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type CoverageSummary = { label: string; extra?: string };

function buildCoverageSummary(days: string[]): CoverageSummary {
  if (days.length === 0) {
    return { label: "No working days selected" };
  }
  if (days.length === 1) {
    const day = days[0];
    return {
      label: `${formatDowShort(day)} • ${formatDateLong(day)}`,
    };
  }
  const formatted = days.map(
    (day) => `${formatDowShort(day)} ${day.slice(5)}`,
  );
  const label = `${days.length} days`;
  if (formatted.length <= 4) {
    return { label, extra: formatted.join(", ") };
  }
  return {
    label,
    extra: `${formatted.slice(0, 4).join(", ")}, …`,
  };
}
