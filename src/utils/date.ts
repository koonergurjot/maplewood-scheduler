export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

export const combineDateTime = (dateISO: string, timeHHmm: string) => new Date(`${dateISO}T${timeHHmm}:00`);

export const buildCalendar = (year: number, month: number) => {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const days: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({ date: d, inMonth: d.getMonth() === month });
  }
  return days;
};

export const prevMonth = (setY: (n: number) => void, setM: (n: number) => void, y: number, m: number) => {
  if (m === 0) {
    setY(y - 1);
    setM(11);
  } else setM(m - 1);
};

export const nextMonth = (setY: (n: number) => void, setM: (n: number) => void, y: number, m: number) => {
  if (m === 11) {
    setY(y + 1);
    setM(0);
  } else setM(m + 1);
};

export function minutesBetween(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 60000);
}

interface SettingsLike {
  responseWindows: { lt2h: number; h2to4: number; h4to24: number; h24to72: number; gt72: number };
}

interface VacancyLike {
  knownAt: string;
  shiftDate: string;
  shiftStart: string;
}

export function pickWindowMinutes(v: VacancyLike, settings: SettingsLike) {
  const known = new Date(v.knownAt);
  const shiftStart = combineDateTime(v.shiftDate, v.shiftStart);
  const hrsUntilShift = (shiftStart.getTime() - known.getTime()) / 3_600_000;
  if (hrsUntilShift < 2) return settings.responseWindows.lt2h;
  if (hrsUntilShift < 4) return settings.responseWindows.h2to4;
  if (hrsUntilShift < 24) return settings.responseWindows.h4to24;
  if (hrsUntilShift < 72) return settings.responseWindows.h24to72;
  return settings.responseWindows.gt72;
}

export function deadlineFor(v: VacancyLike, settings: SettingsLike) {
  const winMin = pickWindowMinutes(v, settings);
  return new Date(new Date(v.knownAt).getTime() + winMin * 60000);
}

export function dateRangeInclusive(startISO: string, endISO: string) {
  const out: string[] = [];
  const s = new Date(startISO + "T00:00:00");
  const e = new Date(endISO + "T00:00:00");
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) out.push(isoDate(d));
  return out;
}
