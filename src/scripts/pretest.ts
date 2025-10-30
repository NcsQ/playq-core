import { loadEnv } from '../helper/bundle/env';
import path from 'path';
import { rmSync } from 'fs';

export function setupEnvironment() {
  loadEnv();

  // If running in Cucumber mode, we need to handle pre-processing differently
  if (process.env.PLAYQ_RUNNER === 'cucumber') {
    // CUCUMBER RUNNER
    // Remove allure-report directory in the project folder for cucumber runner
    try {
      rmSync(path.resolve(process.env['PLAYQ_PROJECT_ROOT'], 'test-results'), { recursive: true, force: true });
    } catch (err) {
      console.warn('Warning: Failed to remove allure-report', err);
    }
    require(path.resolve(process.env['PLAYQ_CORE_ROOT'], 'exec/preProcessEntry.ts'));
    } else {
    // PLAYWRIGHT RUNNER
    // Remove allure-report and allure-results directories
    try {
      rmSync(path.resolve(process.env['PLAYQ_PROJECT_ROOT'], 'allure-report'), { recursive: true, force: true });
    } catch (err) {
      console.warn('Warning: Failed to remove ./allure-report', err);
    }
    try {
      rmSync(path.resolve(process.env['PLAYQ_PROJECT_ROOT'], 'allure-results'), { recursive: true, force: true });
    } catch (err) {
      console.warn('Warning: Failed to remove ./allure-results', err);
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
