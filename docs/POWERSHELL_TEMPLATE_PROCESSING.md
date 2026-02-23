# PowerShell Template Processing

Quick guide for running PowerShell scripts in your tests.

---

## 3 Quick Steps

### 1️⃣ Create PowerShell Script Template

**Where:** `resources/powershell/my_script.ps1`

```powershell
Write-Host "Processing {{USER_NAME}}"
Write-Host "Environment: {{ENVIRONMENT}}"
```

Use `{{VARIABLE_NAME}}` for placeholders → variables auto-replaced.

---

### 2️⃣ Define Variables

**Where:** `resources/var.static.json`

```json
{
  "USER_NAME": "John Doe",
  "ENVIRONMENT": "staging"
}
```

---

### 3️⃣ Use in Feature File

**Where:** `tests/bdd/scenarios/Comms/my_test.feature`

```gherkin
Scenario: Run PowerShell script
  * Comm: Process PowerShell Template -templateName: "my_script" -options: "{\"run\": true}"
```

That's it! Script generates and runs.

---

## The 3 Steps Explained

### Option 1: Generate Only (No Execution)

```gherkin
* Comm: Process PowerShell Template -templateName: "my_script" -options: "{\"run\": false}"
```
→ Creates `test-data/my_script_processed.ps1` (doesn't run)

---

### Option 2: Generate & Execute

```gherkin
* Comm: Process PowerShell Template -templateName: "my_script" -options: "{\"run\": true}"
```
→ Creates file **and** runs it immediately

---

### Option 3: Generate & Store Path (for later use)

```gherkin
* Comm: Process PowerShell Template -templateName: "my_script" and store output in -variable: "var.scriptPath" -options: "{\"run\": false}"
* Comm: Run PowerShell Script -scriptPath: "#{var.scriptPath}" -options: "{}"
```
→ First step: generates file, saves path in variable  
→ Second step: runs it using the stored path

---

## File Locations

```
resources/powershell/          ← Your PowerShell templates (.ps1 files)
test-data/                     ← Generated scripts (auto-created)
resources/var.static.json      ← Your variables
```

---

## Example

**Template:** `resources/powershell/setup_user.ps1`
```powershell
Write-Host "Creating user {{USERNAME}}"
Write-Host "Role: {{USER_ROLE}}"
```

**Variables:** `resources/var.static.json`
```json
{
  "USERNAME": "testuser",
  "USER_ROLE": "Admin"
}
```

**Feature:** `tests/bdd/scenarios/admin.feature`
```gherkin
Scenario: Create admin user
  * Comm: Process PowerShell Template -templateName: "setup_user" -options: "{\"run\": true}"
```

**Result:** Script runs with `USERNAME=testuser` and `USER_ROLE=Admin`

---

## Override Variables in Feature

Change values without editing JSON:

```gherkin
* Comm: Process PowerShell Template -templateName: "setup_user" -options: "{\"run\": true, \"overrides\": {\"USER_ROLE\": \"Editor\"}}"
```
→ Runs with `USER_ROLE=Editor` (overriding the JSON value)

---

## That's All You Need! 

1. Create `.ps1` in `resources/powershell/`
2. Add variables to `resources/var.static.json`
3. Use the 3 steps in your feature file
4. Run tests: `npx playq --runner cucumber`
