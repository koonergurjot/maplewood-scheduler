export function parseCSV(text: string): any[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).filter(l => l.trim().length > 0).map(line => {
    const cells = line.split(",");
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      obj[header] = (cells[idx] ?? "").trim();
    });
    return obj;
  });
}
