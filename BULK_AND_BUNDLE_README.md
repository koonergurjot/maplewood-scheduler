
# Bulk Bidding + Bundle Editor (Drop-in)

## Files
- `src/optional/MultiBidModal.tsx` — UI for pasting/choosing multiple employees and applying bids in bulk across selected days or entire bundles.
- `src/optional/BundleEditor.tsx` — choose a target vacancy; attach other selected days into that vacancy's bundle.
- `src/optional/bulk-utils.ts` — pure helpers:
    - `attachVacanciesToTargetBundle(all, targetId, attachIds, genId)`
    - `addBidsToVacancies(all, vacancyIds, employees, { applyToBundles, overwrite, sameRank, note })`

## Minimal wiring example
```tsx
// inside your component...
const [bulkOpen, setBulkOpen] = useState(false);
const [bundleOpen, setBundleOpen] = useState(false);
const selectedVacancyIds = useSelectedRowIds(); // however you track selections

<MultiBidModal
  open={bulkOpen}
  onClose={() => setBulkOpen(false)}
  employees={employees}
  selectedVacancyIds={selectedVacancyIds}
  allVacancies={vacancies}
  onApply={({ vacancyIds, employeeIds, applyToBundles, overwrite, sameRank, note }) => {
    setVacancies(prev => addBidsToVacancies(
      prev,
      vacancyIds,
      employeeIds.map(id => ({ id })),
      { applyToBundles, overwrite, sameRank, note }
    ));
    toast("Bids applied");
  }}
/>

<BundleEditor
  open={bundleOpen}
  onClose={() => setBundleOpen(false)}
  allVacancies={vacancies}
  selectedVacancyIds={selectedVacancyIds}
  onAttach={({ targetVacancyId, attachIds }) => {
    setVacancies(prev => attachVacanciesToTargetBundle(prev, targetVacancyId, attachIds, crypto.randomUUID));
    toast("Days attached to bundle");
  }}
/>
```

## Netlify build fix (React/JSX types)
- `@types/react` and `@types/react-dom` are placed in **dependencies** so they install in production builds.
- `tsconfig.json` has `jsx: react-jsx` and `lib: [ES2020, DOM]`.
- `src/react-app-env.d.ts` references React/DOM types immediately.
- Optional: use `tsconfig.ci.json` to relax strict checks in CI while you clean up implicit-any warnings.

## Netlify options
- Use relaxed CI build: `npm run build:ci`
- Or add an env var to force devDeps: `NPM_FLAGS="--include=dev"`
