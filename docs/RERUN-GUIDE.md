# PlayQ Rerun Guide (Brief)

## Quick Start

**Step 1: Run tests** (failures auto-saved)
```bash
npx playq test --grep "smoke" --env dev
```

**Step 2: Fix issues** (data, config, code, etc.)

**Step 3: Rerun failed tests**
```bash
npx playq rerun --env dev
```

---

## How It Works

1. **Initial Run** → Tests execute, failures saved to `.playq-failed-tests.json`
2. **Extract Failed** → Identifies failures from reports (junit/blob/cucumber)
3. **Rerun Failed** → Only reruns failed tests using grep/tags
4. **Merge Reports** → Combines initial + rerun results into `test-results/`
5. **Cleanup** → Removes temporary directories and failure file on success

---

## File Structure (After Rerun)

All reports consolidate into `test-results/`:
```
test-results/
├── blob-report/              # Playwright HTML report
├── cucumber-merged.json      # Merged Cucumber results
├── allure-results-merged/    # Merged Allure results (if enabled)
├── report-merged.jsonl       # Playwright merged blob report
└── rerun-summary.json        # Metadata: what was rerun
```

**Cleanup temporary directories** (optional but saves disk):
```bash
rm -rf test-results-rerun-*       # Remove intermediate rerun results
rm -rf test-results-merged-*      # Remove temporary merge output
```

---

## Viewing Reports

**Playwright** (most common):
```bash
cd test-results
npx playwright show-report blob-report
```

**Cucumber**:
```bash
jq '.features[] | {name, status: .elements[-1].steps[-1].result.status}' cucumber-merged.json
```

**Allure** (if enabled):
```bash
cd test-results
allure generate allure-results-merged -o allure-report
allure open allure-report
```

**Rerun Summary**:
```bash
cat test-results/rerun-summary.json | jq '.'
```

---

## Quick Commands

```bash
# Run tests (failures auto-saved)
npx playq test --grep "pattern" --env envName

# Check what failed
cat .playq-failed-tests.json | jq '.tests[] | .name'

# Rerun with specific environment
npx playq rerun --env envName

# View Playwright report
npx playwright show-report test-results/blob-report

# View Cucumber summary
jq '.features[]' test-results/cucumber-merged.json

# Check rerun improvements (tests that failed but now pass)
jq '.[] | select(.previousFailed == true and .ok == true) | .title' test-results/report-merged.jsonl
```

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| "No failed tests file found" | No initial test run | Run tests first: `npx playq test --grep "..."` |
| "No failed tests to rerun" | All tests passed initially | Check `.playq-failed-tests.json` exists |
| "Rerun extraction failed" | Reports missing/corrupted | Verify `test-results/` exists and has valid reports |
| Merged reports not in `test-results/` | Manual cleanup needed | Copy from `test-results-merged-*/` and delete temp dirs |

---

## Environment & Config

```bash
# Rerun with environment override
npx playq rerun --env staging

# Override runner type
npx playq rerun --runner cucumber
```

Configure in `resources/config.ts`:
```typescript
{
  testExecution: {
    timeout: 30000,
    retryOnFailure: true  // Action-level retries, NOT test rerun
  },
  artifacts: {
    screenshot: "on-failure",
    video: "on-failure",
    trace: "on-failure"
  }
}
```

---

## Key Concepts

- **Retry** (automatic) = immediate retry during test (transient failures)
- **Rerun** (manual) = re-execute after manual fixes (data/config issues)
- Failures extracted from **junit** (primary) → **blob reports** (secondary)
- All merged reports end up in **`test-results/`** for viewing
- Temporary directories (`test-results-rerun-*`, `test-results-merged-*`) can be deleted

---

## Report Fields

**Merged Playwright Report** (`report-merged.jsonl`):
- `source: "rerun"` = re-executed test
- `previousFailed: true` = failed initially, passed on rerun
- `ok: true/false` = current status

**Merged Cucumber Report** (`cucumber-merged.json`):
- `source: "rerun"` = scenario was rerun
- `previousStatus: "failed"` = what it was before
- `retried: true` = included in rerun

---

## Best Practices

1. ✅ Always fix issues before rerunning
2. ✅ Use specific grep/tags to narrow scope
3. ✅ Review `rerun-summary.json` for patterns
4. ✅ Delete `test-results-*` temp directories periodically
5. ❌ Don't edit `.playq-failed-tests.json` manually
6. ❌ Don't rerun without fixing the root cause

---

## See Also

- [PlayQ Core Instructions](../copilot-instructions.md)
- [Playwright Report Docs](https://playwright.dev/docs/test-reporters)
