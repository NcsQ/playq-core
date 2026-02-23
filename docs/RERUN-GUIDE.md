# Rerun Guide

## Workflow

```bash
# 1. Run tests
npx playq test --grep "pattern" --env envName

# 2. Fix issue (data, config, code, etc.)

# 3. Rerun failed tests
npx playq rerun --env envName
```

## View Results

```bash
# Playwright report (recommended)
npx playwright show-report test-results/blob-report

# Cucumber results
cat test-results/cucumber-merged.json | jq '.features[] | .name'

# What was rerun
cat test-results/rerun-summary.json | jq '.'
```

## Common Commands

```bash
# Check what failed
cat .playq-failed-tests.json | jq '.tests[] | .name'

# Rerun with Cucumber
npx playq rerun --runner cucumber

# Cleanup temporary directories
rm -rf test-results-rerun-* test-results-merged-*
```

## Results Location

All merged reports: `test-results/`
- `blob-report/` - Playwright results
- `cucumber-merged.json` - Cucumber results
- `rerun-summary.json` - What was rerun
