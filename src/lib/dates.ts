export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const DEFAULT_TZ = "America/Vancouver";

export const combineDateTime = (dateISO: string, timeHHmm: string) =>
  new Date(`${dateISO}T${timeHHmm}:00`);

/**
 * Combine date+time in an IANA time zone, returning a Date for the correct instant
 * with DST handled.
 */
export const combineDateTimeTZ = (dateISO: string, timeHHmm: string, timeZone: string = DEFAULT_TZ) => {
  try {
    const [y, m, d] = dateISO.split("-").map((n) => Number(n));
    const [H, M] = timeHHmm.split(":").map((n) => Number(n));
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const targetKey = `${String(y).padStart(4,"0")}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}T${String(H).padStart(2,"0")}:${String(M).padStart(2,"0")}`;
    const base = Date.UTC(y, m - 1, d, H, M);
    const candidates = [0, -1, 1, -2, 2].map((h) => new Date(base + h * 3600000));
    const keyOf = (dt: Date) => {
      const parts = Object.fromEntries(formatter.formatToParts(dt).map((p) => [p.type, p.value]));
      return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
    };
    for (const c of candidates) {
      if (keyOf(c) === targetKey) return c;
    }
    // Fallback: parse string in tz
    const tzString = new Date(base).toLocaleString("en-CA", { timeZone });
    return new Date(Date.parse(tzString));
  } catch {
    return new Date(`${dateISO}T${timeHHmm}:00`);
  }
};

export const formatDateLong = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });

export const formatDowShort = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
  });

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

export const prevMonth = (
  setY: (y: number) => void,
  setM: (m: number) => void,
  y: number,
  m: number,
) => {
  if (m === 0) {
    setY(y - 1);
    setM(11);
  } else setM(m - 1);
};

export const nextMonth = (
  setY: (y: number) => void,
  setM: (m: number) => void,
  y: number,
  m: number,
) => {
  if (m === 11) {
    setY(y + 1);
    setM(0);
  } else setM(m + 1);
};

export const minutesBetween = (a: Date, b: Date) =>
  Math.round(Math.abs(a.getTime() - b.getTime()) / 60000);

