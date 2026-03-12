# PowerShell Template Processing - User Guide

Run PowerShell scripts automatically with variable substitution using **three methods**.

---

## 📋 Quick Setup

### Step 1: Create Your PowerShell Template

**📁 PUT FILE HERE:** `resources/powershell/db_run_script.ps1`

```powershell
Write-Host "Database Message: {{MESSAGE}}"
Write-Host "User: {{USERNAME}}"
Write-Host "Environment: {{ENVIRONMENT}}"
```

💡 **Tip:** Use `{{VARIABLE_NAME}}` for placeholders

---

### Step 2: Define Default Variables

**📁 PUT FILE HERE:** `resources/var.static.json`

```json
{
  "MESSAGE": "Default database message",
  "USERNAME": "testuser",
  "ENVIRONMENT": "staging"
}
```

---

## ✅ Method 1: Terminal (CLI)

**Best for:** Quick testing, CI/CD pipelines, DevOps tasks

### Basic Usage

```bash
# Just generate the script
npx playq ps-template db_run_script

# Generate and run immediately
npx playq ps-template db_run_script --run

# Override variables
npx playq ps-template db_run_script --set USERNAME=admin --set ENVIRONMENT=prod --run

# Preview (don't create file)
npx playq ps-template db_run_script --dry-run
```

**📁 OUTPUT FILE:** `test-data/db_run_script_processed.ps1`

---

## ✅ Method 2: Feature Files (BDD)

**Best for:** Test automation, team collaboration, documentation

### Create Your Test

**📁 PUT FILE HERE:** `tests/bdd/scenarios/Comms/database_test.feature`

```gherkin
Feature: PowerShell Database Scripts

@powershell @database
Scenario: Run database script
  * Comm: Process PowerShell Template -templateName: "db_run_script" -options: "{\"run\": true}"

@powershell @custom-vars
Scenario: Run with custom variables
  * Comm: Process PowerShell Template -templateName: "db_run_script" -options: "{\"overrides\": {\"USERNAME\": \"admin\", \"ENVIRONMENT\": \"production\"}, \"run\": true}"
```

### Run Your Test

```bash
# Run all PowerShell tests
npx playq test --runner cucumber --tags "@powershell" --env default

# Run specific scenario
npx playq test --runner cucumber --tags "@database" --env default
```

**📁 OUTPUT FILES:**
- Generated script: `test-data/db_run_script_processed.ps1`
- Test report: `test-results/cucumber-report.html`

---

## ✅ Method 3: Node.js Code (Programmatic)

**Best for:** Build automation, custom scripts, integration with existing code

### Create Your Script

**📁 PUT FILE HERE:** `scripts/database-setup.js`

```javascript
const { processPowerShellTemplate } = require('@playq/core/dist/helper/actions/commActions');

async function setupDatabase() {
  console.log('🚀 Starting database setup...');
  
  // Method 1: Run with defaults
  await processPowerShellTemplate('db_run_script', { run: true });
  
  // Method 2: Override variables
  await processPowerShellTemplate('db_run_script', {
    run: true,
    overrides: {
      USERNAME: 'admin',
      ENVIRONMENT: 'production'
    }
  });
  
  console.log('✅ Setup completed');
}

setupDatabase();
```

### Run Your Script

```bash
node scripts/database-setup.js
```

**📁 OUTPUT FILE:** `test-data/db_run_script_processed.ps1`

---

## 📂 File Locations Summary

| Purpose | Location |
|---------|----------|
| **PowerShell templates** | `resources/powershell/*.ps1` |
| **Default variables** | `resources/var.static.json` |
| **Feature files (BDD)** | `tests/bdd/scenarios/*.feature` |
| **Node scripts (optional)** | `scripts/*.js` |
| **Generated scripts** ⬅️ OUTPUT | `test-data/*_processed.ps1` |
| **Test reports** ⬅️ OUTPUT | `test-results/cucumber-report.html` |

---

## 🐛 Common Issues

| Problem | Solution |
|---------|----------|
| `Template not found` | Check file exists: `resources/powershell/yourtemplate.ps1` |
| `Variable not replaced` | Check variable name in `resources/var.static.json` |
| `Permission denied` | Windows: `Set-ExecutionPolicy -ExecutionPolicy Bypass` |
| `{{VAR}} appears in output` | Variable not found - check spelling in `var.static.json` |

---

## 💡 Quick Examples

### Example 1: QA Tester
```bash
# 1. Create feature file: tests/bdd/scenarios/Comms/test.feature
# 2. Run test:
npx playq test --runner cucumber --tags "@powershell" --env default
# 3. Check: test-results/cucumber-report.html
```

### Example 2: DevOps Engineer
```bash
# Quick one-liner for CI/CD
npx playq ps-template deploy_script --set ENV=production --run
```

### Example 3: Developer
```javascript
// In your Node.js code
const { processPowerShellTemplate } = require('@playq/core/dist/helper/actions/commActions');
await processPowerShellTemplate('setup_script', { run: true });
```

---

## ✅ That's It!

Pick your method based on your needs:
- **Terminal** → Fast, simple, one-off tasks
- **Feature Files** → Team testing, documentation, repeatability
- **Node.js Code** → Build automation, custom workflows
