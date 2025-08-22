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

export const matchText = (q: string, label: string) =>
  q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((p) => label.toLowerCase().includes(p));

export function fmtCountdown(msLeft: number) {
  const neg = msLeft < 0;
  const abs = Math.abs(msLeft);
  const totalSec = Math.floor(abs / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const core =
    d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
  return neg ? `Due ${core} ago` : core;
}

export const displayVacancyLabel = (v: {
  shiftDate: string;
  shiftStart: string;
  shiftEnd: string;
  wing?: string;
  classification: string;
}) => {
  const d = formatDateLong(v.shiftDate);
  return `${d} • ${v.shiftStart}–${v.shiftEnd} • ${v.wing ?? ""} • ${v.classification}`.replace(/\s+•\s+$/, "");
};
