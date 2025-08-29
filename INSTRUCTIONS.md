# Netlify Build Fix – TypeScript Errors

Apply these changes to resolve the reported errors:

## 1) `src/hooks/useSchedulerState.ts` (unknown property on Settings)
Replace the `defaultSettings` object with this minimal, type-safe version:
```ts
const defaultSettings: Settings = {
  responseWindows: { lt2h: 7, h2to4: 15, h4to24: 30, h24to72: 120, gt72: 1440 },
};
```

## 2) `src/lib/range.ts` (boolean | undefined)
Use the included `src/lib/range.ts` in this patch (it coerces to `boolean` safely).

## 3) `src/types.ts` (Invalid module name in augmentation)
Remove the line that says:
```ts
declare module "./types-augment" {}
```
This augmentation doesn’t exist and breaks builds. Deleting that single line is enough.

---

After applying these:
- Reinstall deps (optional but safe): `npm install`
- Rebuild: `npm run build`
