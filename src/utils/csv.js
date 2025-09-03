import Papa from "papaparse";
// Parses a CSV string into an array of objects keyed by header names.
export function parseCSV(input) {
    const results = Papa.parse(input, {
        header: true,
        skipEmptyLines: true,
    });
    if (results.errors.length > 0) {
        const firstError = results.errors[0];
        throw new Error(`CSV parsing error on row ${firstError.row}: ${firstError.message}`);
    }
    return results.data;
}
