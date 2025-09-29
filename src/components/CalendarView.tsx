
import React from "react";
import type { Vacancy } from "../types";
import type { Tag } from "../models/tag";
import { buildCalendar, isoDate, prevMonth, nextMonth } from "../lib/dates";
import { groupVacanciesByDate } from "../lib/vacancy";
import TagFilter from "./TagFilter";

export type CalendarVacancyActionContext = {
  vacancy: Vacancy;
  date: string;
  events: Vacancy[];
};

type VacancyActionHandler = (
  vacancyId: string,
  context: CalendarVacancyActionContext,
) => void;

type Props = {
  vacancies: Vacancy[];
  onCreateVacancy: () => void;
  onEditVacancy?: VacancyActionHandler;
  onDuplicateVacancy?: VacancyActionHandler;
  onDeleteVacancy?: VacancyActionHandler;
};

type Day = { date: Date; inMonth: boolean };

function monthLabel(y: number, m: number) {
  return new Date(y, m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function CalendarView({
  vacancies,
  onCreateVacancy,
  onEditVacancy,
  onDuplicateVacancy,
  onDeleteVacancy,
}: Props) {
  const today = React.useMemo(() => new Date(), []);
  const [y, setY] = React.useState(today.getFullYear());
  const [m, setM] = React.useState(today.getMonth());
  const [showHeatmap, setShowHeatmap] = React.useState(false);
  const [showFilled, setShowFilled] = React.useState(false);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);

  const days: Day[] = React.useMemo(() => buildCalendar(y, m), [y, m]);

  const allTags = React.useMemo<Tag[]>(() => {
    const map: Record<string, Tag> = {};
    for (const v of vacancies ?? []) {
      for (const t of v.tags ?? []) map[t.id] = t;
    }
    return Object.values(map);
  }, [vacancies]);

  const filteredVacancies = React.useMemo(() => {
    if (!selectedTags.length) return vacancies;
    return (vacancies || []).filter((v) =>
      v.tags?.some((t) => selectedTags.includes(t.id)),
    );
  }, [vacancies, selectedTags]);

  // Group events by ISO yyyy-mm-dd
  const eventsByDate = React.useMemo(() => {
    const map: Record<string, Vacancy[]> = {};
    const grouped = groupVacanciesByDate(filteredVacancies ?? []);
    for (const [d, arr] of grouped.entries()) {
      map[d] = arr;
    }
    return map;
  }, [filteredVacancies]);

  const todayIso = isoDate(today);
  const todaysEvents = eventsByDate[todayIso] || [];
  const visibleToday = todaysEvents.filter(
    (e: any) => (e as any).status === "Open",
  );
  const openToday = visibleToday.length;
  const awardedToday = todaysEvents.filter(
    (e: any) => (e as any).status === "Awarded",
  ).length;
  const filledToday = todaysEvents.filter(
    (e: any) => (e as any).status === "Filled",
  ).length;

  const weekdayShort = new Intl.DateTimeFormat(undefined, { weekday: "short" });

  return (
    <div style={{ display: "flex", gap: 16 }}>
      <aside style={{ minWidth: 180 }}>
        <TagFilter
          tags={allTags}
          selected={selectedTags}
          onChange={setSelectedTags}
        />
      </aside>
      <div style={{ flex: 1 }}>
      <div className="calendar-mini-toolbar" role="toolbar">
        <div className="counts" aria-live="polite">
          <div className="count"><span className="badge badge-open">{openToday}</span> Open today</div>
          <div className="count"><span className="badge badge-awarded">{awardedToday}</span> Awarded today</div>
          <div className="count"><span className="badge badge-filled">{filledToday}</span> Filled today</div>
        </div>
        <div className="actions">
          <button className="calendar-btn" onClick={() => { setY(today.getFullYear()); setM(today.getMonth()); }} aria-label="Jump to today">Jump to Today</button>
          <button
            className="calendar-btn"
            onClick={onCreateVacancy}
            aria-label="Create new vacancy"
          >
            New Vacancy
          </button>
          <button className="calendar-btn" onClick={() => setShowHeatmap((h) => !h)} aria-pressed={showHeatmap} aria-label="Toggle heatmap">Toggle Heatmap</button>
          <button className="calendar-btn" onClick={() => setShowFilled((f) => !f)} aria-pressed={showFilled} aria-label="Show awarded and filled shifts">Show Awarded/Filled</button>
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
            const allEvents = React.useMemo<Vacancy[]>(
              () => eventsByDate[iso] || [],
              // eslint-disable-next-line react-hooks/exhaustive-deps
              [eventsByDate, iso],
            );

            const { open, awarded, filled, visible } = React.useMemo(
              () =>
                allEvents.reduce(
                  (acc, e: Vacancy) => {
                    const status = (e as any).status || "Open";
                    if (status === "Open") {
                      acc.open++;
                      acc.visible.push(e);
                    } else if (status === "Awarded") acc.awarded++;
                    else if (status === "Filled") acc.filled++;
                    return acc;
                  },
                  { open: 0, awarded: 0, filled: 0, visible: [] as Vacancy[] },
                ),
              [allEvents],
            );

          const events = showFilled ? allEvents : visible;
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
                  {awarded ? <span className="badge badge-awarded" title="Awarded">{awarded}</span> : null}
                  {filled ? <span className="badge badge-filled" title="Filled">{filled}</span> : null}
                </div>
              </div>
              <div className="events">
                {events.slice(0, 4).map((e: Vacancy, idx: number) => {
                  const status = (e as any).status || "Open";
                  return (
                    <div
                      key={idx}
                      className="event-pill has-tooltip"
                      data-status={status}
                      data-wing={(e as any).wing || undefined}
                      data-class={(e as any).classification || undefined}
                    >
                      <div className="event-tags" style={{ display: "flex", gap: 2 }}>
                        {(e.tags || []).map((t) => (
                          <span
                            key={t.id}
                            title={t.label}
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              backgroundColor: t.color,
                              display: "inline-block",
                            }}
                          />
                        ))}
                      </div>
                      <div>
                        <strong>{(e as any).shiftStart ?? ""}–{(e as any).shiftEnd ?? ""}</strong>
                        <span className="event-meta"> {(e as any).wing ?? ""} {(e as any).classification ?? ""}</span>
                      </div>
                      <span className="event-meta">{status}</span>
                      <div className="event-actions" style={{ display: "none" }}>
                        <button
                          aria-label="Edit"
                          onClick={() =>
                            onEditVacancy?.(e.id, { vacancy: e, date: iso, events })
                          }
                        >
                          ✎
                        </button>
                        <button
                          aria-label="Duplicate"
                          onClick={() =>
                            onDuplicateVacancy?.(e.id, {
                              vacancy: e,
                              date: iso,
                              events,
                            })
                          }
                        >
                          ⧉
                        </button>
                        <button
                          aria-label="Delete"
                          onClick={() =>
                            onDeleteVacancy?.(e.id, { vacancy: e, date: iso, events })
                          }
                        >
                          🗑
                        </button>
                      </div>
                      <div className="tooltip" role="tooltip">
                        <div className="title">Shift details</div>
                        <div className="line">Wing: {(e as any).wing ?? "—"}</div>
                        <div className="line">Class: {(e as any).classification ?? "—"}</div>
                        <div className="line">Time: {(e as any).shiftStart ?? "—"}–{(e as any).shiftEnd ?? "—"}</div>
                        { (e as any).employee ? <div className="line">Assigned: {(e as any).employee}</div> : null }
                        { (e as any).notes ? <div className="line">Notes: {(e as any).notes}</div> : null }
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
      </div>
    </div>
  );
}
