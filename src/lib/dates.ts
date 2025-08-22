export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const combineDateTime = (dateISO: string, timeHHmm: string) =>
  new Date(`${dateISO}T${timeHHmm}:00`);

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
  Math.round((a.getTime() - b.getTime()) / 60000);

