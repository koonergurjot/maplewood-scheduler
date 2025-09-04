import type { ReactNode } from "react";
import type { Vacancy, Settings } from "../../types";
import { deadlineFor, pickWindowMinutes, fmtCountdown } from "../../lib/vacancy";
import { minutesBetween } from "../../lib/dates";

export function CellSelect({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void; }) {
  return (
    <td className="cell-select">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </td>
  );
}

export function CellDetails({ children }: { children: ReactNode }) {
  return (
    <td>
      <div className="cell-details__wrap">{children}</div>
    </td>
  );
}

type CountdownProps = {
  vacancy: Vacancy;
  settings: Settings;
  now: number;
};

export function CellCountdown({ vacancy, settings, now }: CountdownProps) {
  const msLeft = deadlineFor(vacancy, settings).getTime() - now;
  const winMin = pickWindowMinutes(vacancy, settings);
  const sinceKnownMin = minutesBetween(new Date(), new Date(vacancy.knownAt));
  const pct = Math.max(0, Math.min(1, (winMin - sinceKnownMin) / winMin));
  let cdClass = "cd-green";
  if (msLeft <= 0) cdClass = "cd-red";
  else if (pct < 0.25) cdClass = "cd-yellow";

  return (
    <td className="cell-countdown">
      <span className={`countdown ${cdClass}`}>{fmtCountdown(msLeft)}</span>
    </td>
  );
}

export function CellActions({ children }: { children: ReactNode }) {
  return <td className="cell-actions">{children}</td>;
}

