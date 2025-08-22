// Parses a CSV string into an array of objects keyed by header names.
export function parseCSV(input: string): Record<string, string>[] {
  const lines = input.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = splitLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const values = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

// Splits a single CSV line accounting for quoted values and escapes.
function splitLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  let fieldWasQuoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
        if (inQuotes) fieldWasQuoted = true;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(fieldWasQuoted ? current : current.trim());
      current = "";
      fieldWasQuoted = false;
    } else {
      if (!inQuotes && fieldWasQuoted && (char === ' ' || char === '\t')) {
        continue;
      }
      current += char;
    }
  }
  result.push(fieldWasQuoted ? current : current.trim());
  return result;
}
