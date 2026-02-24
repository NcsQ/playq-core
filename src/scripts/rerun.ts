import fs from 'fs';
import path from 'path';
import { spawnSync, execSync } from 'child_process';
import minimist from 'minimist';

// Simple utility to escape grep patterns for Playwright
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}

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
                // Add full test file path
                const filePath = path.join(projectRoot, 'tests', 'playwright', suite.file);
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
    
    // Build command: npx playwright test <relative-files> --config=<relative-config>
    const filesArg = relFiles.map(f => `"${f}"`).join(' ');
    const cmd = `npx playwright test ${filesArg} --config="${relConfigPath}"`;
    console.log(`🎭 Running: ${cmd}`);
    
    try {
      // Use execSync with shell to properly handle PATH and npx availability
      execSync(cmd, { cwd: projectRoot, stdio: 'inherit', env: { ...process.env, PLAYQ_ENV: env || 'default', PLAYQ_IS_RERUN: 'true' } });
      console.log(`   Exit code: 0`);
      return 0;
    } catch (err: any) {
      // execSync throws on non-zero exit, but we still want to return the exit code
      console.log(`   Exit code: ${err.status}`);
      return err.status ?? 1;
    }
  } catch (err) {
    console.error(`❌ Error in runPlaywrightGrep:`, err);
    return 1;
  }
}

function runCucumberRerun(projectRoot: string, rerunFile: string, env?: string): number {
  const cucumberJs = 'cucumber-js';
  const configPath = path.join(projectRoot, 'playq', 'config', 'cucumber', 'cucumber.js');
  const args = [cucumberJs, '--config', configPath, rerunFile];
  const envVars: NodeJS.ProcessEnv = { ...process.env };
  if (env) envVars.PLAYQ_ENV = env;
  // Cleanup artifacts before rerun
  removeDirSafe(path.join(projectRoot, 'test-results'));
  const result = spawnSync('npx', args, { cwd: projectRoot, stdio: 'inherit', env: envVars });
  return result.status ?? 1;
}

async function main() {
  const argv = minimist(process.argv.slice(2), {
    string: ['runner', 'env', 'file', 'project', 'folder'],
    alias: { r: 'runner', e: 'env', f: 'file', a: 'attempts', p: 'project' },
    default: { attempts: 1 }
  });
  const attempts = Number(argv.attempts) || 1;
  const runner = argv.runner || 'playwright';
  const projectRoot = process.cwd();
  const env = argv.env || 'default';
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
      files = getPlaywrightFailedFiles(projectRoot, folderArg);
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
      // Recompute failures for next iteration
      files = getPlaywrightFailedFiles(projectRoot, folderArg);
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

main().catch(err => {
  console.error(err);
  process.exit(1);
});
