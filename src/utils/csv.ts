import Papa from 'papaparse';

// Parses a CSV string into an array of objects keyed by header names.
export function parseCSV(input: string): Record<string, string>[] {
  const { data } = Papa.parse<Record<string, string>>(input, {
    header: true,
    skipEmptyLines: true,
  });

  return data as Record<string, string>[];
}

