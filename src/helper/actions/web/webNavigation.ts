/**
 * @file webNavigation.ts
 *
 * Navigation helpers for PlayQ web actions.
 * Provides open/refresh/switch/close tab and path navigation utilities
 * with runner-aware Allure step wrappers and screenshot options.
 *
 * Authors: PlayQ Team
 * Version: v1.0.0
 */
import * as allure from "allure-js-commons";
import { Page } from "@playwright/test";
import { vars } from "../../../global";
import { processScreenshot } from "./screenshotActions";
import { parseLooseJson } from '../../bundle/vars';
import { attachLog } from '../commActions';

function isPlaywrightRunner() { return process.env.TEST_RUNNER === 'playwright'; }

const __allureAny_nav: any = allure as any;
if (typeof __allureAny_nav.step !== 'function') {
  __allureAny_nav.step = async (_name: string, fn: any) => await fn();
}
// Allure compatibility shim: if step is unavailable, just run the body
const __allureAny_web: any = allure as any;
if (typeof __allureAny_web.step !== 'function') {
  __allureAny_web.step = async (_name: string, fn: any) => await fn();
}

/**
 * [ACTION] Open a browser page (Playwright/Cucumber hybrid support).
 *
 * Opens the given URL in a new browser page or reuses the existing page based on the runner context.
 * Supports automatic screenshot and log attachments.
 *
 * @param pageOverride - Optional Playwright Page object (used in Playwright tests). Not required in Cucumber.
 * @param url - The URL to open (e.g., "https://example.com").
 * @param options - JSON string or object for additional behaviors:
 *   - screenshot [boolean]: Capture screenshot after navigation. Default: false.
 *   - screenshotText [string]: Description for screenshot attachment. Default: "".
 *   - screenshotFullPage [boolean]: Full page screenshot or viewport only. Default: true.
 *
 * @returns void
 *
 * @example
 * // Playwright Test
 * test('Open Google', async ({ page }) => {
 *   await openBrowser('https://google.com', '{screenshot: true, screenshotText: "Homepage"}', page);
 * });
 *
 * @example
 * // Cucumber Step
 * Given("Web: Open Browser -url: {param} -options: {param}", openBrowser);
 *
 * @throws Error if page is not initialized or navigation fails.
 */
export async function openBrowser(
  page: Page,
  url: string,
  options?: string | Record<string, any>
) {
  let resolvedUrl = vars.replaceVariables(url);
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json ?? {};

  if (isPlaywrightRunner()) {
    await __allureAny_web.step(
      `Web: Open browser -url: ${resolvedUrl} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doOpenBrowser();
      }
    );
  } else {
    await doOpenBrowser();
  }

  async function doOpenBrowser() {
    if (!page) throw new Error("Page not initialised");
    await page.goto(resolvedUrl, { waitUntil: "domcontentloaded" });
    await processScreenshot(
      page,
      screenshot,
      screenshotText,
      screenshotFullPage
    );
  }
}

/**
   * Web: Refresh Page -options: {param}
   *
   * Reloads the current page.
   *
   * @param page Playwright Page instance
   * @param options Optional JSON string or object (reserved for consistency)
   */
export async function refreshPage(page: Page, options?: string | Record<string, any>) {
  const options_json = typeof options === "string" ? vars.parseLooseJson(options) : options || {};
  const stepName = `Web: Refresh Page -options: ${JSON.stringify(options_json)}`;
  if (isPlaywrightRunner()) {
    await __allureAny_nav.step(stepName, async () => { await page.reload(); });
  } else {
    await page.reload();
  }
}

/**
 * Web: Switch Tab -index: {param} -options: {param}
 *
 * Brings the specified tab to the front by index.
 *
 * @param page Playwright Page instance
 * @param index Zero-based tab index (default: 0)
 * @param options Optional JSON string or object (reserved for consistency)
 */
export async function switchTab(page: Page, index: number = 0, options?: string | Record<string, any>) {

  const options_json = typeof options === "string" ? vars.parseLooseJson(options) : options || {};
  const ctx = page.context();
  const stepName = `Web: Switch Tab -index: ${index} -options: ${JSON.stringify(options_json)}`;
  if (isPlaywrightRunner()) {
    await __allureAny_nav.step(stepName, async () => {
      const target = ctx.pages()[index];
      if (!target) throw new Error(`No tab at index ${index}`);
      await target.bringToFront();
    });
  } else {
    const target = ctx.pages()[index];
    if (!target) throw new Error(`No tab at index ${index}`);
    await target.bringToFront();
  }
}

/**
 * Web: Close Tab -options: {param}
 *
 * Closes the current tab.
 *
 * @param page Playwright Page instance
 * @param options Optional JSON string or object (reserved for consistency)
 */
export async function closeTab(page: Page, options?: string | Record<string, any>) {

  const options_json = typeof options === "string" ? vars.parseLooseJson(options) : options || {};
  const stepName = `Web: Close Tab -options: ${JSON.stringify(options_json)}`;
  if (isPlaywrightRunner()) {
    await __allureAny_nav.step(stepName, async () => { await page.close(); });
  } else {
    await page.close();
  }
}

/**
 * Web: Open New Tab -url: {param} -options: {param}
 *
 * Opens a new tab within the current browser context and optionally navigates to a URL.
 * Returns the created Page instance so tests can interact with it without direct Playwright APIs.
 *
 * @param page Playwright Page instance (used to derive the context)
 * @param url Optional URL to navigate the new tab to
 * @param options Optional JSON string or object:
 *   - screenshot: [boolean] Capture a screenshot after opening/navigating. Default: false.
 *   - screenshotText: [string] Description for the screenshot attachment. Default: "".
 *   - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 *
 * @returns The newly opened Playwright Page
 */
export async function openNewTab(
  page: Page,
  url?: string,
  options?: string | Record<string, any>
) {
  const options_json = typeof options === "string" ? vars.parseLooseJson(options) : options || {};
  const { screenshot = false, screenshotText = "", screenshotFullPage = true } = options_json ?? {};
  const stepName = `Web: Open New Tab -url: ${url ?? ''} -options: ${JSON.stringify(options_json)}`;

  async function run() {
    if (!page) throw new Error("Page not initialised");
    const ctx = page.context();
    const newPage = await ctx.newPage();
    if (url && typeof url === 'string' && url.length > 0) {
      const targetUrl = vars.replaceVariables(url);
      await newPage.goto(targetUrl, { waitUntil: 'domcontentloaded' });
      await newPage.waitForLoadState('networkidle');
    }
    await processScreenshot(newPage, screenshot, screenshotText, screenshotFullPage);
    return newPage;
  }

  if (isPlaywrightRunner()) {
    return await __allureAny_nav.step(stepName, run);
  } else {
    return await run();
  }
}

/**
 * Web: Navigate by Path -relativePath: {param} -options: {param}
 *
 * Appends a relative path to the current page's URL and navigates to it.
 *
 * @param relativePath - The path to append (e.g., "/settings", "profile/edit")
 * @param options - (optional) JSON string or object:
 *   - screenshot: [boolean] Capture a screenshot after navigation. Default: false.
 *   - screenshotText: [string] Text description for the screenshot. Default: "".
 *   - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 *
 * @example
 *  Web: Navigate by Path -relativePath: "/profile/edit" -options: "{screenshot: true, screenshotText: 'Profile Page'}"
 */
export async function navigateByPath(
  page: Page,
  relativePath: string,
  options?: string | Record<string, any>
) {
  let resolvedRelativePath = vars.getValue(relativePath);
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json ?? {};
  if (isPlaywrightRunner()) {
    await __allureAny_web.step(
      `Web: Navigate by Path -relativePath: ${relativePath} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doNavigateByPath();
      }
    );
  } else {
    await doNavigateByPath();
  }
  async function doNavigateByPath() {
    if (!page) throw new Error("Page not initialised");
    const currentUrl = page.url();
    const targetUrl = new URL(resolvedRelativePath, currentUrl).toString();

    console.log(`🌐 Navigating to: ${targetUrl}`);

    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await page.waitForLoadState("load");
    await processScreenshot(
      page,
      screenshot,
      screenshotText,
      screenshotFullPage
    );
  }
}

/**
 * Web: Reload Page -options: {param}
 *
 * Reloads the current page and optionally takes a screenshot.
 *
 * @param page - Playwright Page instance
 * @param options - Optional string or object:
 *   - actionTimeout: [number] Timeout in ms (default: 30000)
 *   - screenshot: [boolean] Capture screenshot after reload (default: false)
 *   - screenshotText: [string] Description for screenshot
 *   - screenshotFullPage: [boolean] Full page screenshot (default: true)
 *
 * @example
 *   await reloadPage(page, { screenshot: true, screenshotText: "After reload" });
 */
export async function reloadPage(
  page: Page,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")) || 30000,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;

  if (!page) throw new Error("Page not initialized");

  if (isPlaywrightRunner()) {
    await __allureAny_web.step(
      `Web: Reload Page -options: ${JSON.stringify(options_json)}`,
      async () => {
        await doReloadPage();
      }
    );
  } else {
    await doReloadPage();
  }

  async function doReloadPage() {
    await page.reload({ timeout: actionTimeout, waitUntil: "domcontentloaded" });
    await attachLog("✅ Page reloaded.", "text/plain");
    await processScreenshot(
      page,
      screenshot,
      screenshotText || "Page reloaded",
      screenshotFullPage
    );
  }
}