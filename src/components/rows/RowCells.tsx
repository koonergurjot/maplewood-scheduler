import React from "react";
import type { Vacancy, Settings } from "../../types";
import { fmtCountdown, deadlineFor, pickWindowMinutes } from "../../lib/vacancy";
import { combineDateTime, minutesBetween } from "../../lib/dates";

export function CellSelect({checked,onChange,ariaLabel="Select row"}:{checked:boolean;onChange:()=>void;ariaLabel?:string}) {
  return <td className="cell-select"><input type="checkbox" checked={checked} onChange={onChange} aria-label={ariaLabel} /></td>;
}
export function CellDetails({title,subtitle,rightTag}:{title:React.ReactNode;subtitle?:React.ReactNode;rightTag?:React.ReactNode;}) {
  return (
    <td className="cell-details">
      <div className="cell-details__wrap">
        <div className="cell-details__left">
          <div className="cell-details__title">{title}</div>
          {subtitle && <div className="cell-details__subtitle">{subtitle}</div>}
        </div>
        {rightTag && <div className="cell-details__tag">{rightTag}</div>}
      </div>
    </td>
  );
}
export function CellCountdown({source,settings}:{source:Vacancy;settings:Settings}) {
  const now = Date.now();
  const deadline = deadlineFor(source, settings).getTime();
  const msLeft = deadline - now;
  const winMin = pickWindowMinutes(source, settings);
  const sinceKnownMin = minutesBetween(new Date(), new Date(source.knownAt));
  const pct = Math.max(0, Math.min(1, (winMin - sinceKnownMin) / winMin));
  let cdClass = "cd-green"; if (msLeft <= 0) cdClass = "cd-red"; else if (pct < 0.25) cdClass = "cd-yellow";
  return <td className="cell-countdown"><div className={`countdown ${cdClass}`}>{fmtCountdown(msLeft)}</div></td>;
}
export function CellActions({children}:{children:React.ReactNode}) {
  return <td className="cell-actions">{children}</td>;
}
