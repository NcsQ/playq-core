/**
 * @file alertActions.ts
 *
 * Browser alert handling actions for PlayQ across Playwright and Cucumber.
 * Provides accept, dismiss, fill, and verification of alert messages with
 * runner-aware logging and Allure-compatible step wrappers.
 *
 * Key Features:
 * - Hybrid runner support (Playwright/Cucumber) via lightweight shims
 * - Consistent step naming for reporting and traceability
 * - Attaches alert text to reports where available
 *
 * Authors: PlayQ Team
 * Version: v1.0.0
 */
import * as allure from "allure-js-commons";
import { Page } from "@playwright/test";
import { vars, comm } from "../../../global";
import { processScreenshot } from "./screenshotActions";

function isPlaywrightRunner() { return process.env.TEST_RUNNER === 'playwright'; }
const __allureAny_alert: any = allure as any;
if (typeof __allureAny_alert.step !== 'function') { __allureAny_alert.step = async (_n: string, f: any) => await f(); }

/**
 * Web: Accept Alert -options: {param}
 *
 * Waits for a browser alert and accepts it. Attaches the alert text and optionally captures a screenshot.
 *
 * @param page - Playwright Page instance
 * @param options - Optional JSON string or object:
 *  - actionTimeout: [number] Timeout to wait for alert (default: config or 10000)
 *  - screenshot: [boolean] Capture screenshot after handling the alert (default: false)
 *  - screenshotText: [string] Description for screenshot (default: "")
 *  - screenshotFullPage: [boolean] Full page screenshot (default: true)
 * @throws Error if page is not initialized or alert does not appear within timeout
 */
export async function acceptAlert(page: Page, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")) || 10000,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;
  const stepName = `Web: Accept Alert -options: ${JSON.stringify(options_json)}`;
  if (!page) throw new Error("Page not initialized");
  async function run() {
    const dialog = await page.waitForEvent('dialog', { timeout: actionTimeout }).catch(() => null);
    if (!dialog) throw new Error(`❌ No alert appeared within ${actionTimeout}ms`);
    await comm.attachLog(`Alert Text: ${dialog.message()}`, 'text/plain', 'Alert');
    await dialog.accept();
    await processScreenshot(page, screenshot, screenshotText || 'After alert accept', screenshotFullPage);
  }
  if (isPlaywrightRunner()) { await __allureAny_alert.step(stepName, run); } else { await run(); }
}

/**
 * Web: Dismiss Alert -options: {param}
 *
 * Waits for a browser alert and dismisses it. Attaches the alert text and optionally captures a screenshot.
 *
 * @param page - Playwright Page instance
 * @param options - Optional JSON string or object:
 *  - actionTimeout: [number] Timeout to wait for alert (default: config or 10000)
 *  - screenshot: [boolean] Capture screenshot after handling the alert (default: false)
 *  - screenshotText: [string] Description for screenshot (default: "")
 *  - screenshotFullPage: [boolean] Full page screenshot (default: true)
 * @throws Error if page is not initialized or alert does not appear within timeout
 */
export async function dismissAlert(page: Page, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")) || 10000,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;
  const stepName = `Web: Dismiss Alert -options: ${JSON.stringify(options_json)}`;
  if (!page) throw new Error("Page not initialized");
  async function run() {
    const dialog = await page.waitForEvent('dialog', { timeout: actionTimeout }).catch(() => null);
    if (!dialog) throw new Error(`❌ No alert appeared within ${actionTimeout}ms`);
    await comm.attachLog(`Alert Text: ${dialog.message()}`, 'text/plain', 'Alert');
    await dialog.dismiss();
    await processScreenshot(page, screenshot, screenshotText || 'After alert dismiss', screenshotFullPage);
  }
  if (isPlaywrightRunner()) { await __allureAny_alert.step(stepName, run); } else { await run(); }
}

/**
 * Web: Fill Alert -text: {param} -options: {param}
 *
 * Waits for a prompt alert and fills it with the provided text. Attaches the alert text and optionally captures a screenshot.
 *
 * @param page - Playwright Page instance
 * @param text - Text to send to alert prompt
 * @param options - Optional JSON string or object:
 *  - actionTimeout: [number] Timeout to wait for alert (default: config or 10000)
 *  - screenshot: [boolean] Capture screenshot after handling the alert (default: false)
 *  - screenshotText: [string] Description for screenshot (default: "")
 *  - screenshotFullPage: [boolean] Full page screenshot (default: true)
 * @throws Error if page is not initialized or alert does not appear within timeout
 */
export async function fillAlert(page: Page, text: string, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")) || 10000,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;
  const stepName = `Web: Fill Alert -text: ${text} -options: ${JSON.stringify(options_json)}`;
  if (!page) throw new Error("Page not initialized");
  async function run() {
    const dialog = await page.waitForEvent('dialog', { timeout: actionTimeout }).catch(() => null);
    if (!dialog) throw new Error(`❌ No alert appeared within ${actionTimeout}ms`);
    await comm.attachLog(`Alert Text: ${dialog.message()}`, 'text/plain', 'Alert');
    await dialog.accept(text);
    await processScreenshot(page, screenshot, screenshotText || 'After alert fill', screenshotFullPage);
  }
  if (isPlaywrightRunner()) { await __allureAny_alert.step(stepName, run); } else { await run(); }
}

/**
 * Web: See Alert Text -expected: {param} -options: {param}
 *
 * Verifies the next alert message matches the expected text. Supports partial match and case-insensitive comparison.
 *
 * @param page - Playwright Page instance
 * @param expected - Expected alert text
 * @param options - Optional JSON string or object:
 *  - actionTimeout: [number] Timeout to wait for alert (default: config or 10000)
 *  - partialMatch: [boolean] If true, checks substring instead of exact match (default: false)
 *  - ignoreCase: [boolean] Case-insensitive comparison (default: false)
 *  - assert: [boolean] If false, logs failure but does not throw (default: true)
 *  - screenshot: [boolean] Capture screenshot after verification (default: false)
 *  - screenshotText: [string] Description for screenshot (default: "")
 *  - screenshotFullPage: [boolean] Full page screenshot (default: true)
 */
export async function seeAlertText(page: Page, expected: string, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")) || 10000,
    partialMatch = false,
    ignoreCase = false,
    assert = true,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;
  const stepName = `Web: See Alert Text -expected: ${expected} -options: ${JSON.stringify(options_json)}`;
  if (!page) throw new Error("Page not initialized");
  async function run() {
    const dialog = await page.waitForEvent('dialog', { timeout: actionTimeout }).catch(() => null);
    if (!dialog) {
      const msg = `❌ No alert appeared within ${actionTimeout}ms`;
      await comm.attachLog(msg, 'text/plain', 'Alert');
      if (assert) throw new Error(msg);
      return;
    }
    let msg = dialog.message();
    await comm.attachLog(`Alert Text: ${msg}`, 'text/plain', 'Alert');
    let exp = vars.replaceVariables(expected);
    let actual = msg;
    if (ignoreCase) { exp = exp.toLowerCase(); actual = actual.toLowerCase(); }
    const matched = partialMatch ? actual.includes(exp) : actual === exp;
    if (!matched) {
      const err = `Alert text mismatch: expected '${expected}'${partialMatch ? " (partial)" : ""}, got '${msg}'`;
      await comm.attachLog(`❌ ${err}`, 'text/plain', 'Validation');
      if (assert) throw new Error(err);
    } else {
      await comm.attachLog(`✅ Alert text matched: '${msg}'`, 'text/plain', 'Validation');
    }
    await dialog.dismiss();
    await processScreenshot(page, screenshot, screenshotText || 'After alert verification', screenshotFullPage);
  }
  if (isPlaywrightRunner()) { await __allureAny_alert.step(stepName, run); } else { await run(); }
}
