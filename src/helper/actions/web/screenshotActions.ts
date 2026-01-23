/**
 * @file screenshotActions.ts
 *
 * Screenshot helpers for PlayQ web actions.
 * Provides takeScreenshot and internal processScreenshot with hybrid
 * runner support (Playwright/Cucumber) and robust attachment fallbacks.
 *
 * Authors: PlayQ Team
 * Version: v1.0.0
 */
import * as fs from "fs";
import * as path from "path";
import * as allure from "allure-js-commons";
import { Page, Locator } from "@playwright/test";
import { webFixture } from "../../../global";
import { waitForPageToLoad } from "./waitActions";
import { parseLooseJson } from '../../bundle/vars';

function isPlaywrightRunner() { return process.env.TEST_RUNNER === 'playwright'; }
function isCucumberRunner() { return process.env.TEST_RUNNER === 'cucumber'; }

const __allureAny_shot: any = allure as any;
if (typeof __allureAny_shot.step !== 'function') {
  __allureAny_shot.step = async (_name: string, fn: any) => await fn();
}

/**
 * Takes a screenshot of the provided Playwright page.
 *
 * @param page - The Playwright Page object to capture.
 * @param options - Optional screenshot configuration. Can be a JSON string or an object.
 *   - `screenshot_text` (string): Optional text to annotate the screenshot.
 *   - `screenshot_fullPage` (boolean): Whether to capture the full page (default: true).
 * @throws Will throw an error if the page is not initialized.
 * @remarks
 * Waits for the page to load before taking the screenshot.
 */
export async function takeScreenshot(
  page: Page,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const { screenshot_text = "", screenshot_fullPage = true } = options_json;

  if (!page) throw new Error("Page not initialized");
  await waitForPageToLoad(page);
  await processScreenshot(page, true, screenshot_text, screenshot_fullPage);
}

function persistScreenshotToDisk(buffer: Buffer, text: string) {
  try {
    const baseDir = path.resolve(process.cwd(), "test-results", "screenshots");
    fs.mkdirSync(baseDir, { recursive: true });
    const safe = (text || "screenshot").toString().toLowerCase().replace(/[^a-z0-9-_]+/gi, "_").slice(0, 80);
    const file = path.join(baseDir, `${Date.now()}_${safe || "shot"}.png`);
    fs.writeFileSync(file, buffer);
    console.log(`📸 Screenshot saved to: ${file}`);
  } catch (e) {
    console.warn(`⚠️ Failed to save screenshot to disk: ${e?.message || e}`);
  }
}

/**
 * Web: Process Screenshot -options: {param}
 *
 * Internal helper to capture and attach a screenshot.
 *
 * @param page - Playwright Page instance
 * @param shouldTake - Whether to capture
 * @param text - Attachment text
 * @param fullPage - Full page flag
 * @param selector - Optional Locator to screenshot
 */
export async function processScreenshot(
  page: Page,
  shouldTake: boolean,
  text: string = "Screenshot",
  fullPage: boolean = true,
  selector?: Locator
) {
  if (!shouldTake) return;
  if (!page) throw new Error("Page not initialized for screenshot");
  const screenshotBuffer = selector
    ? await selector.screenshot()
    : await page.screenshot({ fullPage });

  try {
    if (isCucumberRunner()) {
      const world = webFixture.getWorld();
      if (world && typeof world.attach === "function") {
        await world.attach(screenshotBuffer, "image/png");
        await world.attach(`Screenshot Text: ${text}`, "text/plain");
        console.log(`✅ Screenshot attached via Cucumber World: ${text}`);
      } else {
        console.warn(`⚠️ No Cucumber World context. Screenshot not attached.`);
      }
    } else if (isPlaywrightRunner()) {
      const { test } = await import("@playwright/test");
      await test
        .info()
        .attach(text, { body: screenshotBuffer, contentType: "image/png" });
      console.log(`✅ Screenshot attached via Playwright: ${text}`);
    } else {
      console.warn(`⚠️ Unknown runner context. Screenshot not attached.`);
    }
  } catch (error) {
    console.warn(`⚠️ Error attaching screenshot: ${error.message}`);
  }
}

/**
 * Web: Take Full Screenshot -options: {param}
 *
 * Captures a full-page screenshot by delegating to `takeScreenshot` with defaults.
 *
 * @param page - Playwright Page instance
 * @param options - Optional JSON string or object (merged with defaults)
 */
export async function takeFullScreenshot(page: Page, options?: string | Record<string, any>) {
  const defaults = { screenshot: true, screenshotFullPage: true };
  let opts = typeof options === 'string' ? defaults : { ...defaults, ...(options || {}) };
  return takeScreenshot(page, opts as any);
}
