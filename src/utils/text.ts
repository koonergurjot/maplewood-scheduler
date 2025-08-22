export const matchText = (q: string, label: string) =>
  q.trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every(p => label.toLowerCase().includes(p));

export function parseCSV(text: string){
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [] as any[];
  const headers = lines.shift()!.split(",").map(h=>h.trim());
  return lines.filter(Boolean).map(line => {
    const values = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => row[h] = values[i]?.trim() ?? "");
    return row;
  });
}
