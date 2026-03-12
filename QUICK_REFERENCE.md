# 📋 PlayQ CLI Quick Reference Card

## One-Liner Commands

```bash
# Help
npx playq ps-template --help

# Process template
npx playq ps-template db_run_script

# Process + override variable
npx playq ps-template db_run_script --set DB_HOST=localhost

# Process + multiple variables
npx playq ps-template db_run_script --set DB_HOST=localhost --set DB_PORT=5432

# Process + execute
npx playq ps-template db_run_script --run

# Dry-run (preview only)
npx playq ps-template db_run_script --dry-run

# Process + override + execute
npx playq ps-template db_run_script --set DB_HOST=prod --run
```

---

## File Locations

| Purpose | Location |
|---------|----------|
| PowerShell templates | `resources/powershell/*.ps1` |
| Default variables | `resources/var.static.json` |
| Generated scripts | `test-data/*_processed.ps1` |
| Test scenarios | `tests/bdd/scenarios/*.feature` |

---

## Choose Your Path

| Want to... | Use... | Command |
|-----------|--------|---------|
| Test in terminal | CLI | `npx playq ps-template db_run` |
| Document for team | BDD | Feature files + `@powershell` tags |
| Custom automation | Programmatic | `require('@playq/core')` |

---

## Typical Workflow

```bash
# 1. Preview what will happen
npx playq ps-template db_run_script --set DB_HOST=localhost --dry-run

# 2. Create the script
npx playq ps-template db_run_script --set DB_HOST=localhost

# 3. Run the generated script
powershell -File ./test-data/db_run_script_processed.ps1

# Or combine steps 2-3:
npx playq ps-template db_run_script --set DB_HOST=localhost --run
```

---

## Variable Priority (highest to lowest)

1. **CLI --set flags** (highest priority)
2. Variables from `resources/var.static.json`
3. Environment variables (lowest priority)

---

## Status Codes

- **Exit 0**: Success
- **Exit 1**: Template not found or processing failed

---

**Last Updated**: March 3, 2026
