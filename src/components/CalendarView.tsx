import { useMemo, useState } from "react";
import type { Vacancy } from "../App";
import type { CalendarVacancy } from "../types/vacancy";
import {
  buildCalendar,
  isoDate,
  combineDateTime,
  prevMonth,
  nextMonth,
} from "../lib/dates";

export default function CalendarView({
  vacancies,
}: {
  vacancies: Vacancy[];
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const days = useMemo(() => buildCalendar(year, month), [year, month]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarVacancy[]> = {};
    for (const v of vacancies) {
      const start = combineDateTime(v.shiftDate, v.shiftStart).toISOString();
      const end = combineDateTime(v.shiftDate, v.shiftEnd).toISOString();
      const cv: CalendarVacancy = { ...v, start, end };
      (map[v.shiftDate] ??= []).push(cv);
    }
    return map;
  }, [vacancies]);

  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <button onClick={() => prevMonth(setYear, setMonth, year, month)}>
          &lt;
        </button>
        <span>{monthLabel}</span>
        <button onClick={() => nextMonth(setYear, setMonth, year, month)}>
          &gt;
        </button>
      </div>
      <div className="calendar-grid">
        {days.map(({ date, inMonth }) => {
          const iso = isoDate(date);
          const events = eventsByDate[iso] || [];
          return (
            <div
              key={iso}
              className={`calendar-cell${inMonth ? "" : " dim"}`}
            >
              <div className="date-label">{date.getDate()}</div>
              {events.map((e) => (
                <div
                  key={e.id}
                  className={`vacancy-block ${
                    e.status === "Awarded" ? "awarded" : "open"
                  }`}
                >
                  {e.shiftStart}–{e.shiftEnd} {e.wing ?? ""} {e.classification}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
