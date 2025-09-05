# AI UI Autofix Kit (No-Screenshots, Text-Only)

This kit lets an AI (e.g., Codex/Copilot) **fully fix** common UI bugs by:
1) Scanning your app at multiple screen widths,
2) Emitting a machine-readable report with detected issues,
3) Feeding a single **Super Prompt** (included) to automatically open small PRs until the report is clean.

## Quick Start (3 steps)
1. **Drop this folder into your repo root** (same level as `package.json`).
2. Install deps (one-time):
   ```bash
   npm i -D playwright @axe-core/playwright
   npx playwright install --with-deps
   ```
3. Run a scan (with your dev server running):
   ```bash
   BASE_URL=http://localhost:5173 node tools/ai-ui-autofix/scan.mjs
   ```
   - The scan writes **`tools/ai-ui-autofix/report.json`** (text-only).

Then copy the **Super Prompt** from `PROMPT_SUPER_AI_AUTOFIX.txt` into your AI.  
Each time the AI makes a PR, re-run the scan. Repeat until `report.json` has **0 issues**.

## What it detects
- Horizontal overflow (content wider than viewport)
- Sticky/fixed header overlap with first content row
- Off-screen elements (negative X or > viewport width)
- Modal problems (background scroll not locked; missing role/aria-modal)
- Keyboard traps (basic heuristic)
- Z-index menu/overlay conflicts (heuristic: menu obscured by header)
- A11y violations via axe-core (summary only)

All outputs are text-only to avoid "binary files not supported" problems.

## Scripts (optional)
Add to your `package.json`:
```json
{
  "scripts": {
    "ui:scan": "BASE_URL=http://localhost:5173 node tools/ai-ui-autofix/scan.mjs"
  }
}
```

## GitHub Action (optional)
The included workflow runs the scan on PRs and uploads `report.json` as an artifact. It never uploads images.