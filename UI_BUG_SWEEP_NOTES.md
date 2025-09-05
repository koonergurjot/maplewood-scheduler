# UI Bug Sweep Notes

## Remaining Known Issues
- `npm test` currently fails in `tests/awardVacancy.test.tsx` because the "Bulk Award" button is not found in the rendered output. The underlying workflow may require additional setup or the test must be updated to align with the current UI.
- Running preview with the default port may fail if another process occupies port `4173`. Start the preview with a different port using `npm run preview -- --port <port>` when needed.

## Suggested Next Steps
- Investigate the bulk award flow to ensure the action button is rendered when multiple vacancies are selected; update the test or UI accordingly.
- Review integration tests for reliability and add coverage for the multi-day vacancy flow and coverage date toggling.
