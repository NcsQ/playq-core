import { spawnSync, execSync, spawn } from 'child_process';
import minimist from 'minimist';
import { loadEnv } from '../helper/bundle/env';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { extractFailedTests, createCucumberRerunFile, createPlaywrightRerunFile } from './rerunExtractor';
// Note: remove stray invalid import; runner does not need faker

/**
 * Clean up test-results directory before running tests
 */
function cleanupTestResults(): void {
  // Skip cleanup during rerun operations - we need to preserve original results
  if (process.env.PLAYQ_IS_RERUN === 'true') {
    console.log('ℹ️  Skipping cleanup (rerun in progress)');
    return;
  }

  const projectRoot = process.cwd();
  const testResultsDir = path.join(projectRoot, 'test-results');
  
  if (fs.existsSync(testResultsDir)) {
    try {
      fs.rmSync(testResultsDir, { recursive: true, force: true });
      console.log('🧹 Cleaned up test-results directory');
    } catch (error) {
      console.log('⚠️ Failed to clean test-results:', (error as any)?.message || error);
    }
  }
}

// loadEnv();
// console.log('  - Runner (PLAYQ_ENV):', process.env.PLAYQ_ENV );
// console.log('  - Runner (PLAYQ_RUNNER):', process.env.PLAYQ_RUNNER );
// console.log('  - Runner (PLAYQ_GREP):', process.env.PLAYQ_GREP );
// console.log('  - Runner (PLAYQ_TAGS):', process.env.PLAYQ_TAGS );
// console.log('  - Runner (PLAYQ_PROJECT):', process.env.PLAYQ_PROJECT );
// console.log('  - Env (RUNNER - cc_card_type):', process.env['cc_card_type']);
// console.log('  - Env (RUNNER - config.testExecution.timeout):', process.env['config.testExecution.timeout'] );

if (process.env.PLAYQ_RUNNER && process.env.PLAYQ_RUNNER === 'cucumber') {
  // Allow vars to initialize in the cucumber child process (do NOT set PLAYQ_NO_INIT_VARS here)
  // Ensure legacy TEST_RUNNER flag used by helper code is set
  process.env.TEST_RUNNER = 'cucumber';
  
  // LOG FOR DEBUGGING TAG FILTERING
  console.log(`🔍 Cucumber block: PLAYQ_TAGS = "${process.env.PLAYQ_TAGS}", PLAYQ_RUNNER = "${process.env.PLAYQ_RUNNER}"`);
  
  // PRESERVE CLI-SET ENVIRONMENT VARIABLES BEFORE loadEnv() potentially overwrites them
  const cliTags = process.env.PLAYQ_TAGS;
  console.log(`💾 Saved cliTags = "${cliTags}"`);
  const cliGrep = process.env.PLAYQ_GREP;
  const cliEnv = process.env.PLAYQ_ENV;
  const cliProject = process.env.PLAYQ_PROJECT;
  
  // Provide a default browser type if none supplied via config/env
  if (!process.env['PLAYQ__browser__browserType'] && !process.env['browser.browserType']) {
    process.env.PLAYQ__browser__browserType = 'chromium';
  }
  loadEnv();
  
  // RESTORE CLI-SET ENV VARS after loadEnv() in case they were lost
  if (cliTags) process.env.PLAYQ_TAGS = cliTags;
  if (cliGrep) process.env.PLAYQ_GREP = cliGrep;
  if (cliEnv && !process.env.PLAYQ_ENV) process.env.PLAYQ_ENV = cliEnv;
  if (cliProject && !process.env.PLAYQ_PROJECT) process.env.PLAYQ_PROJECT = cliProject;
  
  // Clean up test results before running
  cleanupTestResults();

  const cucumberArgs = [
    'cucumber-js',
    '--config',
    'cucumber.js',
    '--profile',
    'default',
  ];
  
  // Add tags if present (from CLI or environment)
  const tagsToUse = process.env.PLAYQ_TAGS || cliTags;
  if (tagsToUse) {
    cucumberArgs.push('--tags', tagsToUse);
    console.log(`📝 Using tags: ${tagsToUse}`);
  } else {
    console.log(`📝 No tags specified - running all scenarios`);
  }

  console.log(`🎭 Running Cucumber: npx ${cucumberArgs.join(' ')}`);
  
  const run = spawn('npx', cucumberArgs, {
    stdio: 'inherit',
    env: { ...process.env },
    shell: true,
  });

  run.on('close', (code, signal) => {
    try {
      const pkgPath = path.resolve(process.cwd(), 'package.json');
      const pkg = require(pkgPath);
      if (pkg.scripts && pkg.scripts['posttest:cucumber']) {
        execSync('npm run posttest:cucumber', { stdio: 'inherit' });
      } else {
        console.log('ℹ️ Skipping posttest:cucumber (script not defined)');
      }
    } catch (err) {
      console.log('ℹ️ Posttest check failed, continuing:', (err as any)?.message || err);
    }

    // Convert code/signal to exit code: null code with signal is a failure
    const exitCode = code ?? (signal ? 1 : 0);
    // Always save failed tests for potential manual rerun
    saveFailedTestsIfAny(exitCode);
  });
} else {
  if (process.env.PLAYQ_RUN_CONFIG) {
    // Dynamically import the run_config object from the specified run config file
    // Look for run config in the user's project root
    const runConfigPath = path.resolve(process.cwd(), `resources/run-configs/${process.env.PLAYQ_RUN_CONFIG}.run`);
    const runConfig = require(runConfigPath).default;
    console.log('🌐 Running with runConfig:', JSON.stringify(runConfig));
    
    let overallExitCode = 0;
    
    for (const cfg of runConfig.runs) {

      console.log(`    - Running test with grep: ${cfg.PLAYQ_GREP}, env: ${cfg.PLAYQ_ENV}`);
      Object.keys(cfg).forEach(key => {
        if (key.trim() == 'PLAYQ_RUNNER') throw new Error('PLAYQ_RUNNER is not allowed in run configs');
        process.env[key] = cfg[key];
        console.log(`Setting ${key} = ${cfg[key]}`);
      });
  process.env.PLAYQ_NO_INIT_VARS = '1';
  loadEnv();
      const command = `npx playwright test --config=playq/config/playwright/playwright.config.js${process.env.PLAYQ_GREP ? ` --grep="${process.env.PLAYQ_GREP}"` : ''
        }${process.env.PLAYQ_PROJECT ? ` --project="${process.env.PLAYQ_PROJECT}"` : ''}`;

  const childEnv = { ...process.env } as any;
      // Ensure child initializes vars by removing the parent-side guard
      delete childEnv.PLAYQ_NO_INIT_VARS;
  const preload = '-r ts-node/register';
      childEnv.NODE_OPTIONS = childEnv.NODE_OPTIONS
        ? `${childEnv.NODE_OPTIONS} ${preload}`
        : preload;
      // Ensure core and project roots propagate to child
      if (!childEnv.PLAYQ_CORE_ROOT) childEnv.PLAYQ_CORE_ROOT = path.resolve(__dirname, '..');
      if (!childEnv.PLAYQ_PROJECT_ROOT) childEnv.PLAYQ_PROJECT_ROOT = process.cwd();
      // Point ts-node to the project's tsconfig for path aliases
      const projectTsConfig = path.resolve(process.cwd(), 'tsconfig.json');
      childEnv.TS_NODE_PROJECT = projectTsConfig;
      childEnv.TS_NODE_TRANSPILE_ONLY = childEnv.TS_NODE_TRANSPILE_ONLY || 'true';
      const result = spawnSync(command, {
        stdio: 'inherit',
        shell: true,
        env: childEnv,
      });
      
      // Capture exit code from this run (handle signal terminations)
      const exitCode = result.status ?? (result.signal ? 1 : 0);
      if (exitCode !== 0) {
        overallExitCode = exitCode;
      }

    }

    // Always save failed tests for potential manual rerun
    saveFailedTestsIfAny(overallExitCode);
  } else {
  process.env.PLAYQ_NO_INIT_VARS = '1';
  loadEnv();
  
  // Clean up test results before running
  cleanupTestResults();

  const command = `npx playwright test --config=playq/config/playwright/playwright.config.js${process.env.PLAYQ_GREP ? ` --grep="${process.env.PLAYQ_GREP}"` : ''
      }${process.env.PLAYQ_PROJECT ? ` --project="${process.env.PLAYQ_PROJECT}"` : ''}`;

  const childEnv = { ...process.env } as any;
    // Ensure child initializes vars by removing the parent-side guard
    delete childEnv.PLAYQ_NO_INIT_VARS;
  const preload = '-r ts-node/register';
    childEnv.NODE_OPTIONS = childEnv.NODE_OPTIONS
      ? `${childEnv.NODE_OPTIONS} ${preload}`
      : preload;
    // Ensure core and project roots propagate to child
    if (!childEnv.PLAYQ_CORE_ROOT) childEnv.PLAYQ_CORE_ROOT = path.resolve(__dirname, '..');
    if (!childEnv.PLAYQ_PROJECT_ROOT) childEnv.PLAYQ_PROJECT_ROOT = process.cwd();
    // Point ts-node to the project's tsconfig for path aliases
    const projectTsConfig = path.resolve(process.cwd(), 'tsconfig.json');
    childEnv.TS_NODE_PROJECT = projectTsConfig;
    childEnv.TS_NODE_TRANSPILE_ONLY = childEnv.TS_NODE_TRANSPILE_ONLY || 'true';
    const result = spawnSync(command, {
      stdio: 'inherit',
      shell: true,
      env: childEnv,
    });

    // Always save failed tests for potential manual rerun
    console.log(`\n📋 Test execution completed with exit code: ${result.status ?? 1}`);
    saveFailedTestsIfAny(result.status ?? 1);
  }

}

/**
 * Save failed tests from the current test run for potential manual rerun
 * Creates both .playq-failed-tests.json (for npx playq rerun) and @rerun.txt/@rerun.pw (for direct cucumber-js/playwright-cli)
 */
function saveFailedTestsIfAny(exitCode: number): void {
  const debug = process.env.PLAYQ_DEBUG === 'true';
  if (debug) console.log(`🔍 [DEBUG] saveFailedTestsIfAny called with exit code: ${exitCode}`);
  const projectRoot = process.cwd();
  const runner = (process.env.PLAYQ_RUNNER || 'playwright') as 'playwright' | 'cucumber';
  const reportDir = path.join(projectRoot, 'test-results');
  const failedTestsFile = path.join(projectRoot, '.playq-failed-tests.json');

  try {
    // Extract failed tests from reports
    if (debug) console.log(`🔍 [DEBUG] Extracting failed tests from: ${reportDir}`);
    const failedTests = extractFailedTests(reportDir, runner);
    if (debug) console.log(`🔍 [DEBUG] Found ${failedTests.length} failed tests`);

    if (failedTests.length > 0) {
      // Save failed tests metadata to .playq-failed-tests.json
      const failureData = {
        runner,
        timestamp: new Date().toISOString(),
        exitCode,
        count: failedTests.length,
        tests: failedTests
      };

      fs.writeFileSync(failedTestsFile, JSON.stringify(failureData, null, 2));
      console.log(`\n💾 Saved ${failedTests.length} failed test(s) to ${failedTestsFile}`);

      // Create rerun files for direct test runner invocation
      if (runner === 'cucumber') {
        const cucumberRerunFile = path.join(projectRoot, '@rerun.txt');
        createCucumberRerunFile(failedTests, cucumberRerunFile);
        console.log(`   Created ${cucumberRerunFile} (for direct cucumber-js invocation)`);
      }
      if (runner === 'playwright') {
        const playwrightRerunFile = path.join(projectRoot, '.playwright-rerun');
        createPlaywrightRerunFile(failedTests, playwrightRerunFile);
        console.log(`   Created ${playwrightRerunFile} (for direct playwright invocation)`);
      }

      console.log(`   Run 'npx playq rerun' to rerun only failed tests\n`);
    } else if (fs.existsSync(failedTestsFile)) {
      // Clean up old failure file if all tests passed
      fs.unlinkSync(failedTestsFile);
      // Also clean up old rerun files
      const cucumberRerunFile = path.join(projectRoot, '@rerun.txt');
      const playwrightRerunFile = path.join(projectRoot, '.playwright-rerun');
      if (fs.existsSync(cucumberRerunFile)) fs.unlinkSync(cucumberRerunFile);
      if (fs.existsSync(playwrightRerunFile)) fs.unlinkSync(playwrightRerunFile);
      console.log('✅ All tests passed - removed old failure files');
    }
  } catch (err) {
    console.log('⚠️ Could not save failed tests:', (err as any)?.message || err);
  }

  process.exit(exitCode);
}

// NOTE: Manual rerun handler was removed because it was never invoked in this module,
// which made the rerun-orchestration path dead code. The rerun workflow is instead
// triggered by the npx playq rerun command which is handled by src/scripts/rerun.ts

// console.log('  - Runner (PLAYQ_ENV):', process.env.PLAYQ_ENV );
// console.log('  - Runner (PLAYQ_RUNNER):', process.env.PLAYQ_RUNNER );
// console.log('  - Runner (PLAYQ_GREP):', process.env.PLAYQ_GREP );
// console.log('  - Runner (PLAYQ_TAGS):', process.env.PLAYQ_TAGS );
// console.log('  - Runner (PLAYQ_PROJECT):', process.env.PLAYQ_PROJECT );
// console.log('  - Env (RUNNER - cc_card_type):', process.env.cc_card_type );


// let runner = 'playwright';
// let env = '';
// let grep = '';
// let tags = '';
// let prj = '';
// console.log('🌐 os.platform():', os.platform());

// // Use minimist for all platforms for consistency
// const args = minimist(process.argv.slice(2));

// // Try npm_config_* first (for npm script context), then fall back to minimist
// grep = process.env.npm_config_grep || args.grep || '';
// env = process.env.npm_config_env || args.env || '';
// tags = process.env.npm_config_tags || args.tags || '';
// prj = process.env.npm_config_project || args.project || '';
// runner = ['cucumber', 'bdd', 'cuke'].includes(
//   (process.env.npm_config_runner || args.runner || '').toLowerCase()
// )
//   ? 'cucumber'
//   : 'playwright';

// console.log('🌐 grep:', grep);
// console.log('🌐 env:', env);
// console.log('🌐 tags:', tags);
// console.log('🌐 prj:', prj);
// console.log('🌐 runner:', runner);

// // Debug information
// console.log('🔍 Debug - process.argv:', process.argv);
// console.log('🔍 Debug - minimist args:', args);
// console.log('🔍 Debug - npm_config_env:', process.env.npm_config_env);
// console.log('🔍 Debug - npm_config_grep:', process.env.npm_config_grep);

// process.env.TS_NODE_PROJECT = './tsconfig.json';
// require('tsconfig-paths').register();

// console.log('🌐 Running tests with args:', process.argv);
// console.log(process.platform);
// console.log(process.env.npm_config_env);

// process.env.TEST_RUNNER = runner;
// if (tags) process.env.TAGS = tags;
// if (grep) process.env.GREP = grep;
// if (prj) process.env.PROJECT = prj;

// if (env) {
//   process.env.RUN_ENV = env;
//   loadEnv(env);
// }

// if (runner === 'cucumber') {
//   execSync('npm run pretest:cucumber', { stdio: 'inherit' });

//   const cucumberArgs = [
//     'cucumber-js',
//     '--config',
//     'cucumber.js',
//     '--profile',
//     'default',
//   ];
//   if (tags) cucumberArgs.push('--tags', tags);

//   console.log(`🚀 Running Cucumber with args: ${cucumberArgs.join(' ')}`);
//   console.log('📦 Final Cucumber command:', `npx ${cucumberArgs.join(' ')}`);

//   const run = spawn('npx', cucumberArgs, {
//     stdio: 'inherit',
//     env: { ...process.env, RUN_ENV: env, PROJECT: prj },

//     shell: true,
//   });

//   run.on('close', (code) => {
//     execSync('npm run posttest:cucumber', { stdio: 'inherit' });
//     process.exit(code);
//   });
// } else if (runner === 'playwright') {
//   try {
//     execSync('npm run pretest:playwright', { stdio: 'inherit' });
//   } catch (error) {
//     console.log(
//       '⚠️  Pre-test cleanup had some issues, but continuing with tests...'
//     );
//   }

//   const command = `npx playwright test --config=config/playwright/playwright.config.ts${
//     grep ? ` --grep='${grep}'` : ''
//   }${prj ? ` --project=${prj}` : ''}`;

//   const result = spawnSync(command, {
//     stdio: 'inherit',
//     shell: true,
//     env: { ...process.env, RUN_ENV: env, PROJECT: prj },
//   });

//   try {
//     execSync('npm run posttest:playwright', { stdio: 'inherit' });
//   } catch (error) {
//     console.log(
//       '⚠️  Post-test reporting had some issues, but test execution completed.'
//     );
//   }

//   process.exit(result.status || 0);
// } else {
//   console.error(`❌ Unknown runner: ${runner}`);
//   process.exit(1);
// }
