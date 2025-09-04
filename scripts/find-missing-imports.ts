import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const exts = [".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts", "/index.jsx", "/index.js"];

function read(p: string) {
  try { return fs.readFileSync(p, "utf8"); } catch { return ""; }
}

function resolveRel(fromFile: string, spec: string) {
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const ext of exts) {
    const p = base + ext;
    if (fs.existsSync(p)) return { found: true, path: p };
  }
  return { found: false, path: base };
}

function walk(dir: string, acc: string[] = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) walk(p, acc);
    else if (/\.(tsx?|jsx?)$/.test(p)) acc.push(p);
  }
  return acc;
}

const files = walk(path.join(ROOT, "src"));
const missing: Array<{ from: string; spec: string; guess: string }> = [];
const caseMismatches: Array<{ from: string; spec: string; actual: string }> = [];
const jsShadow: Array<{ base: string; js: string; ts: string }> = [];

for (const f of files) {
  const src = read(f);
  const re = /from\s+['"](.+?)['"]|require\(['"](.+?)['"]\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const spec = (m[1] || m[2])!;
    if (!spec.startsWith(".")) continue; // skip node/alias imports
    const { found, path: guess } = resolveRel(f, spec);
    if (!found) {
      missing.push({ from: f, spec, guess });
    } else {
      // case sensitivity check
      const actualDir = path.dirname(guess);
      const targetBase = path.basename(guess);
      const listing = new Set(fs.readdirSync(actualDir));
      if (!listing.has(targetBase)) {
        // same name ignoring case?
        const alt = Array.from(listing).find(n => n.toLowerCase() === targetBase.toLowerCase());
        if (alt) caseMismatches.push({ from: f, spec, actual: path.join(actualDir, alt) });
      }
    }
  }
}

// JS/TS shadow detection
const byBase = new Map<string, string[]>();
for (const f of files) {
  const b = f.replace(/\.(tsx?|jsx?)$/, "");
  byBase.set(b, [...(byBase.get(b) || []), f]);
}
for (const [b, arr] of byBase) {
  const js = arr.find(p => /\.(jsx?)$/.test(p));
  const ts = arr.find(p => /\.(tsx?)$/.test(p));
  if (js && ts) jsShadow.push({ base: b, js, ts });
}

if (missing.length) {
  console.log("\n=== Missing relative modules ===");
  for (const row of missing) console.log(`- ${row.from} imports '${row.spec}' → not found (tried: ${row.guess}{${exts.join(", ")}})`);
} else {
  console.log("\nNo missing relative imports detected.");
}

if (caseMismatches.length) {
  console.log("\n=== Case-sensitive path mismatches (Linux/Netlify will fail) ===");
  for (const row of caseMismatches) console.log(`- ${row.from} imports '${row.spec}' but actual file is: ${row.actual}`);
}

if (jsShadow.length) {
  console.log("\n=== JS/TS shadow pairs (prefer TS, delete JS) ===");
  for (const row of jsShadow) console.log(`- ${row.base}.* → JS: ${row.js}  TS: ${row.ts}`);
}

console.log("\nScan complete.\n");
