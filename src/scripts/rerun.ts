import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import minimist from 'minimist';

function readLines(filePath: string): string[] {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function removeDirSafe(dir: string) {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch {/* ignore */}
}

function getPlaywrightFailedFiles(projectRoot: string, folder?: string): string[] {
  // Try reading Playwright JSON report commonly found under test-results/playwright-report/playwright-report.json
  const reportPath = path.join(projectRoot, 'test-results/playwright-report', 'playwright-report.json');
  try {
    const json = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    const files: string[] = [];
    // Normalize folder filter: remove 'tests/playwright/' prefix if present
    let folderFilter = folder;
    if (folderFilter) {
      folderFilter = folderFilter.replace(/^tests[\\/]playwright[\\/]/, '').replace(/\\/g, '/');
    }
    // Traverse tests and collect failed test file paths
    if (Array.isArray(json?.suites)) {
      for (const suite of json.suites) {
        if (folderFilter && !suite.file.startsWith(folderFilter)) continue;
        for (const spec of (suite.specs || [])) {
          for (const test of (spec.tests || [])) {
            if (Array.isArray(test.results)) {
              // Check for any non-passing status (failed, interrupted, timedOut)
              const anyFail = test.results.some((r: any) => 
                r.status === 'failed' || r.status === 'interrupted' || r.status === 'timedOut'
              );
              if (anyFail) {
                // Add full test file path - use reported file path from report (not hardcoded 'tests/playwright')
                const filePath = path.join(projectRoot, suite.file);
                if (!files.includes(filePath)) {
                  files.push(filePath);
                }
              }
            }
          }
        }
      }
    }
    return files;
  } catch {
    return [];
  }
}

function runPlaywrightGrep(projectRoot: string, files: string[], env?: string, project?: string, attemptNum: number = 1): number {
  try {
    console.log(`📁 Project root: ${projectRoot}`);
    console.log(`📄 Files to run: ${files.join(', ')}`);
    
    // Convert absolute file paths to relative paths for Playwright
    const relFiles = files.map(f => {
      if (path.isAbsolute(f)) {
        return path.relative(projectRoot, f).replace(/\\/g, '/');
      }
      return f.replace(/\\/g, '/');
    });
    console.log(`📄 Relative files: ${relFiles.join(', ')}`);
    
    // Use relative config path
    const relConfigPath = 'playq/config/playwright/playwright.config.js';
    const absConfigPath = path.join(projectRoot, relConfigPath);
    console.log(`⚙️  Config: ${relConfigPath}`);
    console.log(`✅ Config exists: ${fs.existsSync(absConfigPath)}`);
    
    // Preserve original blob reports before first rerun
    const blobReport = path.join(projectRoot, 'test-results/blob-report');
    const blobReportFull = path.join(projectRoot, 'test-results/blob-report_full');
    
    if (attemptNum === 1 && fs.existsSync(blobReport)) {
      console.log(`📦 Preserving original blob reports: blob-report → blob-report_full`);
      // Remove old blob-report_full if exists
      removeDirSafe(blobReportFull);
      // Rename current blob-report to blob-report_full
      fs.renameSync(blobReport, blobReportFull);
    }
    
    // Selective cleanup before rerun (preserve blob-report_full and blob-report_merge)
    removeDirSafe(path.join(projectRoot, 'test-results/artifacts'));
    removeDirSafe(path.join(projectRoot, 'test-results/playwright-report'));
    removeDirSafe(path.join(projectRoot, 'test-results/blob-report'));
    
    // Build command array: npx playwright test <relative-files> --config=<relative-config> [--project ...]
    const args = ['playwright', 'test', ...relFiles, `--config=${relConfigPath}`];

    // Add --project option if provided (prefer function parameter over parsing argv)
    if (project) {
      if (Array.isArray(project)) {
        project.forEach(p => args.push(`--project=${p}`));
      } else {
        args.push(`--project=${project}`);
      }
    }

    console.log(`🎭 Running: npx ${args.join(' ')}`);
    
    const envVars: NodeJS.ProcessEnv = { ...process.env, PLAYQ_ENV: env || 'default', PLAYQ_IS_RERUN: 'true' };
    const result = spawnSync('npx', args, { cwd: projectRoot, stdio: 'inherit', env: envVars, shell: true });
    console.log(`   Exit code: ${result.status ?? 1}`);
    if (result.error) {
      console.error(`   Error: ${result.error.message}`);
    }
    return result.status ?? 1;
  } catch (err) {
    console.error(`❌ Error in runPlaywrightGrep:`, err);
    return 1;
  }
}

function runCucumberRerun(projectRoot: string, rerunFile: string, env?: string): number {
  const cucumberJs = 'cucumber-js';
  const nestedConfigPath = path.join(projectRoot, 'playq', 'config', 'cucumber', 'cucumber.js');
  const rootConfigPath = path.join(projectRoot, 'cucumber.js');
  
  let configPath: string;
  if (fs.existsSync(nestedConfigPath)) {
    configPath = nestedConfigPath;
  } else if (fs.existsSync(rootConfigPath)) {
    configPath = rootConfigPath;
  } else {
    console.error(`❌ ERROR: Cucumber config not found!`);
    console.error(`   Checked: ${nestedConfigPath}`);
    console.error(`   Checked: ${rootConfigPath}`);
    console.error(`   Please ensure cucumber.js exists in project root or playq/config/cucumber/`);
    process.exit(1);
  }
  
  // Convert absolute paths to relative for cucumber-js (it runs from projectRoot cwd)
  // Normalize to forward slashes for cucumber-js cross-platform compatibility
  const relConfigPath = path.relative(projectRoot, configPath).replace(/\\/g, '/');
  
  // Read @rerun.txt and extract scenario paths (one per line, e.g., _Temp/execution/forms.feature:8)
  let scenarioPaths: string[] = [];
  if (fs.existsSync(rerunFile)) {
    const content = fs.readFileSync(rerunFile, 'utf-8').trim();
    if (content) {
      // Each line is a scenario path like: _Temp/execution/forms.feature:8
      scenarioPaths = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => line.replace(/\\/g, '/'));  // Normalize backslashes to forward slashes
    }
  }
  
  // If no scenarios found, skip rerun
  if (scenarioPaths.length === 0) {
    console.log('📋 No scenarios found in rerun file.');
    return 0;
  }
  
  // Build arguments: use default profile with scenario paths
  // Scenario paths specified as CLI args take precedence over paths in config
  const args = [cucumberJs, '--config', relConfigPath, ...scenarioPaths];
  const envVars: NodeJS.ProcessEnv = { ...process.env };
  if (env) envVars.PLAYQ_ENV = env;
  envVars.PLAYQ_IS_RERUN = 'true';  // Signal to runner to preserve original results
  
  console.log(`📋 Rerun file: ${path.relative(projectRoot, rerunFile)}`);
  console.log(`📊 Scenarios to rerun: ${scenarioPaths.length}`);
  console.log(`⚙️  Config: ${relConfigPath}`);
  console.log(`🎭 Running: npx ${args.join(' ')}`);
  
  // Selective cleanup: remove artifacts but preserve blob-report for merging
  removeDirSafe(path.join(projectRoot, 'test-results/artifacts'));
  removeDirSafe(path.join(projectRoot, 'test-results/cucumber-report.html'));
  removeDirSafe(path.join(projectRoot, 'test-results/cucumber-report.json'));
  
  const result = spawnSync('npx', args, { cwd: projectRoot, stdio: 'inherit', env: envVars, shell: true });
  if (result.error) {
    console.error(`❌ Spawn error: ${result.error.message}`);
  }
  console.log(`Exit code: ${result.status ?? 1}`);
  return result.status ?? 1;
}

function printHelp() {
  console.log(`
Usage: npx playq rerun [options]

Rerun failed tests from the previous test run.

Options:
  --runner, -r <type>    Test runner to use ("playwright" or "cucumber")
                         Default: "playwright"
  --env, -e <name>       Environment name (passed as PLAYQ_ENV)
                         Default: "default"
  --file, -f <path>      Path to a custom rerun file (one test per line)
  --folder <path>        Folder filter for rerun (Playwright only)
  --project, -p <name>   Playwright project name
  --attempts, -a <num>   Number of rerun attempts
                         Default: 1
  --help, -h             Show this help message and exit

Examples:
  npx playq rerun
  npx playq rerun --runner cucumber --env staging
  npx playq rerun --attempts 3
`);
}

function main() {
  const argv = minimist(process.argv.slice(2), {
    string: ['runner', 'env', 'file', 'project', 'folder'],
    boolean: ['help'],
    alias: { r: 'runner', e: 'env', f: 'file', a: 'attempts', p: 'project', h: 'help' },
    default: { attempts: 1 }
  });

  if (argv.help) {
    printHelp();
    return;
  }
  const projectRoot = process.cwd();
  const env = argv.env || 'default';
  
  const attemptsArg = argv.attempts ? Number(argv.attempts) : 1;
  if (!Number.isInteger(attemptsArg) || attemptsArg < 1) {
    console.error(`❌ ERROR: --attempts must be a positive integer (got: ${argv.attempts})`);
    process.exit(1);
  }
  const attempts = attemptsArg;
  
  // AUTO-DETECT RUNNER if not specified (prefer most recent artifact)
  let runner = argv.runner;
  if (!runner) {
    const cucumberRerunFile = path.join(projectRoot, '@rerun.txt');
    const playqFailedTestsJson = path.join(projectRoot, '.playq-failed-tests.json');
    const playwrightRerunFile = path.join(projectRoot, '.playwright-rerun');
    const playwrightReportJson = path.join(projectRoot, 'test-results/playwright-report/playwright-report.json');
    
    // Get modification times to pick most recent artifact
    const getModTime = (filePath: string): number => {
      try {
        return fs.statSync(filePath).mtimeMs;
      } catch {
        return 0;
      }
    };
    
    const cucumberTime = fs.existsSync(cucumberRerunFile) ? getModTime(cucumberRerunFile) : 0;
    const playwrightJsonTime = fs.existsSync(playqFailedTestsJson) ? getModTime(playqFailedTestsJson) : 0;
    const playwrightRerunTime = fs.existsSync(playwrightRerunFile) ? getModTime(playwrightRerunFile) : 0;
    const reportJsonTime = fs.existsSync(playwrightReportJson) ? getModTime(playwrightReportJson) : 0;
    
    const maxPlaywrightTime = Math.max(playwrightJsonTime, playwrightRerunTime, reportJsonTime);
    
    if (cucumberTime > 0 && cucumberTime >= maxPlaywrightTime) {
      runner = 'cucumber';
      console.log('🔍 Auto-detected runner: cucumber (found @rerun.txt)');
    } else if (maxPlaywrightTime > 0) {
      runner = 'playwright';
      const source = playwrightJsonTime > 0 ? '.playq-failed-tests.json' :
                     playwrightRerunTime > 0 ? '.playwright-rerun' : 'playwright-report.json';
      console.log(`🔍 Auto-detected runner: playwright (found ${source})`);
    } else {
      runner = 'playwright'; // fallback
      console.log('⚠️  No rerun artifacts found, defaulting to playwright');
    }
  }
  const project = argv.project;
  const fileArg = argv.file as string | undefined;
  const folderArg = argv.folder as string | undefined;

  if (runner === 'playwright') {
    // Determine initial patterns: from file if provided, else from last report
    let files: string[] = [];
    if (fileArg) {
      // If fileArg is provided, treat as a file path or list of files
      const filePaths = readLines(path.isAbsolute(fileArg) ? fileArg : path.join(projectRoot, fileArg));
      files = filePaths;
    } else {
      // Try to read from HTML report (exists if merge-reports was run previously)
      files = getPlaywrightFailedFiles(projectRoot, folderArg);
      
      // Fallback: if no files found from report, try .playwright-rerun file (created after initial test run)
      if (!files.length) {
        const playwrightRerunPath = path.join(projectRoot, '.playwright-rerun');
        if (fs.existsSync(playwrightRerunPath)) {
          console.log('📋 HTML report not found, falling back to .playwright-rerun file');
          files = readLines(playwrightRerunPath);
        }
      }
    }
    console.log(`📋 Detected ${files.length} failed test file(s):`);
    files.forEach(f => console.log(`   - ${f}`));
    if (!files.length) {
      console.log('No failed tests found to rerun.');
      process.exit(0);
    }
    let lastStatus = 1;
    for (let i = 1; i <= attempts; i++) {
      console.log(`\n▶ Rerun attempt ${i}/${attempts} (Playwright)`);
      lastStatus = runPlaywrightGrep(projectRoot, files, env, project, i);
      
      // If attempt passed (status 0), all tests are passing - we're done
      if (lastStatus === 0) {
        console.log('✅ All rerun tests passed.');
        break;
      }
      
      // Attempt failed, recompute failures for next iteration 
      files = getPlaywrightFailedFiles(projectRoot, folderArg);
      
      // Fallback if report generation failed (defensive: use .playwright-rerun)
      if (!files.length && i < attempts) { // Only if more attempts remain
        const playwrightRerunPath = path.join(projectRoot, '.playwright-rerun');
        if (fs.existsSync(playwrightRerunPath)) {
          const fallbackFiles = readLines(playwrightRerunPath);
          if (fallbackFiles.length > 0) {
            console.log('⚠️  HTML report unavailable, using .playwright-rerun fallback');
            files = fallbackFiles;
          }
        }
      }
      
      // If still no failures found or no more attempts, stop
      if (!files.length) {
        console.log('✅ All rerun tests passed.');
        break;
      }
    }
    process.exit(lastStatus);
  } else if (runner === 'cucumber') {
    const rerunFile = fileArg || '@rerun.txt';
    const absRerun = path.isAbsolute(rerunFile) ? rerunFile : path.join(projectRoot, rerunFile);
    if (!fs.existsSync(absRerun)) {
      console.log(`Rerun file not found: ${absRerun}`);
      process.exit(1);
    }
    // Check if rerun file has content (not empty)
    const rerunContent = readLines(absRerun);
    if (rerunContent.length === 0) {
      console.log('✅ No failed scenarios to rerun (empty rerun file).');
      process.exit(0);
    }
    let lastStatus = 1;
    for (let i = 1; i <= attempts; i++) {
      console.log(`\n▶ Rerun attempt ${i}/${attempts} (Cucumber)`);
      lastStatus = runCucumberRerun(projectRoot, absRerun, env);
      // Cucumber rerun plugin should rewrite the file with remaining failures; if empty, stop
      const remaining = readLines(absRerun);
      if (!remaining.length) {
        console.log('✅ All rerun scenarios passed.');
        break;
      }
    }
    process.exit(lastStatus);
  } else {
    console.log(`Unsupported runner: ${runner}`);
    process.exit(1);
  }
}

main();
