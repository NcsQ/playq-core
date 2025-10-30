// playwright.global-setup.ts
import 'tsconfig-paths/register';
// import { setupEnvAndBrowser } from '../../src/hooks/testLifecycleHooks';

export default async () => {
  process.env.TEST_RUNNER = 'playwright';
  console.log('🔧 Global setup: tsconfig-paths/register loaded');

  // await setupEnvAndBrowser();
};