
# Maplewood Scheduler — UI Polish Pack

A small, dependency-free facelift for your Dashboard and Calendar. Everything uses your existing CSS variables and React setup (no Tailwind, no new packages).

## What's included
- `src/styles/polish.css` — modern cards, badges, toolbar, and a manual light/dark theme override
- `src/components/Header.tsx` — gradient top bar with nav and Theme toggle
- `src/components/ThemeToggle.tsx` — toggles `data-theme` on `<html>`
- `src/components/SummaryCards.tsx` — 3 quick stats cards
- `src/components/CalendarView.tsx` — a drop-in, color‑coded calendar with tooltips

## How to install (copy-paste)
1) Copy the **files** in this pack into your project:
```
/src/styles/polish.css            -> src/styles/polish.css
/src/components/Header.tsx        -> src/components/Header.tsx
/src/components/ThemeToggle.tsx   -> src/components/ThemeToggle.tsx
/src/components/SummaryCards.tsx  -> src/components/SummaryCards.tsx
/src/components/CalendarView.tsx  -> src/components/CalendarView.tsx (replace existing)
```

2) Import the new CSS **once** (e.g., in `src/main.tsx` or `src/App.tsx`):
```ts
import "./styles/branding.css";
import "./styles/polish.css";
```

3) Add the **Header** and **SummaryCards** to your Dashboard:
```tsx
// Dashboard.tsx
import Header from "./components/Header";
import SummaryCards from "./components/SummaryCards";

// ...inside your component render:
<div className="app-shell">
  <Header current="Dashboard" />

  <SummaryCards
    openCount={vacancies.filter(v => v.status === "Open").length}
    awardedToday={vacancies.filter(v => v.status === "Awarded" && v.date === new Date().toISOString().slice(0,10)).length}
    pendingRequests={(requests ?? []).filter(r => r.status === "Pending").length || 0}
  />

  {/* Your existing content below... e.g. <CalendarView vacancies={vacancies} /> */}
</div>
```

4) **Logo (optional):** place an SVG/PNG at `/public/maplewood-logo.svg`. A text title shows if the file is missing.

5) **Dark Mode:** Click the toggle in the header. This sets `document.documentElement.dataset.theme` to `"light" | "dark"`. The CSS overrides your variables for a crisp dark theme.

## Notes
- No external icons/libs used; all icons are simple inline SVGs.
- The calendar shows status badges per day and pill outlines for each shift (Open/Pending/Awarded).
- Tooltips are pure CSS (no JS), so they work everywhere and are fast.
- You can keep iterating on colors by editing `branding.css` variables or the overrides inside `polish.css`.
