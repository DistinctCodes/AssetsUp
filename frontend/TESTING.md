# Frontend testing

- `npm test` runs the Jest suite; `npm run test:coverage` adds coverage over `app/`, `components/`, `features/`, `lib/`, `hooks/` and `store/`.
- CI runs `test:coverage` and uploads `frontend/coverage` as the `frontend-coverage` artifact.
- **Coverage floor:** `coverageThreshold.global` in `jest.config.js` (currently 5% for statements, branches, functions and lines). The run fails below it. The initial value is a placeholder because it was set without measuring; after the first CI report, raise it to a few points below the reported numbers and keep ratcheting up.
- Page tests mock the query hooks and `next/navigation`; see `__tests__/licenses-page.test.tsx` and `__tests__/assets-page.test.tsx`.
- URL-backed filters use `hooks/useUrlState.ts`.
