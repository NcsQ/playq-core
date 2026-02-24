# PlayQ Test Retry & Rerun Guide
## Run Tests

```bash
npx playwright test -c playq/config/playwright/playwright.config.js
```

## View All Reports

```bash
# Playwright HTML report (always available)
npx playwright show-report test-results/playwright-report

# Cucumber HTML report (only when running Cucumber tests)
start test-results/cucumber-report.html

# Allure report (if configured and tests run with Allure reporter)
npx allure open test-results/allure-report
```

**Note:** Cucumber and Allure reports only appear when running their respective test types. After Playwright tests, only the Playwright report is available.

---

## Rerun Failed Tests

```bash
# Rerun failures once
npx playq rerun

# Rerun with multiple attempts
npx playq rerun --attempts 3

# Rerun specific folder
npx playq rerun --folder tests/playwright/actions/web
```

## Merge Reports (After Rerun)

The merge combines the original test run with the rerun results into a unified report.

```bash
# Merge and open combined report
npx playq merge-reports --open

# View combined report later
npx playwright show-report test-results/playwright-report
```

**How it works:**
- First run creates `test-results/blob-report/`
- Rerun preserves original as `test-results/blob-report_full/`
- Rerun creates new `test-results/blob-report/` with just rerun results
- Merge combines both into unified `test-results/playwright-report/`

---

## Clean Up

```bash
Remove-Item -Recurse -Force test-results -ErrorAction SilentlyContinue
```

---

## Command Options

**npx playq rerun:**
- `--attempts N` - Number of rerun attempts (default: 1)
- `--folder <path>` - Rerun specific folder only
- `--env <name>` - Use specific environment
- `--runner <type>` - `playwright` or `cucumber`

**npx playq merge-reports:**
- `--open` - Open report after merge
- `--config <path>` - Custom merge config

---

## All Reports Location

```
test-results/
├── playwright-report/       # Playwright HTML & JSON (always)
├── cucumber-report.html     # Cucumber HTML (Cucumber tests only)
├── allure-report/           # Allure HTML (if configured)
├── blob-report/             # Blob data (for merging)
└── artifacts/               # Screenshots, videos, traces
```

**Report Availability:**
- **Playwright tests** → `playwright-report/`, `blob-report/`, `artifacts/`
- **Cucumber tests** → `cucumber-report.html`, `playwright-report/` (if using Playwright as runner)
port locations (now in test-results/)
- `test-results-merged-*` - Old timestamped merge folders

**What stays:**
- `test-results/` - Contains all current reports
