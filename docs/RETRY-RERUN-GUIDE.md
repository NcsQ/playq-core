# Test Retry & Rerun Guide

## Run Tests

```bash
npx playq test --runner playwright --env lambdatest
npx playq test --runner cucumber --tags "@scenario_tag" --env lambdatest
```

## Rerun Failed Tests

### Playwright
```bash
npx playq rerun
npx playq rerun --attempts 3
```

### Cucumber
```bash
# Rerun failed scenarios from @rerun.txt
npx cucumber-js --config cucumber.js "@rerun.txt"

# Or with playq wrapper
npx playq test --runner cucumber "@rerun.txt" --env lambdatest
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
start test-results/cucumber-report.html
```

## View All Reports

```bash
# Playwright report
npx playwright show-report test-results/playwright-report

# Cucumber report
start test-results/cucumber-report.html
```

## Clean Up

```bash
Remove-Item -Recurse -Force test-results -ErrorAction SilentlyContinue
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
