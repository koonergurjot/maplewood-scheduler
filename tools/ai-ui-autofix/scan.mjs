/* tools/ai-ui-autofix/scan.mjs
   Text-only UI scanner for Playwright + axe-core.
   No screenshots. Outputs JSON report at tools/ai-ui-autofix/report.json
*/
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

// In CI we set BASE_URL via the workflow env; locally you can override too.
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// Adjust these to match your app routes
const ROUTES = ['/', '/dashboard', '/analytics', '/audit-log'];

// Viewport widths to check (mobile, tablet, desktop)
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

      // Try to navigate
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Run axe-core a11y analysis
      let axeViolations = [];
      try {
        const axe = await new AxeBuilder({ page }).analyze();
        axeViolations = axe.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help }));
      } catch {}

      // Heuristics for common UI problems
      const data = await page.evaluate(() => {
        const vw = window.innerWidth;
        const docScrollW = document.documentElement.scrollWidth;
        const overflowX = docScrollW > vw;

        const fixedLike = Array.from(document.querySelectorAll('*'))
          .filter(el => ['fixed','sticky'].includes(getComputedStyle(el).position));
        const header = fixedLike.find(el => el.matches('header, .header, .section-h, .nav'));
        const firstContent = document.body.querySelector('.container, main, .card, .grid, table, .content, [role="main"]');

        let headerOverlap = false;
        if (header && firstContent) {
          const hb = header.getBoundingClientRect();
          const cb = firstContent.getBoundingClientRect();
          headerOverlap = hb.bottom > cb.top + 2;
        }

        const offscreen = [];
        for (const el of Array.from(document.body.querySelectorAll('*'))) {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          const b = el.getBoundingClientRect();
          if (!Number.isFinite(b.left) || !Number.isFinite(b.right)) continue;
          if (b.left < -4 || b.right > vw + 4) {
            offscreen.push({ tag: el.tagName.toLowerCase(), class: (el.className || '').toString().slice(0, 60) });
            if (offscreen.length > 15) break;
          }
        }

        const modal = document.querySelector('.modal');
        const hasOverlay = document.querySelector('.modal-overlay');
        let bodyScrollLocked = true;
        if (modal) {
          bodyScrollLocked = getComputedStyle(document.body).overflow === 'hidden';
        }
        const modalHasRole = modal ? (modal.getAttribute('role') === 'dialog' && modal.getAttribute('aria-modal') === 'true') : null;

        const menus = Array.from(document.querySelectorAll('.menu'));
        let menuCovered = false;
        if (header && menus.length) {
          const hb = header.getBoundingClientRect();
          for (const m of menus) {
            const mb = m.getBoundingClientRect();
            if (hb.bottom > mb.top && hb.top < mb.bottom) {
              menuCovered = true;
              break;
            }
          }
        }

        return {
          vw,
          overflowX,
          headerOverlap,
          offscreen,
          modalOpen: !!modal,
          hasOverlay: !!hasOverlay,
          bodyScrollLocked,
          modalHasRole,
          menuCovered,
        };
      });

      if (messages.length) pushIssue(issues, r, w, 'console-error', { messages });
      if (data.overflowX) pushIssue(issues, r, w, 'overflow-x', {});
      if (data.headerOverlap) pushIssue(issues, r, w, 'header-overlap', {});
      if (data.offscreen.length) pushIssue(issues, r, w, 'offscreen', { sample: data.offscreen.slice(0, 5) });
      if (data.menuCovered) pushIssue(issues, r, w, 'z-index-menu', {});
      if (data.modalOpen) {
        if (!data.bodyScrollLocked) pushIssue(issues, r, w, 'modal-scroll', {});
        if (data.modalHasRole === false) pushIssue(issues, r, w, 'modal-aria', {});
        if (!data.hasOverlay) pushIssue(issues, r, w, 'modal-overlay', {});
      }
      if (axeViolations.length) pushIssue(issues, r, w, 'a11y', { violations: axeViolations.slice(0, 10) });

    } catch (err) {
      pushIssue(issues, r, w, 'navigation-failed', { error: String(err) });
    }
  }
}

await browser.close();

const report = {
  baseUrl: BASE_URL,
  routes: ROUTES,
  widths: WIDTHS,
  issuesTotal: issues.length,
  generatedAt: new Date().toISOString(),
  issues,
};

await fs.promises.writeFile(outPath, JSON.stringify(report, null, 2), 'utf-8');
console.log(`Wrote ${outPath} with ${issues.length} issues`);
