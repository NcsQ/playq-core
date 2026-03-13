import { loadEnv } from '../helper/bundle/env';
import path from 'path';
import { rmSync, existsSync, unlinkSync, readdirSync } from 'fs';

export function setupEnvironment() {
  loadEnv();

  // Only skip cleanup during ACTIVE rerun phase (PLAYQ_IS_RERUN set by tryAutomaticRerun)
  // Do NOT skip cleanup just because --rerun flag was used; the flag means "auto-rerun if failures"
  // Normal cleanup happens before first run, then blob-reports are preserved before actual rerun
  const isActiveRerun = process.env.PLAYQ_IS_RERUN === 'true';
  const projectRoot = process.env['PLAYQ_PROJECT_ROOT'] || process.cwd();

  // CRITICAL: Always log this to track environment variable propagation
  console.log(`🔍 [pretest] Environment check: PLAYQ_IS_RERUN="${process.env.PLAYQ_IS_RERUN}" (type: ${typeof process.env.PLAYQ_IS_RERUN}), isActiveRerun=${isActiveRerun}`);
  
  // Debug logging
  if (process.env.PLAYQ_DEBUG === 'true') {
    console.log(`🔍 [pretest] Active rerun check: PLAYQ_IS_RERUN=${process.env.PLAYQ_IS_RERUN}, isActiveRerun=${isActiveRerun}`);
  }

  // If NOT an active rerun, clean old test-results and rerun metadata
  // This ensures clean state for normal test runs and first run with --rerun
  if (!isActiveRerun) {
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
        // Retry logic for Windows file locking issues
        let retries = 5;
        let deleted = false;
        
        while (retries > 0 && !deleted) {
          try {
            rmSync(testResultsPath, { recursive: true, force: true });
            deleted = !existsSync(testResultsPath);
            if (deleted) {
              console.log('  ✓ Removed: test-results/ (prevents old failure accumulation)');
              break;
            }
          } catch (err) {
            retries--;
            if (retries > 0) {
              console.log(`  ⚠️  Retry cleanup (${retries} attempts left): ${(err as any)?.code}`);
              // Wait 500ms before retrying
              const startTime = Date.now();
              while (Date.now() - startTime < 500) {
                // Busy wait (can't use sleep in Node.js without async)
              }
            } else {
              throw err;
            }
          }
        }
        
        if (!deleted) {
          console.warn('⚠️  WARNING: test-results directory still exists after cleanup attempt!');
        }
      }
    } catch (err) {
      console.error('❌ ERROR: Failed to remove test-results:', err);
      throw new Error('Critical: Cannot proceed with test run without clearing previous results');
    }
    
    console.log('✅ Cleanup complete - ready for fresh test run\n');
  } else {
    // ACTIVE RERUN PHASE: Preserve blob-reports but clean other artifacts for fresh rerun
    console.log('ℹ️  ACTIVE RERUN: Cleaning test-results artifacts, preserving blob-reports...');
    console.log(`🔍 [pretest] About to preserve blob-reports. Current test-results contents:`);
    try {
      const testResultsPath = path.resolve(projectRoot, 'test-results');
      if (existsSync(testResultsPath)) {
        const items = readdirSync(testResultsPath);
        items.forEach((item: string) => {
          console.log(`   - ${item}`);
        });
      }
    } catch (err) {
      console.log('   (Could not list contents)');
    }
    
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
            try {
              rmSync(subPath, { recursive: true, force: true });
            } catch (err) {
              // Silently skip files that are locked (Windows issue)
              console.log(`  ⚠️  Could not remove ${sub} (file locked, skipping)`);
            }
          }
        });
        // CRITICAL: Do NOT remove blob-report* folders - they're needed for merge
        console.log('  ✓ Cleaned test-results (preserved blob-report folders for merge)');
        
        // VERIFY blob-report folders still exist
        console.log(`🔍 [pretest] After cleanup, test-results contents:`);
        const itemsAfter = readdirSync(testResultsPath);
        itemsAfter.forEach((item: string) => {
          console.log(`   - ${item}`);
        });
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
    // Prefer compiled JS entry under dist/, fall back to TS entry under src/
    const jsEntry = path.resolve(projectRoot, 'dist', 'exec', 'preProcessEntry.js');
    const tsEntry = path.resolve(projectRoot, 'src', 'exec', 'preProcessEntry.ts');

    if (existsSync(jsEntry)) {
      require(jsEntry);
    } else if (existsSync(tsEntry)) {
      require(tsEntry);
    } else {
      throw new Error(
        `Unable to locate Cucumber pre-process entry. Tried:\n` +
        `  - ${jsEntry}\n` +
        `  - ${tsEntry}`
      );
    }
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
