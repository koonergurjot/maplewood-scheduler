# Bundles & Blocks

This project supports automatic bundling of multi‑day vacancy ranges. When a range spans two or more days a single `bundleId` is assigned and the UI treats the group as one **Block**.

## Creating vacancies

Use `createVacanciesFromRange` to expand a date range into individual vacancies. The helper automatically assigns a `bundleId` when appropriate:

```ts
import { createVacanciesFromRange } from "../lib/bundles";
const vacancies = createVacanciesFromRange(fields);
setVacancies(prev => [...prev, ...vacancies]);
```

## Listing vacancies

The `BlocksAndSingles` component renders bundled blocks first and then single day vacancies. It accepts callbacks for awarding or deleting entire bundles and for deleting individual vacancies:

```tsx
<BlocksAndSingles
  vacancies={vacancies}
  onAwardBundle={(id) => awardBundle(id)}
  onDeleteBundle={(id) => deleteBundle(id)}
  onDeleteSingle={(id) => remove(id)}
/>
```

`awardBundle` and `deleteBundle` helpers are available from `lib/bundles`.
