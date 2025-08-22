import type { Vacancy, Settings } from '../types';

export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

export const combineDateTime = (dateISO: string, timeHHmm: string) => new Date(`${dateISO}T${timeHHmm}:00`);

export const formatDateLong = (iso: string) =>
  new Date(iso+"T00:00:00").toLocaleDateString(undefined, { month: "long", day: "2-digit", year: "numeric" });

export const formatDowShort = (iso: string) =>
  new Date(iso+"T00:00:00").toLocaleDateString(undefined, { weekday: "short" });

export const matchText = (q: string, label: string) =>
  q.trim().toLowerCase().split(/\s+/).filter(Boolean).every(p => label.toLowerCase().includes(p));

export const buildCalendar = (year:number, month:number) => {
  const first = new Date(year, month, 1);
  const start = new Date(first); start.setDate(first.getDate() - first.getDay());
  const days: {date: Date; inMonth: boolean}[] = [];
  for(let i=0;i<42;i++){ const d=new Date(start); d.setDate(start.getDate()+i); days.push({date:d,inMonth:d.getMonth()===month}); }
  return days;
};

export const prevMonth = (setY:Function,setM:Function,y:number,m:number)=>{ if(m===0){setY(y-1); setM(11);} else setM(m-1); };
export const nextMonth = (setY:Function,setM:Function,y:number,m:number)=>{ if(m===11){setY(y+1); setM(0);} else setM(m+1); };

export const displayVacancyLabel = (v: Vacancy) => {
  const d = formatDateLong(v.shiftDate);
  return `${d} • ${v.shiftStart}–${v.shiftEnd} • ${v.wing ?? ''} • ${v.classification}`.replace(/\s+•\s+$/, "");
};

export function minutesBetween(a: Date, b: Date){ return Math.round((a.getTime() - b.getTime())/60000); }

export function pickWindowMinutes(v: Vacancy, settings: Settings){
  const known = new Date(v.knownAt);
  const shiftStart = combineDateTime(v.shiftDate, v.shiftStart);
  const hrsUntilShift = (shiftStart.getTime() - known.getTime()) / 3_600_000;
  if (hrsUntilShift < 2) return settings.responseWindows.lt2h;
  if (hrsUntilShift < 4) return settings.responseWindows.h2to4;
  if (hrsUntilShift < 24) return settings.responseWindows.h4to24;
  if (hrsUntilShift < 72) return settings.responseWindows.h24to72;
  return settings.responseWindows.gt72;
}

export function deadlineFor(v: Vacancy, settings: Settings){
  const winMin = pickWindowMinutes(v, settings);
  return new Date(new Date(v.knownAt).getTime() + winMin*60000);
}

export function fmtCountdown(msLeft: number){
  const neg = msLeft < 0; const abs = Math.abs(msLeft);
  const totalSec = Math.floor(abs/1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const core = d>0 ? `${d}d ${h}h` : h>0 ? `${h}h ${m}m` : `${m}m ${s}s`;
  return neg ? `Due ${core} ago` : core;
}

export const applyAwardVacancy = (
  vacs: Vacancy[],
  vacId: string,
  payload: { empId?: string; reason?: string; overrideUsed?: boolean }
): Vacancy[] => {
  const empId = payload.empId === 'EMPTY' ? undefined : payload.empId;
  return vacs.map<Vacancy>(v =>
    v.id === vacId
      ? {
          ...v,
          status: 'Awarded',
          awardedTo: empId,
          awardedAt: new Date().toISOString(),
          awardReason: payload.reason ?? '',
          overrideUsed: !!payload.overrideUsed,
        }
      : v
  );
};

export function dateRangeInclusive(startISO: string, endISO: string){
  const out: string[] = [];
  const s = new Date(startISO+"T00:00:00");
  const e = new Date(endISO+"T00:00:00");
  for (let d = new Date(s); d <= e; d.setDate(d.getDate()+1)) out.push(isoDate(d));
  return out;
}
