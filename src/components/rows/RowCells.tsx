import React from "react";
import type { Vacancy, Settings } from "../../types";
import { fmtCountdown, deadlineFor, pickWindowMinutes } from "../../lib/vacancy";
import { minutesBetween } from "../../lib/dates";

export type CellComponent = "td" | "div";

function cellClass(component: CellComponent, base: string) {
  return component === "div" ? `vac-table__cell ${base}` : base;
}

function cellRole(component: CellComponent, role: "cell" | "columnheader" = "cell") {
  return component === "div" ? role : undefined;
}

export function CellSelect({
  checked,
  onChange,
  ariaLabel = "Select row",
  component = "td",
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
  component?: CellComponent;
}) {
  const Element = component as keyof JSX.IntrinsicElements;
  return (
    <Element className={cellClass(component, "cell-select")} role={cellRole(component)}>
      <input type="checkbox" checked={checked} onChange={onChange} aria-label={ariaLabel} />
    </Element>
  );
}

export function CellDetails({
  title,
  subtitle,
  rightTag,
  component = "td",
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  rightTag?: React.ReactNode;
  component?: CellComponent;
}) {
  const Element = component as keyof JSX.IntrinsicElements;
  return (
    <Element className={cellClass(component, "cell-details")} role={cellRole(component)}>
      <div className="cell-details__wrap">
        <div className="cell-details__left">
          <div className="cell-details__title">{title}</div>
          {subtitle && <div className="cell-details__subtitle">{subtitle}</div>}
        </div>
        {rightTag && <div className="cell-details__tag">{rightTag}</div>}
      </div>
    </Element>
  );
}

export function CellCountdown({
  source,
  settings,
  component = "td",
}: {
  source: Vacancy;
  settings: Settings;
  component?: CellComponent;
}) {
  const now = Date.now();
  const deadline = deadlineFor(source, settings).getTime();
  const msLeft = deadline - now;
  const winMin = pickWindowMinutes(source, settings);
  const sinceKnownMin = minutesBetween(new Date(), new Date(source.knownAt));
  const pct = Math.max(0, Math.min(1, (winMin - sinceKnownMin) / winMin));
  let cdClass = "cd-green";
  if (msLeft <= 0) cdClass = "cd-red";
  else if (pct < 0.25) cdClass = "cd-yellow";
  const Element = component as keyof JSX.IntrinsicElements;
  return (
    <Element
      className={cellClass(component, "cell-countdown")}
      role={cellRole(component)}
      style={
        component === "td"
          ? { whiteSpace: "nowrap", textAlign: "center", verticalAlign: "middle" }
          : undefined
      }
    >
      <div className={`countdown ${cdClass}`}>{fmtCountdown(msLeft)}</div>
    </Element>
  );
}

export function CellActions({
  children,
  component = "td",
}: {
  children: React.ReactNode;
  component?: CellComponent;
}) {
  const Element = component as keyof JSX.IntrinsicElements;
  return (
    <Element
      className={cellClass(component, "cell-actions")}
      role={cellRole(component)}
      style={component === "td" ? { textAlign: "center", verticalAlign: "middle" } : undefined}
    >
      {children}
    </Element>
  );
}
