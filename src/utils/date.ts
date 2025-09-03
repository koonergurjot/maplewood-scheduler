export function datesInRange(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  const start = new Date(startISO + "T00:00:00");
  const end = new Date(endISO + "T00:00:00");
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function isWeekday(iso: string): boolean {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

export function applyPattern4on2off(dates: string[]): string[] {
  const selected: string[] = [];
  let counter = 0;
  let on = true;
  for (const iso of dates) {
    if (on) selected.push(iso);
    counter++;
    if (on && counter === 4) {
      on = false;
      counter = 0;
    } else if (!on && counter === 2) {
      on = true;
      counter = 0;
    }
  }
  return selected;
}

export function applyPattern5on2off(dates: string[]): string[] {
  const selected: string[] = [];
  let counter = 0;
  let on = true;
  for (const iso of dates) {
    if (on) selected.push(iso);
    counter++;
    if (on && counter === 5) {
      on = false;
      counter = 0;
    } else if (!on && counter === 2) {
      on = true;
      counter = 0;
    }
  }
  return selected;
}
