// config/playwright/playwright.hooks.ts
import { test as base, chromium, firefox, webkit, Browser, BrowserContext, Page } from '@playwright/test';
import { webFixture, vars,config } from '@playq';

import '../../src/exec/preLoader'; // Ensure preLoader runs before hooks

let browser: Browser;
let context: BrowserContext;
let page: Page;


const browserType = vars.getConfigValue('browser.browserType');
const headless = true
// const headless = (process.env.HEADLESS?.toLowerCase() === 'false')
//   ? false
//   : (process.env.HEADLESS?.toLowerCase() === 'true')
//   ? true
//   : config.browser.headless ?? true;

const getBrowserInstance = () => {
  switch (browserType) {
    case 'firefox': return firefox;
    case 'webkit': return webkit;
    default: return chromium;
  }
};

const test = base.extend<{ page: Page }>({
  page: async ({}, use) => {
    // 🏗️ Session management based on config.browser.playwrightSession
    if (config?.browser?.playwrightSession || vars.getConfigValue('browser.playwrightSession') === 'shared' && !browser) {
      browser = await getBrowserInstance().launch({ headless });
      context = await browser.newContext();
      console.log(`✅ Playwright shared browser (${browserType}, headless=${headless}) launched`);
    }

    if (['isolated', 'perFile'].includes(config?.browser?.playwrightSession || vars.getConfigValue('browser.playwrightSession'))) {
      browser = await getBrowserInstance().launch({ headless });
      context = await browser.newContext();
    }
    webFixture.setSmartIQData([]);

    page = await context.newPage();
    await use(page);

    if (['isolated', 'perFile', 'perTest'].includes(config?.browser?.playwrightSession || vars.getConfigValue('browser.playwrightSession'))) {
      await page.close();
      await context?.close();
      await browser?.close();
      console.log(`✅ Playwright session closed (per test/file)`);
    }
  }
});

test.beforeEach(async ({}, testInfo) => {
  // Extract number from [-N-] at the end of the title
  const match = testInfo.title.match(/\[-(\d+)-\]$/);
  const iteration = match ? match[1] : "1";
  vars.setValue('playq.iteration.count', iteration);
});

test.afterAll(async () => {
   console.log('✅ TRIGERRING afterAll');
  if (config?.browser?.playwrightSession || vars.getConfigValue('browser.playwrightSession') === 'shared') {
    await context?.close();
    await browser?.close();
    console.log('✅ Playwright shared session closed');
  }
});

export { test };

