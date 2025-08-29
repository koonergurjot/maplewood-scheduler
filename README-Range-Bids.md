# Multi‑day Vacancy Ranges & Bids (alpha)

This adds a new `VacancyRange` model for multi‑day postings and extends `Bid` with `coverageType`, `selectedDays`, and `timeOverrides`.

## Files added
- `src/types.ts` (extended `Bid`; new `VacancyRange`, `BidCoverageType`)
- `src/lib/range.ts` (helpers)
- `src/lib/vacancy-range-award.ts` (picking a full‑range winner by seniority)
- `src/components/VacancyRangeForm.tsx` (create/edit a range with working-day picks and per-day times)
- `src/components/RangeBidDialog.tsx` (enter a bid for a range)
- `src/hooks/useSchedulerState.ts` (persist `vacancyRanges` array)

## Wire-in (next steps)
- Add a button in Coverage tab to open `VacancyRangeForm` and push saved range into `vacancyRanges`.
- Add a “Bid” button on each range row to open `RangeBidDialog` and append to `bids` (with `coverageType`).
- On award: use `vacancy-range-award.ts` to pick winner; when awarded, mirror archive per working day.
- Add warnings (fatigue/eligibility) before submission; non-blocking (soft warnings).

This compiles without breaking existing single‑day vacancy flow and can be iteratively integrated into UI.
