# PlayQ Test Execution & Reporting Workflow

## Complete End-to-End Workflow

### Step 1: Run Initial Tests

#### Cucumber Tests
```bash
npx playq test --runner cucumber --env default
```

**Output:**
- `test-results/cucumber-report.html` - HTML report with embedded artifacts
- `test-results/cucumber-report.json` - JSON data
- `test-results/scenarios/<scenario>_run1/` - Individual scenario artifacts
- `test-results/videos/` - Test execution videos
- `@rerun.txt` - List of failed tests (if any)

#### Playwright Tests
```bash
npx play test --env default
```

**Output:**
- `test-results/blob-report/` - Binary report data
- `test-results/blob-report_full/` - Preserved full run data
- `playwright-report/` - HTML report (auto-generated)

---

### Step 2: Rerun Failed Tests

#### Automatic Rerun (Both Runners)
```bash
npx playq test --rerun --env default
```

**What Happens:**
1. Reads `@rerun.txt` (Cucumber) or failed test list (Playwright)
2. Runs only failed tests
3. Generates separate rerun report:
   - Cucumber: `cucumber-report-rerun.html` & `cucumber-report-rerun.json`
   - Playwright: `test-results/blob-report/` (updated)

---

### Step 3: Merge Reports

#### Merge Both Original + Rerun Reports
```bash
npx playq merge-reports --open
```

**Output:**

#### For Cucumber:
- `test-results/cucumber-report-combined.html` - Side-by-side comparison view:
  - **Original Run** - Shows all tests from first execution
  - **Rerun Results** - Shows retested scenarios  
  - **Stats Comparison** - Pass/fail improvements highlighted

#### For Playwright:
- `playwright-report/` - Unified HTML report with all runs merged
- `test-results/blob-report_rerun/` - Preserved merged data

---

### Step 4: View Artifacts in Reports

#### Cucumber HTML Report (`cucumber-report.html`)

**Embedded Artifacts:**
- ✅ **Screenshots** - PNG images displayed inline when scenario has failure
- ✅ **Videos** - WebM video embedded (may need codec support in browser)
- ✅ **Traces** - Clickable links to Playwright trace viewer
- ✅ **Logs** - Step execution details

**How Artifacts Appear:**
1. Open `test-results/cucumber-report.html` in browser
2. Navigate to scenario
3. Expand steps to see attachments
4. Artifacts are base64-encoded and embedded directly in HTML

**Note:** Videos are embedded but may require browser codec support. Alternative: Click video link to download and play locally.

#### Combined Report (`cucumber-report-combined.html`)

**Shows:**
- Original test run results (left column)
- Rerun test results (right column)  
- Pass/fail comparison metrics
- Scenario-level details with status

**Artifacts:** Not directly embedded in combined view (by design - focuses on comparison). To see artifacts, open the individual reports:
- `cucumber-report.html` - Original run with artifacts
- `cucumber-report-rerun.html` - Rerun with artifacts

---

### Step 5: Access Raw Artifacts

If you need to access artifact files directly:

```
test-results/
├── scenarios/
│   ├── Fill_form_field_with_PatternIQ_run1/
│   │   ├── screenshot.png          # Scenario screenshot
│   │   ├── trace.zip               # Playwright trace
│   │   └── logs/                   # Execution logs
│   └── <scenario_name>_run2/       # Rerun artifacts
├── videos/
│   └── <hash>.webm                 # Full test video recording
└── cucumber-report.html            # HTML with embedded artifacts
```

---

## Configuration: Artifact Capture Settings

Edit `resources/config.ts`:

```typescript
artifacts: {
  screenshot: true,        // Capture screenshots
  video: true,             // Record videos  
  trace: true,             // Playwright traces
  onFailureOnly: true,     // Only on failure (recommended)
  onSuccessOnly: false,    // Only on success
  cleanUpBeforeRun: false  // Preserve previous artifacts
}
```

---

## Quick Reference Commands

```bash
# 1. Run tests (Cucumber)
npx playq test --runner cucumber --env default

# 2. Run tests (Playwright)  
npx playq test --env default

# 3. Rerun failed tests only
npx playq test --rerun --env default

# 4. Merge original + rerun reports and open in browser
npx playq merge-reports --open

# 5. Merge specific runner reports
npx playq merge-reports --runner cucumber --open
npx playq merge-reports --runner playwright --open
```

---

## Architecture: How Artifacts Are Embedded

### Cucumber Flow

```
Test Execution
    ↓
After Hook calls: this.attach(data, mimeType)
    ↓
Cucumber saves embeddings in JSON (base64)
    ↓
Built-in HTML formatter reads JSON embeddings
    ↓
Generates HTML with <img> / <video> tags using data URIs
    ↓
cucumber-report.html (artifacts embedded inline)
```

### Artifact Attachment Code

From `playq/config/cucumber/supportHooks.ts`:

```typescript
// Screenshot
const img = await webFixture.getCurrentPage().screenshot({
  path: `${folder}/screenshot.png`,
  type: 'png',
});
await this.attach(img, 'image/png'); // ← Embedded in report

// Video
const videoPath = await webFixture.getCurrentPage().video().path();
await this.attach(fs.readFileSync(videoPath), 'video/webm'); // ← Embedded

// Trace
await this.attach(
  `<a href="https://trace.playwright.dev/?trace=${folder}/trace.zip">Trace</a>`,
  'text/html' // ← Clickable link
);
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Artifacts not in report | Check `config.artifacts` settings; verify hooks ran successfully |
| Video won't play in browser | Browser codec issue - download .webm file and play in VLC/media player |
| Combined report no artifacts | By design - open individual `cucumber-report.html` or `cucumber-report-rerun.html` |
| Screenshot missing | Check `onFailureOnly` setting - screenshot only captured if test failed |
| Merge command fails | Ensure test-results folder exists and contains required JSON files |

---

## Best Practices

1. **Initial Run**: Always run full test suite first
2. **Rerun Once**: Use `--rerun` to retry failed tests
3. **Merge Immediately**: Run `merge-reports` right after rerun for complete view
4. **Archive Reports**: Save merged reports before next test run
5. **Artifact Settings**: Use `onFailureOnly: true` to save disk space

---