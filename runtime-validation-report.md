# Runtime Validation Report

**Generated**: 2026-10-14T15:24:25-05:00  
**Target**: `aurora-vida-karate`

## Summary

| Step | Status | Exit Code | Details |
|------|--------|-----------|---------|
| Startup | PASS | 0 | `APP_MODE=test node scripts/start-test-server.js`; `/api/health` returned 200 |
| Integration Tests | PASS | 0 | `npm test`; 18 tests, 18 passed, 0 failed, 0 skipped |
| Browser E2E | PASS | 0 | `npm run test:e2e`; 10 tests, 10 passed, 0 failed |
| Syntax and whitespace | PASS | 0 | `node --check` on server/frontend scripts and `git diff --check` |

**Overall**: PASS

## Environment and Capability Evidence

- Node.js: available, `v24.20.0`.
- Docker: unavailable; `Get-Command docker` reported that the CLI is not installed.
- Playwright browser: available; `npx playwright install chromium` exited 0 and Chromium E2E ran successfully.
- Infrastructure tier: the app uses an in-memory store and has no database, broker, cache, or external service dependency. The API test server was run locally; persistent infrastructure is not exercised.
- Browser tier: primary Playwright validation used Chromium, including a 390px mobile viewport.

## Test Coverage

- Karate contract tests: catalog, quote creation and lookup, request validation, business age limits, quote expiration, and semillero isolation.
- Playwright desktop: quote calculation and persisted read-back, smoker pricing, quote expiry behavior, amount/term selectors, required-field validation and focus, business-rule errors, invalid date handling, and the quote-preserving authentication handoff.
- Playwright recovery flow: correct an invalid date, create a quote, and verify it through the API.
- Playwright mobile flow: calculate a quote at 390px, verify the summary layout does not overflow, and follow the handoff back link.
- Test data is scoped with distinct `X-Semillero` values. The Playwright flows reset their own test space before and after each test.
- Authentication failure is not applicable to HU-01: quote calculation and the handoff are public; actual authentication belongs to HU-02.

## Legacy Test Migration

| Decision | Source | Details |
|---|---|---|
| reuse-with-edits | Discovered Playwright and Karate tests | Existing journeys were retained and updated to use the HU-01 v1.1 controls, selectors, and displayed formats. |

| Test file | Change reason |
|---|---|
| `aurora-vida-playwright/tests/pages/CotizadorPage.ts` | Updated locators and actions for date text input and smoker radio controls. |
| `aurora-vida-playwright/tests/e2e/cotizador.spec.ts` | Updated assertions for the new result/validation markup and handoff screen. |
| `aurora-vida-playwright/tests/e2e/mobile-flow.spec.ts` | Added mobile quote and layout verification. |
| `aurora-vida-playwright/tests/e2e/validation-recovery.spec.ts` | Added invalid-date recovery and API read-back verification. |

## Reports

- Playwright HTML report: `aurora-vida-playwright/playwright-report/index.html`
- Karate HTML report: `target/karate-reports/karate-summary.html`
- Maven Surefire report: `target/surefire-reports/`

## CI Status

The GitHub Actions workflow is configured to start an ephemeral API, run Karate and Playwright, and upload reports. It has **not** been executed on GitHub because the workflow changes have not been pushed.
