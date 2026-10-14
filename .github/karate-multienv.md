# Karate multi-environment execution

`src/test/java/karate-config.js` supports `local`, `ci`, `qa`, `dev`, and `prod`.
The default is `local`; local and CI runs use `http://localhost:4000`. Remote
URLs are read from the selected GitHub Environment so credentials and endpoints
are not embedded in source code.

## Configure GitHub Environments

In **Settings → Environments**, create environments named exactly `QA`, `DEV`,
and `PROD`. Define these environment variables in each environment:

| Variable | Required for | Value |
|---|---|---|
| `AURORA_BASE_URL` | QA, DEV, PROD | Full API base URL, including `/api/v1` |
| `AURORA_HEALTH_URL` | QA, DEV, PROD | Full health endpoint URL |
| `AURORA_TEST_SUPPORT_URL` | QA, DEV | Full test-support URL, including `/api/test` |

If an environment requires an API key, add it as an environment secret named
`API_KEY`. The key is made available to Karate as `config.apiKey`; it is never
logged. The current HU-01 contract does not send an API-key header because its
authentication scheme is not defined in the API contract.

For the known DEV deployment, use:

```text
AURORA_BASE_URL=https://aurora-vida-dev.onrender.com/api/v1
AURORA_HEALTH_URL=https://aurora-vida-dev.onrender.com/api/health
AURORA_TEST_SUPPORT_URL=https://aurora-vida-dev.onrender.com/api/test
```

QA and PROD endpoint values must be provided by their owners; they are
intentionally not guessed or copied from another environment.

## Run from GitHub Actions

Open **Actions → HU-01 backend and browser tests → Run workflow**, choose the
branch, then select one target:

- `ephemeral`: starts the disposable local API and runs Karate plus Playwright.
- `QA` or `DEV`: runs the full HU-01 contract suite. These suites create quotes
  and set the test clock in the dedicated `karate-hu01` semillero, so use
  isolated non-production environments with test support enabled.
- `PROD`: runs only the read-only `@smoke @readonly` checks for health and the
  term catalog. It never calls quote creation or test-support endpoints.

The workflow uses GitHub Actions `::notice` and `::error` workflow commands to
annotate target selection, missing environment configuration, and test
outcomes. Karate reports are uploaded as the `hu01-karate-<ENV>-reports`
artifact, including when a test step fails.

To run locally:

```powershell
$env:AURORA_BASE_URL = "https://<host>/api/v1"
$env:AURORA_HEALTH_URL = "https://<host>/api/health"
$env:AURORA_TEST_SUPPORT_URL = "https://<host>/api/test"
mvn --batch-mode --no-transfer-progress -Dkarate.env=dev -Dtest=TestRunner test
```

For a production smoke run, provide only `AURORA_BASE_URL` and
`AURORA_HEALTH_URL`, then run:

```powershell
mvn --batch-mode --no-transfer-progress -Dkarate.env=prod -Dtest=ReadOnlySmokeRunner test
```
