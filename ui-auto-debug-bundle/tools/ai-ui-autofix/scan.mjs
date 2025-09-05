import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const ROUTES = ['/', '/dashboard', '/analytics', '/audit-log'];
const WIDTHS = [360, 768, 1280];

const outDir = path.resolve('tools/ai-ui-autofix');
const outPath = path.join(outDir, 'report.json');
await fs.promises.mkdir(outDir, { recursive: true });

function pushIssue(arr, route, width, type, details) {
  arr.push({ route, width, type, details });
}

const browser = await chromium.launch();
const page = await browser.newPage();
const issues = [];

for (const w of WIDTHS) {
  await page.setViewportSize({ width: w, height: 900 });
  for (const r of ROUTES) {
    const url = new URL(r, BASE_URL).toString();
    try {
      const messages = [];
      page.on('console', (m) => { if (m.type() === 'error') messages.push(m.text()); });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      let axeViolations = [];
      try {
        const axe = await new AxeBuilder({ page }).analyze();
        axeViolations = axe.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help }));
      } catch {}
      const data = await page.evaluate(() => {
        const vw = window.innerWidth;
        const docScrollW = document.documentElement.scrollWidth;
        const overflowX = docScrollW > vw;
        return { overflowX };
      });
      if (messages.length) pushIssue(issues, r, w, 'console-error', { messages });
      if (data.overflowX) pushIssue(issues, r, w, 'overflow-x', {});
      if (axeViolations.length) pushIssue(issues, r, w, 'a11y', { violations: axeViolations.slice(0,10) });
    } catch (err) {
      pushIssue(issues, r, w, 'navigation-failed', { error: String(err) });
    }
  }
}
await browser.close();
const report = { baseUrl: BASE_URL, routes: ROUTES, widths: WIDTHS, issuesTotal: issues.length, generatedAt: new Date().toISOString(), issues };
await fs.promises.writeFile(outPath, JSON.stringify(report, null, 2), 'utf-8');
console.log(`Wrote ${outPath} with ${issues.length} issues`);