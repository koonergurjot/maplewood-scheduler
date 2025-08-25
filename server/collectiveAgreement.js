import fs from "fs";
import pdfParse from "pdf-parse";

const uploadDir = new URL("./uploads", import.meta.url);
const storedPath = new URL("./uploads/agreement", import.meta.url);

let agreementText = "";
let agreementLines = [];
let agreementIndex = new Map();

export async function initAgreement() {
  try {
    if (fs.existsSync(storedPath)) {
      await loadAgreement(storedPath.pathname);
    }
  } catch (err) {
    console.error("Failed to initialize agreement", err);
  }
}

export async function loadAgreement(filePath) {
  const buffer = fs.readFileSync(filePath);
  // Detect PDFs by signature rather than relying on the file extension so
  // previously uploaded agreements without an extension can still be parsed
  // correctly on startup.
  const isPdf = buffer.slice(0, 4).toString() === "%PDF";
  if (isPdf) {
    const data = await pdfParse(buffer);
    agreementText = data.text;
  } else {
    agreementText = buffer.toString();
  }
  agreementLines = agreementText.split(/\r?\n/);
  agreementIndex = new Map();
  agreementLines.forEach((line, idx) => {
    const tokens = line.toLowerCase().split(/\W+/).filter(Boolean);
    for (const token of tokens) {
      if (!agreementIndex.has(token)) {
        agreementIndex.set(token, new Set());
      }
      agreementIndex.get(token).add(idx);
    }
  });
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.copyFileSync(filePath, storedPath);
}

export function searchAgreement(
  query,
  { caseSensitive = false, limit = 5, context = 1 } = {},
) {
  if (!agreementText) return [];
  const q = caseSensitive ? query : query.toLowerCase();
  let candidates;
  if (caseSensitive) {
    candidates = agreementLines.map((_, idx) => idx);
  } else {
    const tokens = q.split(/\W+/).filter(Boolean);
    const lineSet = new Set();
    for (const token of tokens) {
      const lines = agreementIndex.get(token);
      if (lines) {
        for (const idx of lines) lineSet.add(idx);
      }
    }
    candidates = Array.from(lineSet).sort((a, b) => a - b);
  }
  const results = [];
  for (const idx of candidates) {
    const line = agreementLines[idx];
    const haystack = caseSensitive ? line : line.toLowerCase();
    if (!line || !haystack.includes(q)) continue;
    const start = Math.max(0, idx - context);
    const end = Math.min(agreementLines.length, idx + context + 1);
    const ctx = agreementLines.slice(start, end);
    results.push({ lineNumber: idx + 1, line, context: ctx });
    if (results.length >= limit) break;
  }
  return results;
}
