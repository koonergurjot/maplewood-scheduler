# Debug Plan

## Top Blockers
- ESLint failed due to missing configuration and required plugins.
- Vitest suite had failing date and validation utility tests.
- NPM scripts lacked lint, test, and format commands required for CI.

## Root Causes
- `package.json` omitted lint/test scripts and dev dependencies, leaving the project without a working lint setup.
- `applyPreset` in `src/utils/date.ts` included partial work cycles, causing failing expectations.
- `validateTime` and `validateTimeRange` accepted loose formats and rejected/accepted shifts incorrectly.

## Planned Fixes
1. Add ESLint/Prettier tooling and configure scripts (`package.json`, `.eslintrc.cjs`). **Risk: Low**
2. Adjust `applyPreset` to ignore incomplete 4-on/5-on work blocks (`src/utils/date.ts`). **Risk: Low**
3. Tighten time validation regex and support overnight shifts up to 12h (`src/utils/validation.ts`). **Risk: Low**
4. Provide Vitest config and npm scripts for consistent testing (`vitest.config.ts`, package scripts). **Risk: Low**
