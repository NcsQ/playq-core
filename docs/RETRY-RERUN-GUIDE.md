# Test Retry & Rerun Guide

## Run Tests

```bash
npx playq test --runner playwright --env lambdatest
npx playq test --runner cucumber --tags "@scenario_tag" --env lambdatest
```
Example:
```bash
 npx playq test --grep "fill" --env default
```
## Rerun Failed Tests

> **IMPORTANT:** Rerun requires a prior test execution that identified failed tests. Run initial tests first, then rerun.

### Complete Workflow Example
```bash
# Step 1: Run initial tests (some may fail)
npx playq test --runner cucumber --tags "@scenario_tag" --env lambdatest

# Step 2: Automatically creates @rerun.txt with failed scenarios
# Step 3: Rerun only the failed tests
npx playq rerun --runner cucumber --env lambdatest

# Step 4: View merged reports
npx playq merge-reports --runner cucumber
```

### Playwright
```bash
# Run initial tests
npx playq test --grep "TestName"

# Rerun failed tests with up to 3 attempts
npx playq rerun
npx playq rerun --attempts 3
```

### Cucumber
```bash
# Run initial tests (creates @rerun.txt if failures found)
npx playq test --runner cucumber --tags "@scenario_tag"

# Rerun failed scenarios (preserves original results for merging)
npx playq rerun --runner cucumber

# With environment and custom attempts
npx playq rerun --runner cucumber --env lambdatest --attempts 3

# Manual rerun using raw cucumber-js (alternative - clears test-results)
npx cucumber-js --config cucumber.js "@rerun.txt"
```

## Merge Reports

### Playwright
```bash
npx playq merge-reports --open
npx playwright show-report test-results/playwright-report
```

### Cucumber
```bash
# Cucumber merge-reports prints a JSON summary to console (not HTML)
npx playq merge-reports --runner cucumber
```

### Viewing Cucumber HTML Reports
Cucumber reports are generated during test execution. To view them:
```bash
# Windows PowerShell
start test-results/cucumber-report.html

# macOS
open test-results/cucumber-report.html

# Linux
xdg-open test-results/cucumber-report.html
```

## View All Reports

```bash
# Playwright report
npx playwright show-report test-results/playwright-report

# Cucumber report
# Windows PowerShell
start test-results/cucumber-report.html

# macOS
open test-results/cucumber-report.html

# Linux
xdg-open test-results/cucumber-report.html
```

## Clean Up

```bash
# Windows PowerShell
Remove-Item -Recurse -Force test-results -ErrorAction SilentlyContinue

# macOS and Linux (Bash/Zsh)
rm -rf test-results

# Cross-platform using Node.js
node -e "require('fs').rmSync('test-results', { recursive: true, force: true })"
```

## Command Options

| Command | Flags | Purpose |
|---------|-------|---------|
| `npx playq rerun` | `--attempts N` | Rerun attempts (default: 1) |
| | `--env <name>` | Use specific environment |
| | `--folder <path>` | Rerun specific folder (Playwright only) |
| `npx playq merge-reports` | `--runner <type>` | `playwright` \| `cucumber` \| `all` |
| | `--open` | Open report after merge |
| `npx cucumber-js` | `@rerun.txt` | Rerun failed Cucumber scenarios |

## Reports Location

```
test-results/
├── playwright-report/     # Playwright HTML & JSON
├── cucumber-report.html   # Cucumber HTML
├── artifacts/             # Screenshots, videos, traces
└── blob-report/           # Blob data (for merging)
```
