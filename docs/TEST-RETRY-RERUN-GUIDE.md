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

### Playwright Tests

```bash
# Rerun failures once
npx playq rerun

# Rerun with multiple attempts
npx playq rerun --attempts 3

# Rerun specific folder
npx playq rerun --folder tests/playwright/actions/web
```

### Cucumber Tests

Cucumber uses the native `@rerun.txt` file to track and rerun failed scenarios:

```bash
# First run (generates @rerun.txt with failed scenarios)
npx playq test --runner cucumber --tags "@forms" --env lambdatest

# Rerun only failed scenarios from @rerun.txt
npx cucumber-js --config cucumber.js "@rerun.txt"

# Or use playq wrapper
npx playq test --runner cucumber "@rerun.txt" --env lambdatest
```

**How Cucumber rerun works:**
- First run: Cucumber generates `@rerun.txt` with failed scenario line numbers
- Format: `tests/bdd/scenarios/forms.feature:8:13` (file:line:column)
- Rerun command: Execute Cucumber with `@rerun.txt` as argument
- Each rerun generates new `@rerun.txt` with any remaining failures

---

## Merge Reports (After Rerun)

### Playwright Reports

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

### Cucumber Reports

Cucumber JSON reports auto-merge when running tests:

```bash
# View Cucumber report (auto-merged with each run)
start test-results/cucumber-report.html

# Show merge summary
npx playq merge-reports --runner cucumber
```

```

## Clean Up

```bash
Remove-Item -Recurse -Force test-results -ErrorAction SilentlyContinue
```

---

## Command Options

**npx playq rerun:**
- `--attempts N` - Number of rerun attempts (default: 1)
- `--folder <path>` - Rerun specific folder only (Playwright only)
- `--env <name>` - Use specific environment
- `--runner <type>` - `playwright` or `cucumber`

**npx playq merge-reports:**
- `--runner <type>` - `playwright` | `cucumber` | `all` (default: all)
- `--open` - Open Playwright report after merge
- `--config <path>` - Custom Playwright merge config

**Cucumber @rerun.txt:**
- File is auto-generated after each run
- Use with: `npx cucumber-js --config cucumber.js "@rerun.txt"`
- Contains failed scenario line numbers

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
