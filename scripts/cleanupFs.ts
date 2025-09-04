import { globby } from 'glob';
import fs from 'fs-extra';
import path from 'path';

type Action = 'deleteShadowJS' | 'moveUnused' | 'keep';
type Row = { action: Action; path: string; reason: string };

const SRC = path.resolve('src');
const TESTS = path.resolve('tests');
const APPLY = process.argv.includes('--apply');

const isSrc = (p: string) => p.startsWith(SRC) || p.startsWith(TESTS);
const isJs = (p: string) => /\.(jsx?|mjs|cjs)$/.test(p);
const isTs = (p: string) => /\.(tsx?|mts|cts)$/.test(p);
const base = (p: string) => p.replace(/\.(tsx?|jsx?|mts|cts|mjs|cjs)$/, '');

const IGNORED_FILES = new Set<string>([
  // keep configs and types
  path.resolve('src/config.ts'),
  path.resolve('src/types.ts'),
]);

(async () => {
  const all = await globby(['src/**/*.{ts,tsx,js,jsx}', 'tests/**/*.{ts,tsx,js,jsx}'], { dot: false });
  const byBase = new Map<string, string[]>();
  for (const p of all) {
    const b = base(path.resolve(p));
    const arr = byBase.get(b) || [];
    arr.push(path.resolve(p));
    byBase.set(b, arr);
  }

  const rows: Row[] = [];
  const toDelete = new Set<string>();

  // 1) detect JS shadows where TS exists for the same base
  for (const [b, files] of byBase) {
    const jses = files.filter(isJs);
   const tses = files.filter(isTs);
    if (jses.length && tses.length) {
      // Prefer TS; mark JS for delete if similar or clearly older
      for (const j of jses) {
        const t = tses[0];
        if (!t) continue;
        try {
          const jtxt = fs.readFileSync(j, 'utf8');
          const ttxt = fs.readFileSync(t, 'utf8');
          const sameish = jtxt.replace(/\s+/g,'') === ttxt.replace(/\s+/g,'');
          rows.push({ action: 'deleteShadowJS', path: j, reason: `Shadow of ${path.relative(process.cwd(), t)}` });
          toDelete.add(j);
        } catch (e) {
          rows.push({ action: 'keep', path: j, reason: `Read error: ${String(e)}` });
        }
      }
    } else {
      for (const p of files) rows.push({ action: 'keep', path: p, reason: 'No TS/JS duplication' });
    }
  }

  // 2) simple import graph to detect unused modules (TS-only)
  const tsFiles = all.filter(p => isTs(p));
  const imports = new Map<string, Set<string>>();
  const addEdge = (from: string, to: string) => {
    const s = imports.get(from) || new Set<string>();
    s.add(to);
    imports.set(from, s);
  };
  for (const f of tsFiles) {
    const txt = fs.readFileSync(f, 'utf8');
    const dir = path.dirname(f);
    const rx = /from\s+['"](.+?)['"]|require\(['"](.+?)['"]\)/g;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(txt))) {
      const spec = (m[1] || m[2])!;
      if (!spec.startsWith('.')) continue;
      const resolved = path.resolve(dir, spec).replace(/\.(tsx?|jsx?)$/, '');
      addEdge(f, resolved);
    }
  }
  const roots = tsFiles.filter(p =>
    /src\/(main|index)\.tsx?$/.test(p.replace(/\\/g,'/')) ||
    /src\/App\.tsx?$/.test(p.replace(/\\/g,'/'))
  ).map(p => base(path.resolve(p)));

  const reachable = new Set<string>();
  const dfs = (bpath: string) => {
    if (reachable.has(bpath)) return;
    reachable.add(bpath);
    const deps = imports.get(bpath) || new Set();
    deps.forEach(d => dfs(d));
  };
  roots.forEach(r => dfs(r));

  for (const f of tsFiles) {
    const b = base(path.resolve(f));
    if (!reachable.has(b) && isSrc(f) && !IGNORED_FILES.has(path.resolve(f))) {
      rows.push({ action: 'moveUnused', path: f, reason: 'Not reachable from roots' });
    }
  }

  // 3) fix imports ending in .js → extensionless
  const importFixes: string[] = [];
  for (const f of tsFiles) {
    let txt = fs.readFileSync(f, 'utf8');
    const orig = txt;
    txt = txt.replace(/from\s+['"](\.\/[^'\"]+)\.js['"]/g, "from '$1'");
    txt = txt.replace(/from\s+['"](\.\/[^'\"]+)\.jsx['"]/g, "from '$1'");
    if (txt !== orig) {
      fs.writeFileSync(f, txt, 'utf8');
      importFixes.push(f);
    }
  }

  // Output report
  const reportPath = path.resolve('cleanup-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(rows, null, 2));
  console.log(`\nWrote ${reportPath}\n`);
  console.table(rows.slice(0, 50));
  if (importFixes.length) console.log(`Fixed imports in:\n${importFixes.map(p => ' - ' + p).join('\n')}`);

  if (!APPLY) {
    console.log('\nDry-run only. Re-run with --apply to modify files.\n');
    return;
  }

  // Apply deletions and moves
  for (const r of rows) {
    if (r.action === 'deleteShadowJS') {
      await fs.remove(r.path);
    } else if (r.action === 'moveUnused') {
      const dest = path.resolve('legacy', path.relative(process.cwd(), r.path));
      await fs.ensureDir(path.dirname(dest));
      await fs.move(r.path, dest, { overwrite: true });
    }
  }
  console.log('\nApplied filesystem changes.\n');
})().catch(e => { console.error(e); process.exit(1); });
