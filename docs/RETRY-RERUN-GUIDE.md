# Quick Test Retry & Rerun Guide

## 1. Run Tests
```bash
# Cucumber
npx playq test --runner cucumber --tags "@smoke" --env default

# Playwright  
npx playq test --grep "TestName" --env default
```

**Output:** `test-results/` folder with HTML report + artifacts (screenshots, videos, traces)

---

## 2. Rerun Failed Tests
```bash
# Same command for both Playwright & Cucumber
npx playq test --rerun --env default
```

**What happens:**
- Automatically detects failed tests from previous run
- Runs only failed tests
- Generates separate `-rerun` reports

---

## 3. Merge Reports  
```bash
npx playq merge-reports --open
```

**Generates:**
- `cucumber-report-combined.html` - Side-by-side comparison (original vs rerun)
- Unified Playwright HTML report (all runs merged)

---

## 4. View Artifacts (Screenshots & Videos)

### In HTML Report
Open `test-results/cucumber-report.html` in browser:
- ✅ **Screenshots** - Embedded PNG images  
- ✅ **Videos** - Embedded WebM videos
- ✅ **Traces** - Clickable Playwright trace links

### In File System
```
test-results/
├── cucumber-report.html          # Report with embedded artifacts
├── scenarios/<scenario>_run1/    # Individual scenario artifacts  
└── videos/                       # Test execution recordings
```

---

## Complete Workflow Example

```bash
# Step 1: Run initial tests
npx playq test --runner cucumber --env default

# Step 2: Rerun failed tests (if any failed)
npx playq test --rerun --env default

# Step 3: Merge and view combined report
npx playq merge-reports --open
```

---

## Configuration

Customize artifact capture in `resources/config.ts`:

```typescript
artifacts: {
  screenshot: true,        // Capture screenshots
  video: true,             // Record videos
  trace: true,             // Playwright traces
  onFailureOnly: true,     // Only capture on failure
  onSuccessOnly: false,    
  cleanUpBeforeRun: false
}
```

---

## 📖 For Detailed Documentation

See [COMPLETE-WORKFLOW-GUIDE.md](./COMPLETE-WORKFLOW-GUIDE.md) for:
- Architecture details
- Artifact embedding mechanics  
- Playwright workflows
- Troubleshooting guide
- Best practices

---
