import { loadEnv } from '../helper/bundle/env';
import path from 'path';
import { rmSync, existsSync, unlinkSync } from 'fs';

export function setupEnvironment() {
  loadEnv();

  // Skip cleanup if this is a rerun (rerun.ts handles selective cleanup)
  const isRerun = process.env.PLAYQ_IS_RERUN === 'true';
  const projectRoot = process.env['PLAYQ_PROJECT_ROOT'] || process.cwd();

  // If running a FRESH test (not a rerun), clear old rerun metadata files AND test-results
  // This ensures rerun only contains the latest failed tests, not accumulated ones
  if (!isRerun) {
    console.log('🧹 FRESH TEST RUN: Cleaning up old test results and failure metadata...');
    
    // STEP 1: Remove rerun metadata files
    try {
      const rerunFiles = [
        path.resolve(projectRoot, '@rerun.txt'),           // Cucumber rerun file
        path.resolve(projectRoot, '.playwright-rerun'),    // Playwright rerun patterns
        path.resolve(projectRoot, '.playq-failed-tests.json')  // Failure metadata
      ];
      
      rerunFiles.forEach(file => {
        try {
          if (existsSync(file)) {
            unlinkSync(file);
            console.log(`  ✓ Removed: ${path.basename(file)}`);
          }
        } catch (err) {
          // Silently ignore if file doesn't exist
        }
      });
    } catch (err) {
      console.warn('Warning: Failed to cleanup rerun files', err);
    }

    // STEP 2: CRITICALLY IMPORTANT - Remove entire test-results directory BEFORE new test run
    // This prevents accumulation of failures from previous runs
    // Previous failures must be completely cleared so failure extraction only sees current run results
    try {
      const testResultsPath = path.resolve(projectRoot, 'test-results');
      if (existsSync(testResultsPath)) {
        rmSync(testResultsPath, { recursive: true, force: true });
        
        // Verify directory was actually deleted
        if (!existsSync(testResultsPath)) {
          console.log('  ✓ Removed: test-results/ (prevents old failure accumulation)');
        } else {
          console.warn('⚠️  WARNING: test-results directory still exists after cleanup attempt!');
        }
      }
    } catch (err) {
      console.error('❌ ERROR: Failed to remove test-results:', err);
      throw new Error('Critical: Cannot proceed with test run without clearing previous results');
    }
    
    console.log('✅ Cleanup complete - ready for fresh test run\n');
  } else {
    // RERUN MODE: Clean test results directories so only rerun results appear
    console.log('ℹ️  RERUN MODE: Cleaning test results for fresh rerun...');
    
    try {
      // Remove Allure results under test-results so merged report only shows rerun tests
      const allureResultsPath = path.resolve(projectRoot, 'test-results', 'allure-results');
      if (existsSync(allureResultsPath)) {
        rmSync(allureResultsPath, { recursive: true, force: true });
        console.log('  ✓ Removed: test-results/allure-results/');
      }
    } catch (err) {
      console.warn('  ⚠️  Could not clean test-results/allure-results:', err);
    }
    
    try {
      // Remove test-results subdirectories BUT PRESERVE blob-report folders (needed for Playwright merge)
      const testResultsPath = path.resolve(projectRoot, 'test-results');
      if (existsSync(testResultsPath)) {
        // These are safe to remove - they're reports/artifacts
        const safeToRemove = ['artifacts', 'cucumber-report.html', 'cucumber-report.json', 
                              'playwright-report', 'screenshots', 'traces', 'videos', 'scenarios',
                              'e2e-junit-results.xml', 'logs'];
        safeToRemove.forEach(sub => {
          const subPath = path.resolve(testResultsPath, sub);
          if (existsSync(subPath)) {
            rmSync(subPath, { recursive: true, force: true });
          }
        });
        // CRITICAL: Do NOT remove blob-report* folders - they're needed for merge
        console.log('  ✓ Cleaned test-results (preserved blob-report folders for merge)');
      }
    } catch (err) {
      console.warn('  ⚠️  Could not clean test-results:', err);
    }
    
    try {
      // CRITICAL: Remove _Temp/execution to force preprocessing only the rerun scenarios
      const tempExecutionPath = path.resolve(projectRoot, '_Temp/execution');
      if (existsSync(tempExecutionPath)) {
        rmSync(tempExecutionPath, { recursive: true, force: true });
        console.log('  ✓ Removed: _Temp/execution/ (forces fresh preprocessing)');
      }
    } catch (err) {
      console.warn('  ⚠️  Could not clean _Temp/execution:', err);
    }
    
    console.log('');
  }

  // If running in Cucumber mode, handle pre-processing
  if (process.env.PLAYQ_RUNNER === 'cucumber') {
    require(path.resolve(process.env['PLAYQ_CORE_ROOT'], 'exec/preProcessEntry.js'));
  }
  
  // General directory cleanup for temporary folders
  try {
    rmSync(path.resolve(projectRoot, '_Temp/sessions'), { recursive: true, force: true });
  } catch (err) {
    // Silently ignore
  }
  try {
    rmSync(path.resolve(projectRoot, '_Temp/smartAI'), { recursive: true, force: true });
  } catch (err) {
    // Silently ignore
  }
}

// If called directly (not imported)
if (require.main === module) {
  setupEnvironment();
}
