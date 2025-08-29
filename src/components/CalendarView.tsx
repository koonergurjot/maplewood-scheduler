
import React from "react";
import { useNavigate } from "react-router-dom";
import type { CalendarEvent } from "../types/calendar";
import { buildCalendar, isoDate, prevMonth, nextMonth } from "../lib/dates";

type Props = { vacancies: CalendarEvent[] };

type Day = { date: Date; inMonth: boolean };

function monthLabel(y: number, m: number) {
  return new Date(y, m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function CalendarView({ vacancies }: Props) {
  const navigate = useNavigate();
  const today = React.useMemo(() => new Date(), []);
  const [y, setY] = React.useState(today.getFullYear());
  const [m, setM] = React.useState(today.getMonth());
  const [showHeatmap, setShowHeatmap] = React.useState(false);
  const [showFilled, setShowFilled] = React.useState(false);

  const days: Day[] = React.useMemo(() => buildCalendar(y, m), [y, m]);

  // Group events by ISO yyyy-mm-dd
  const eventsByDate = React.useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const v of vacancies ?? []) {
      const d = v.date;
      if (!d) continue;
      (map[d] ||= []).push(v);
    }
    return map;
  }, [vacancies]);

  const todayIso = isoDate(today);
  const todaysEvents = eventsByDate[todayIso] || [];
  const visibleToday = todaysEvents.filter(
    (e) => e.status !== "Filled" && e.status !== "Awarded",
  );
  const openToday = visibleToday.filter((e) => e.status === "Open").length;
  const pendingToday = visibleToday.filter((e) => e.status === "Pending").length;
  const filledToday = todaysEvents.filter(
    (e) => e.status === "Filled" || e.status === "Awarded",
  ).length;

  const weekdayShort = new Intl.DateTimeFormat(undefined, { weekday: "short" });

  return (
    <>
      <div className="calendar-mini-toolbar" role="toolbar">
        <div className="counts" aria-live="polite">
          <div className="count"><span className="badge badge-open">{openToday}</span> Open today</div>
          <div className="count"><span className="badge badge-pending">{pendingToday}</span> Pending today</div>
          <div className="count"><span className="badge badge-filled">{filledToday}</span> Filled today</div>
        </div>
        <div className="actions">
          <button className="calendar-btn" onClick={() => { setY(today.getFullYear()); setM(today.getMonth()); }} aria-label="Jump to today">Jump to Today</button>
          <button className="calendar-btn" onClick={() => navigate("/vacancies/new")} aria-label="Create new vacancy">New Vacancy</button>
          <button className="calendar-btn" onClick={() => setShowHeatmap((h) => !h)} aria-pressed={showHeatmap} aria-label="Toggle heatmap">Toggle Heatmap</button>
          <button className="calendar-btn" onClick={() => setShowFilled((f) => !f)} aria-pressed={showFilled} aria-label="Show filled shifts">Show Filled</button>
        </div>
      </div>

      <section className="calendar" aria-label="Calendar">
      <div className="calendar-toolbar">
        <div className="controls">
          <button className="calendar-btn" onClick={() => prevMonth(setY, setM, y, m)} aria-label="Previous month">◀</button>
          <button className="calendar-btn" onClick={() => { setY(today.getFullYear()); setM(today.getMonth()); }} aria-label="Jump to today">Today</button>
          <button className="calendar-btn" onClick={() => nextMonth(setY, setM, y, m)} aria-label="Next month">▶</button>
        </div>
        <div className="month-label">{monthLabel(y, m)}</div>
        <div style={{ width: 90 }} />{/* spacer */}
      </div>

      <div className="calendar-weekdays">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i}>{weekdayShort.format(new Date(2025, 0, i + 5)) /* stable labels Sun..Sat */}</div>
        ))}
      </div>

      <div className={"calendar-grid" + (showHeatmap ? " heatmap" : "") }>
        {days.map((d) => {
          const iso = isoDate(d.date);
          const allEvents = eventsByDate[iso] || [];
          const events = showFilled
            ? allEvents
            : allEvents.filter(
                (e) => e.status !== "Filled" && e.status !== "Awarded",
              );
          const open = events.filter((e) => e.status === "Open").length;
          const pending = events.filter((e) => e.status === "Pending").length;
          const filled = allEvents.filter(
            (e) => e.status === "Filled" || e.status === "Awarded",
          ).length;
          return (
            <div
              key={iso}
              className={"day-cell" + (d.inMonth ? "" : " outside")}
              aria-label={iso}
              style={{ ["--event-count" as any]: events.length }}
            >
              <div className="day-head">
                <div>{d.date.getDate()}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {open ? <span className="badge badge-open" title="Open">{open}</span> : null}
                  {pending ? <span className="badge badge-pending" title="Pending">{pending}</span> : null}
                  {filled ? <span className="badge badge-filled" title="Filled">{filled}</span> : null}
                </div>
              </div>
              <div className="events">
                {events.slice(0, 4).map((e, idx) => {
                  const status = e.status === "Awarded" ? "Filled" : e.status || "Open";
                  return (
                    <div
                      key={idx}
                      className="event-pill has-tooltip"
                      data-status={status}
                      data-wing={e.wing || undefined}
                      data-class={e.classification || undefined}
                    >
                      <div>
                        <strong>{e.shiftStart ?? ""}–{e.shiftEnd ?? ""}</strong>
                        <span className="event-meta"> {e.wing ?? ""} {e.classification ?? ""}</span>
                      </div>
                      <span className="event-meta">{status}</span>
                      <div className="tooltip" role="tooltip">
                        <div className="title">Shift details</div>
                        <div className="line">Wing: {e.wing ?? "—"}</div>
                        <div className="line">Class: {e.classification ?? "—"}</div>
                        <div className="line">Time: {e.shiftStart ?? "—"}–{e.shiftEnd ?? "—"}</div>
                        {e.employee ? <div className="line">Assigned: {e.employee}</div> : null}
                        {e.notes ? <div className="line">Notes: {e.notes}</div> : null}
                      </div>
                    </div>
                  );
                })}
                {events.length > 4 ? <div className="event-meta">+{events.length - 4} more…</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
    </>
  );
}
