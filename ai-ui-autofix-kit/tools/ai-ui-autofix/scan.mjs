/* tools/ai-ui-autofix/scan.mjs
   Text-only UI scanner. No screenshots. Outputs JSON report.
*/
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
// Add/edit routes here if needed:
const ROUTES = ['/', '/vacancies', '/vacancies/new', '/schedule', '/admin/settings'];
const WIDTHS = [360, 768, 1280];

const outDir = path.resolve('tools/ai-ui-autofix');
const outPath = path.join(outDir, 'report.json');
await fs.promises.mkdir(outDir, { recursive: true });

function pushIssue(arr, route, width, type, details){
  arr.push({ route, width, type, details });
}

function bboxOverlap(a, b){
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
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

      await page.goto(url, { waitUntil: 'domcontentloaded' });

      // A11y quick check
      let axeViolations = [];
      try {
        const axe = await new AxeBuilder({ page }).analyze();
        axeViolations = axe.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help }));
      } catch {}

      // Evaluate layout heuristics in the page context
      const data = await page.evaluate(() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const docScrollW = document.documentElement.scrollWidth;

        // Horizontal overflow
        const overflowX = docScrollW > vw;

        // Sticky/fixed headers & first content overlap
        const fixedLike = Array.from(document.querySelectorAll('*'))
          .filter(el => ['fixed','sticky'].includes(getComputedStyle(el).position));
        const header = fixedLike.find(el => el.matches('header, .header, .section-h, .nav'));
        const firstContent = document.body.querySelector('.container, main, .card, .grid, table, .content, [role="main"]');

        let headerOverlap = false;
        if (header && firstContent) {
          const hb = header.getBoundingClientRect();
          const cb = firstContent.getBoundingClientRect();
          headerOverlap = hb.bottom > cb.top + 2; // crude
        }

        // Off-screen elements (left<0 or right>vw)
        const offscreen = [];
        for (const el of Array.from(document.body.querySelectorAll('*'))) {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          const b = el.getBoundingClientRect();
          if (!Number.isFinite(b.left) || !Number.isFinite(b.right)) continue;
          if (b.left < -4 || b.right > vw + 4) {
            offscreen.push({ tag: el.tagName.toLowerCase(), class: el.className?.toString().slice(0,60) || '' });
            if (offscreen.length > 15) break;
          }
        }

        // Modal checks
        const modal = document.querySelector('.modal');
        const hasOverlay = document.querySelector('.modal-overlay');
        let bodyScrollLocked = true;
        if (modal) {
          bodyScrollLocked = getComputedStyle(document.body).overflow === 'hidden';
        }
        const modalHasRole = modal ? (modal.getAttribute('role') === 'dialog' && modal.getAttribute('aria-modal') === 'true') : null;

        // Menu/overlay z-index conflicts: detect any .menu under a header box
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

        return { vw, overflowX, headerOverlap, offscreen, modalOpen: !!modal, hasOverlay: !!hasOverlay, bodyScrollLocked, modalHasRole, menuCovered };
      });

      if (messages.length) {
        pushIssue(issues, r, w, 'console-error', { messages });
      }
      if (data.overflowX) {
        pushIssue(issues, r, w, 'overflow-x', { hint: 'Content wider than viewport' });
      }
      if (data.headerOverlap) {
        pushIssue(issues, r, w, 'header-overlap', { hint: 'Sticky/fixed header overlaps first content' });
      }
      if (data.offscreen.length) {
        pushIssue(issues, r, w, 'offscreen', { sample: data.offscreen.slice(0,5) });
      }
      if (data.menuCovered) {
        pushIssue(issues, r, w, 'z-index-menu', { hint: 'Menu appears under header; raise z-index' });
      }
      if (data.modalOpen) {
        if (!data.bodyScrollLocked) pushIssue(issues, r, w, 'modal-scroll', { hint: 'Background scroll not locked' });
        if (data.modalHasRole === false) pushIssue(issues, r, w, 'modal-aria', { hint: 'Missing role=dialog and aria-modal=true' });
        if (!data.hasOverlay) pushIssue(issues, r, w, 'modal-overlay', { hint: 'No overlay element found' });
      }

      if (axeViolations.length) {
        pushIssue(issues, r, w, 'a11y', { violations: axeViolations.slice(0, 10) });
      }
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
  issues
};

await fs.promises.writeFile(outPath, JSON.stringify(report, null, 2), 'utf-8');
console.log(`Wrote ${outPath} with ${issues.length} issues`);