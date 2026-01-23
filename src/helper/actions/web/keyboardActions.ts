/**
 * @file keyboardActions.ts
 *
 * Keyboard interaction utilities for PlayQ web actions.
 * Provides typing and key press helpers with screenshot options and
 * runner-aware step wrappers.
 *
 * Authors: PlayQ Team
 * Version: v1.0.0
 */
import * as allure from "allure-js-commons";
import { Page } from "@playwright/test";
import { waitForPageToLoad } from "./waitActions";
import { processScreenshot } from "./screenshotActions";
import { parseLooseJson } from '../../bundle/vars';

function isPlaywrightRunner() { return process.env.TEST_RUNNER === 'playwright'; }
const __allureAny_keys: any = allure as any;
if (typeof __allureAny_keys.step !== 'function') { __allureAny_keys.step = async (_n: string, f: any) => await f(); }
// Allure compatibility shim: if step is unavailable, just run the body
const __allureAny_web: any = allure as any;
if (typeof __allureAny_web.step !== 'function') {
  __allureAny_web.step = async (_name: string, fn: any) => await fn();
}

/**
 * Web: Press Key -key: {param} -options: {param}
 *
 * Presses a keyboard key on the page or a specific element.
 *
 * @param page - Playwright Page instance
 * @param key - The key to press (e.g., "Enter", "Tab", "ArrowDown", "a", etc.)
 * @param options - Optional string or object:
 *   - screenshot: [boolean] Capture screenshot after pressing the key. Default: false.
 *   - screenshotText: [string] Description for the screenshot. Default: "".
 *   - screenshotFullPage: [boolean] Full page screenshot. Default: true.
 *
 * @example
 *   await pressKey(page, 'Enter', { field: 'Username', screenshot: true });
 */
export async function pressKey(
  page: Page,
  key: string,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;

  if (!page) throw new Error("Page not initialized");

  if (isPlaywrightRunner()) {
    await __allureAny_keys.step(
      `Web: Press Key -key: ${key} -options: ${JSON.stringify(options_json)}`,
      async () => {
        await doPressKey();
      }
    );
  } else {
    await doPressKey();
  }

  async function doPressKey() {
    await waitForPageToLoad(page);
    await page.keyboard.press(key, { delay: 0 });
    await processScreenshot(
      page,
      screenshot,
      screenshotText || `Pressed key: ${key}`,
      screenshotFullPage
    );
  }
}

/**
 * Web: Press Enter -options: {param}
 *
 * Convenience wrapper to press the Enter key.
 *
 * @param page Playwright Page instance
 * @param options Optional JSON string or object ({ delay })
 */
export async function pressEnter(page: Page, options?: string | Record<string, any>) {
  return pressKey(page, "Enter", options);
}

/**
 * Web: Press Tab -options: {param}
 *
 * Convenience wrapper to press the Tab key.
 *
 * @param page Playwright Page instance
 * @param options Optional JSON string or object ({ delay })
 */
export async function pressTab(page: Page, options?: string | Record<string, any>) {
  return pressKey(page, "Tab", options);
}
