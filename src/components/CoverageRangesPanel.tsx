import type { VacancyRange } from "../types";

type Props = {
  ranges: VacancyRange[];
};

export default function CoverageRangesPanel({ ranges }: Props) {
  if (!ranges.length) return null;

  return (
    <div className="grid">
      <div className="card">
        <div className="card-h">Saved Multi-day Ranges</div>
        <div className="card-c" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ranges.map((range) => (
            <div key={range.id} className="pill" style={{ alignSelf: "flex-start" }}>
              {range.startDate} → {range.endDate} • {range.classification}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
