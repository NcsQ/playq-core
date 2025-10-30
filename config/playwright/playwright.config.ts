// playwright.config.ts
import { defineConfig } from '@playwright/test';
import path from 'path';
import { config } from '@playq';
import { loadEnv } from '@src/helper/bundle/env';
import {vars} from '@playq'

loadEnv();

console.log('🌐 Loaded environment variables:');
console.log('🌐 browser.browserType:', vars.getConfigValue('browser.browserType'));
console.log('🌐 testExecution.timeout:', vars.getConfigValue('testExecution.timeout'));
console.log('🌐 CONFIG: browser.browserType:', config?.browser?.browserType || vars.getConfigValue('browser.browserType'));


 export default defineConfig({
  globalSetup: require.resolve('./playwright.global-setup'),
  globalTeardown: require.resolve('./playwright.global-teardown'),
  testDir: path.resolve(__dirname, '../../playwright-tests'),  workers: 1, // Add this to prevent multiple browsers
  timeout: config?.testExecution?.timeout || vars.getConfigValue('browser.browserType'),
  retries: 0,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: '../../playwright-report/playwright-report.json' }],
    ['allure-playwright'],
    ['junit', { outputFile: '../../test-results/e2e-junit-results.xml' }]
  ],
  // This is the default config for all tests
 
  use: {
    browserName: vars.getValue('config.browser.browserType') as 'chromium' | 'firefox' | 'webkit',
    headless: false,
    baseURL: 'https://ncs.co/',
    // viewport: null, // disables Playwright's default viewport
    // launchOptions: {
    //   args: ['--start-maximized'], // launches browser maximized
    // },
    viewport: { width: 1480, height: 720 },
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'on', // [on- Record video for all tests, even if they pass / 'retain-on-failure']
    actionTimeout: config?.testExecution?.timeout || vars.getConfigValue('testExecution.actionTimeout'),
    navigationTimeout: config?.testExecution?.timeout || vars.getConfigValue('testExecution.navigationTimeout'),
  },
});