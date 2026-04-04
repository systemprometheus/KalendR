# Project rules

When implementing a feature or fixing a bug, do not stop after making code changes.

Required workflow:
1. Understand the request.
2. Make the smallest safe code change.
3. Add or update tests when the repo has a test framework available.
4. Run the relevant verification commands.
5. If anything fails, debug and keep iterating.
6. Only stop when the relevant checks pass or you are truly blocked.

Validation commands:
- npm run lint
- npx tsc --noEmit
- npm run test (unit + integration via Vitest)
- npm run test:unit (unit tests only)
- npm run test:integration (integration tests only)
- npm run e2e (browser tests via Playwright, requires dev server)

Rules:
- Prefer minimal diffs.
- Do not edit secrets or env files.
- For UI changes, manually verify behavior unless an automated browser test framework is added.
- After code changes, review for regressions.