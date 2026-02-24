import { loadEnv } from '../helper/bundle/env';
import path from 'path';
import { rmSync } from 'fs';

export function setupEnvironment() {
  loadEnv();

  // If running in Cucumber mode, we need to handle pre-processing differently
  if (process.env.PLAYQ_RUNNER === 'cucumber') {
    // CUCUMBER RUNNER
    // Remove test-results directory for cucumber runner
    try {
      rmSync(path.resolve(process.env['PLAYQ_PROJECT_ROOT'], 'test-results'), { recursive: true, force: true });
    } catch (err) {
      console.warn('Warning: Failed to remove test-results', err);
    }
    require(path.resolve(process.env['PLAYQ_CORE_ROOT'], 'exec/preProcessEntry.ts'));
    } else {
    // PLAYWRIGHT RUNNER
    // Skip cleanup if this is a rerun (rerun.ts handles selective cleanup)
    if (process.env.PLAYQ_IS_RERUN !== 'true') {
      // Remove test-results directory (includes allure-report and allure-results)
      try {
        rmSync(path.resolve(process.env['PLAYQ_PROJECT_ROOT'], 'test-results'), { recursive: true, force: true });
      } catch (err) {
        console.warn('Warning: Failed to remove test-results', err);
      }
    } else {
      console.log('ℹ️  Skipping test-results cleanup (rerun mode)');
    }
  }
    // General directory cleanup
    try {
      rmSync(path.resolve(process.env['PLAYQ_PROJECT_ROOT'], '_Temp/sessions'), { recursive: true, force: true });
    } catch (err) {
      console.warn('Warning: Failed to remove _Temp/sessions folder', err);
    }
    try {
      rmSync(path.resolve(process.env['PLAYQ_PROJECT_ROOT'], '_Temp/smartAI'), { recursive: true, force: true });
    } catch (err) {
      console.warn('Warning: Failed to remove _Temp/smartAI folder', err);
    }
}

// If called directly (not imported)
if (require.main === module) {
  setupEnvironment();
}
