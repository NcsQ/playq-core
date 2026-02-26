/**
 * Rerun Orchestrator - Coordinates the complete rerun workflow
 * 1. Extract failed tests from initial run reports
 * 2. Rerun failed tests
 * 3. Merge all reports
 * 
 * NOTE: This module is currently UNUSED and reserved for future programmatic rerun orchestration.
 * The active rerun workflow is implemented in src/scripts/rerun.ts (invoked via `npx playq rerun`).
 * This code may be wired up in the future for more advanced rerun scenarios or can be removed
 * if programmatic orchestration is not needed.
 */

import fs from 'fs';
import path from 'path';
import { execSync, spawnSync } from 'child_process';
import { extractFailedTests, createCucumberRerunFile, createPlaywrightRerunFile } from './rerunExtractor';
import { mergeAllReports } from './reportMerger';

export interface RerunConfig {
  initialReportDir: string;
  rerunReportDir: string;
  mergedReportDir: string;
  runner: 'playwright' | 'cucumber' | 'both';
  enableRerun: boolean;
}

/**
 * Execute rerun workflow: extract failures → rerun → merge reports
 */
export function executeRerunWorkflow(config: RerunConfig): boolean {
  try {
    console.log(`\n🔄 Starting RERUN workflow...`);
    console.log(`   Runner: ${config.runner}`);
    console.log(`   Initial reports: ${config.initialReportDir}`);
    console.log(`   Rerun reports: ${config.rerunReportDir}`);

    // Step 1: Extract failed tests from initial run
    console.log(`\n📊 Step 1: Extracting failed tests...`);
    const failedTests = extractFailedTests(config.initialReportDir, config.runner);

    if (failedTests.length === 0) {
      console.log(`✅ No failed tests found - all tests passed!`);
      return true;
    }

    console.log(`⚠️ Found ${failedTests.length} failed test(s) to rerun\n`);

    // Step 2: Prepare rerun files
    console.log(`📝 Step 2: Preparing rerun files...`);
    const projectRoot = process.cwd();

    if (config.runner === 'cucumber' || config.runner === 'both') {
      const cucumberRerunFile = path.join(projectRoot, '@rerun.txt');
      createCucumberRerunFile(failedTests, cucumberRerunFile);
    }

    if (config.runner === 'playwright' || config.runner === 'both') {
      const playwrightRerunFile = path.join(projectRoot, '.playwright-rerun');
      createPlaywrightRerunFile(failedTests, playwrightRerunFile);
    }

    // Step 3: Execute rerun
    console.log(`\n🚀 Step 3: Executing rerun...`);
    const rerunSuccess = executeRerun(config);

    // Step 3.5: Preserve rerun artifacts
    // Rerun execution writes to test-results/; copy those to rerunReportDir for merging
    if (fs.existsSync(path.join(projectRoot, 'test-results'))) {
      console.log(`\n📦 Preserving rerun artifacts...`);
      fs.mkdirSync(config.rerunReportDir, { recursive: true });
      const srcDir = path.join(projectRoot, 'test-results');
      const srcBlob = path.join(srcDir, 'blob-report');
      if (fs.existsSync(srcBlob)) {
        const destBlob = path.join(config.rerunReportDir, 'blob-report');
        if (fs.existsSync(destBlob)) fs.rmSync(destBlob, { recursive: true, force: true });
        fs.renameSync(srcBlob, destBlob);
      }
      const srcAllure = path.join(srcDir, 'allure-results');
      if (fs.existsSync(srcAllure)) {
        const destAllure = path.join(config.rerunReportDir, 'allure-results');
        if (fs.existsSync(destAllure)) fs.rmSync(destAllure, { recursive: true, force: true });
        fs.renameSync(srcAllure, destAllure);
      }
    }

    // Step 4: Merge reports
    console.log(`\n📦 Step 4: Merging reports...`);
    const outputDir = path.join(config.mergedReportDir);
    mergeAllReports(config.initialReportDir, config.rerunReportDir, outputDir, config.runner);

    // Step 5: Generate summary
    console.log(`\n📊 Step 5: Generating summary...`);
    generateRerunSummary(config.initialReportDir, config.rerunReportDir, outputDir, failedTests);

    console.log(`\n✅ Rerun workflow completed successfully!`);
    return rerunSuccess;
  } catch (err) {
    console.error(`\n❌ Rerun workflow failed:`, err);
    return false;
  }
}

/**
 * Execute the actual rerun based on runner type
 */
function executeRerun(config: RerunConfig): boolean {
  try {
    const projectRoot = process.cwd();

    if (config.runner === 'cucumber') {
      return executeCucumberRerun();
    } else if (config.runner === 'playwright') {
      return executePlaywrightRerun();
    } else {
      // Run both sequentially
      const cucumberOk = executeCucumberRerun();
      const playwrightOk = executePlaywrightRerun();
      return cucumberOk && playwrightOk;
    }
  } catch (err) {
    console.error('❌ Error executing rerun:', err);
    return false;
  }
}

/**
 * Execute Cucumber rerun using @rerun.txt
 */
function executeCucumberRerun(): boolean {
  try {
    const projectRoot = process.cwd();
    const rerunFile = path.join(projectRoot, '@rerun.txt');

    if (!fs.existsSync(rerunFile)) {
      console.log('⚠️ No Cucumber rerun file found');
      return true;
    }

    console.log(`\n🧪 Running Cucumber rerun...`);
    const env = { ...process.env, PLAYQ_RUNNER: 'cucumber' };

    const result = spawnSync('npx', [
      'cucumber-js',
      '--config',
      'cucumber.js',
      '--profile',
      'default',
      '@rerun.txt'
    ], {
      stdio: 'inherit',
      env,
      shell: false
    });

    if (result.error) {
      console.error('❌ Failed to spawn Cucumber process:', result.error.message);
      return false;
    }

    if (result.signal) {
      console.error(`❌ Cucumber process terminated by signal: ${result.signal}`);
      return false;
    }

    return (result.status ?? 1) === 0;
  } catch (err) {
    console.error('❌ Cucumber rerun failed:', err);
    return false;
  }
}

/**
 * Execute Playwright rerun using grep patterns
 */
function executePlaywrightRerun(): boolean {
  try {
    const projectRoot = process.cwd();
    const rerunFile = path.join(projectRoot, '.playwright-rerun');

    if (!fs.existsSync(rerunFile)) {
      console.log('⚠️ No Playwright rerun file found');
      return true;
    }

    const patterns = fs.readFileSync(rerunFile, 'utf-8')
      .split('\n')
      .filter(p => p.trim());

    if (patterns.length === 0) {
      console.log('⚠️ No Playwright patterns found for rerun');
      return true;
    }

    console.log(`\n🎭 Running Playwright rerun with ${patterns.length} failed test(s)...`);

    // Combine patterns into a single regex for efficiency
    // Escape special regex characters in test names
    const escapedPatterns = patterns.map(p => {
      // Escape regex special characters: . * + ? ^ $ { } [ ] ( ) |
      return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
    
    // Join patterns with OR operator: (pattern1|pattern2|pattern3)
    const combinedPattern = `(${escapedPatterns.join('|')})`;

    console.log(`📋 Running failed tests with grep: ${combinedPattern.substring(0, 80)}...`);

    // Run all failed tests in a single command
    const result = spawnSync('npx', [
      'playwright',
      'test',
      '--config=playq/config/playwright/playwright.config.js',
      `--grep=${combinedPattern}`
    ], {
      stdio: 'inherit',
      shell: false
    });

    if (result.error) {
      console.error('❌ Failed to spawn Playwright process:', result.error.message);
      return false;
    }

    if (result.signal) {
      console.error(`❌ Playwright process terminated by signal: ${result.signal}`);
      return false;
    }

    return (result.status ?? 1) === 0;
  } catch (err) {
    console.error('❌ Error executing Playwright rerun:', err);
    return false;
  }
}

/**
 * Generate a summary report of the rerun
 */
function generateRerunSummary(
  initialDir: string,
  rerunDir: string,
  mergedDir: string,
  failedTests: any[]
): void {
  try {
    const summary = {
      timestamp: new Date().toISOString(),
      totalFailed: failedTests.length,
      failedTests: failedTests.map(t => ({
        name: t.name,
        type: t.type,
        identifier: t.identifier
      })),
      initialReportDir: initialDir,
      rerunReportDir: rerunDir,
      mergedReportDir: mergedDir,
      reportLocations: {
        blobReport: path.join(mergedDir, 'report-merged.jsonl'),
        allureResults: path.join(mergedDir, 'allure-results-merged'),
        cucumberReport: path.join(mergedDir, 'cucumber-merged.json')
      }
    };

    const summaryFile = path.join(mergedDir, 'rerun-summary.json');
    fs.mkdirSync(mergedDir, { recursive: true });
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf-8');

    console.log(`\n📋 Rerun Summary:`);
    console.log(`   - Failed tests in rerun: ${failedTests.length}`);
    console.log(`   - Merged reports: ${mergedDir}`);
    console.log(`   - Summary file: ${summaryFile}`);
  } catch (err) {
    console.error('❌ Error generating rerun summary:', err);
  }
}
