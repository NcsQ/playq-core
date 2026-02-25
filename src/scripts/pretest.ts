import { loadEnv } from '../helper/bundle/env';
import path from 'path';
import { rmSync, existsSync, unlinkSync } from 'fs';

export function setupEnvironment() {
  loadEnv();

  // Skip cleanup if this is a rerun (rerun.ts handles selective cleanup)
  const isRerun = process.env.PLAYQ_IS_RERUN === 'true';
  const projectRoot = process.env['PLAYQ_PROJECT_ROOT'];

  // If running a FRESH test (not a rerun), clear old rerun metadata files
  // This ensures rerun only contains the latest failed tests, not accumulated ones
  if (!isRerun) {
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
            console.log(`🧹 Cleaned up old rerun file: ${path.basename(file)}`);
          }
        } catch (err) {
          // Silently ignore if file doesn't exist
        }
      });
    } catch (err) {
      console.warn('Warning: Failed to cleanup rerun files', err);
    }
  }

  // If running in Cucumber mode, we need to handle pre-processing differently
  if (process.env.PLAYQ_RUNNER === 'cucumber') {
    // CUCUMBER RUNNER
    // Remove test-results directory for cucumber runner (unless in rerun mode)
    if (!isRerun) {
      try {
        rmSync(path.resolve(projectRoot, 'test-results'), { recursive: true, force: true });
      } catch (err) {
        console.warn('Warning: Failed to remove test-results', err);
      }
    } else {
      console.log('ℹ️  Skipping test-results cleanup (rerun mode)');
    }
    require(path.resolve(process.env['PLAYQ_CORE_ROOT'], 'exec/preProcessEntry.ts'));
    } else {
    // PLAYWRIGHT RUNNER
    // Skip cleanup if this is a rerun (rerun.ts handles selective cleanup)
    if (!isRerun) {
      // Remove test-results directory (includes allure-report and allure-results)
      try {
        rmSync(path.resolve(projectRoot, 'test-results'), { recursive: true, force: true });
      } catch (err) {
        console.warn('Warning: Failed to remove test-results', err);
      }
    } else {
      console.log('ℹ️  Skipping test-results cleanup (rerun mode)');
    }
  }
    // General directory cleanup
    try {
      rmSync(path.resolve(projectRoot, '_Temp/sessions'), { recursive: true, force: true });
    } catch (err) {
      console.warn('Warning: Failed to remove _Temp/sessions folder', err);
    }
    try {
      rmSync(path.resolve(projectRoot, '_Temp/smartAI'), { recursive: true, force: true });
    } catch (err) {
      console.warn('Warning: Failed to remove _Temp/smartAI folder', err);
    }
}

// If called directly (not imported)
if (require.main === module) {
  setupEnvironment();
}
