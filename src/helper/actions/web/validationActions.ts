/**
 * @file validationActions.ts
 *
 * Validation helpers for PlayQ web actions.
 * Provides see/don't see, page title checks, header/text verifications,
 * input value checks, tab field validations, toast checks, and more with
 * runner-aware step wrappers and screenshot options.
 *
 * Authors: PlayQ Team
 * Version: v1.0.0
 */
import * as allure from "allure-js-commons";
import { Page, Locator } from "@playwright/test";
import { vars, webLocResolver, comm, logFixture } from "../../../global";
import { processScreenshot } from "./screenshotActions";
import { attachLog, waitInMilliSeconds } from '../comm/commonActions';
import { waitForEnabled, waitForPageToLoad } from './waitActions';
import { expect } from '@playwright/test';
import { parseLooseJson } from '../../bundle/vars';
import { Verify } from 'node:crypto';

const config: any = {};


function isPlaywrightRunner() { return process.env.TEST_RUNNER === 'playwright'; }
const __allureAny_val: any = allure as any;
if (typeof __allureAny_val.step !== 'function') { __allureAny_val.step = async (_n: string, f: any) => await f(); }
// Allure compatibility shim: if step is unavailable, just run the body
const __allureAny_web: any = allure as any;
if (typeof __allureAny_web.step !== 'function') {
  __allureAny_web.step = async (_name: string, fn: any) => await fn();
}

export async function see(page: Page, text: string, options?: string | Record<string, any>) {
  const resolvedText = vars.replaceVariables(text);
  const options_json = typeof options === "string" ? vars.parseLooseJson(options) : options || {};
  const { actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")) || 30000, partialMatch = false, ignoreCase = false, assert = true, screenshot = true, screenshotText = "", screenshotFullPage = true } = options_json;
  const stepName = `Web: Verify text on page -text: ${resolvedText} -options: ${JSON.stringify(options_json)}`;
  async function run() {
    if (!page) throw new Error("Page not initialized");
    let matched = false;
    let allText = await page.textContent("body");
    let actual = allText || "";
    let expected = resolvedText;
    if (ignoreCase) { actual = actual.toLowerCase(); expected = expected.toLowerCase(); }
    matched = partialMatch ? actual.includes(expected) : actual.includes(expected);
    if (!matched) {
      const message = `❌ Text "${resolvedText}" not found in page content.`;
      await attachLog(message, "text/plain");
      if (assert !== false) throw new Error(message);
    } else {
      await attachLog(`✅ Text "${resolvedText}" found in page.`, "text/plain");
    }
    await processScreenshot(page, screenshot, screenshotText || `Verify text in page: ${resolvedText}`, screenshotFullPage);
  }
  if (isPlaywrightRunner()) { await __allureAny_val.step(stepName, run); } else { await run(); }
}

export async function dontSee(page: Page, text: string, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : options || {};
  const stepName = `Web: Dont See -text: ${text}`;
  if (isPlaywrightRunner()) {
    await __allureAny_val.step(stepName, async () => { await doDontSee(); });
  } else {
    await doDontSee();
  }
  async function doDontSee() {
    const content = await page.content();
    if (content.includes(text)) {
      await attachLog(`❌ Text found but expected to be absent: ${text}`, "text/plain");
      throw new Error(`Text '${text}' should not be visible`);
    }
    await attachLog(`✅ Text not visible as expected: ${text}`, "text/plain");
  }
}

export async function count(page: Page, field: string | Locator, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : options || {};
  const locator = typeof field === 'string'
    ? await webLocResolver(options_json?.fieldType || '', field, page, options_json?.pattern, typeof options_json?.actionTimeout === 'number' ? options_json.actionTimeout : undefined, options_json?.smartAiRefresh || '')
    : field;
  const stepName = `Web: Count Elements -field: ${typeof field === 'string' ? field : '<locator>'}`;
  let result = 0;
  if (isPlaywrightRunner()) {
    await __allureAny_val.step(stepName, async () => { result = await locator.count(); });
  } else {
    result = await locator.count();
  }
  return result;
}

/**
 * Web: See Page Title -text: {param} -options: {param}
 *
 * Verifies the page title matches the expected text.
 * Supports exact and partial match, case sensitivity, and screenshot capture.
 *
 * @param page Playwright Page instance
 * @param expectedTitle The expected page title to match (e.g., "Your store").
 * @param options Optional JSON string or object:
 *   - partialMatch: [boolean] Perform partial match on title (default: false)
 *   - ignoreCase: [boolean] Case-insensitive comparison (default: false)
 *   - assert: [boolean] If false, logs failure but does not throw (default: true)
 *   - screenshot: [boolean] Capture a screenshot (default: true)
 *   - screenshotText: [string] Description for screenshot
 *   - screenshotFullPage: [boolean] Full page screenshot (default: true)
 *
 * @example
 *  Web: See Page Title -text: "Your store" -options: "{partialMatch: true, ignoreCase: false, assert: true}"
 */
export async function seePageTitle(page: Page, expectedTitle: string, options?: string | Record<string, any>) {
  const options_json = typeof options === "string" ? vars.parseLooseJson(options) : options || {};
  const { partialMatch = false, ignoreCase = false, assert = true, screenshot = true, screenshotText = "", screenshotFullPage = true } = options_json;
  const stepName = `Web: See Page Title -text: ${expectedTitle} -options: ${JSON.stringify(options_json)}`;
  async function run() {
    let actualTitle = await page.title();
    let expected = vars.replaceVariables(expectedTitle);
    let actual = actualTitle;
    if (ignoreCase) { expected = expected.toLowerCase(); actual = actual.toLowerCase(); }
    if (partialMatch ? actual.includes(expected) : actual === expected) {
      await comm.attachLog(`✅ Page title matched: expected: "${expectedTitle}", found: "${actualTitle}"`, "text/plain", "Validation");
    } else {
      await comm.attachLog(`❌ Page title mismatch: expected: "${expectedTitle}", found: "${actualTitle}"`, "text/plain", "Validation");
      if (assert !== false) throw new Error(`❌ Page title verification failed`);
    }
    await processScreenshot(page, screenshot, screenshotText || `Verify page title: ${expectedTitle}`, screenshotFullPage);
  }
  if (isPlaywrightRunner()) { await __allureAny_val.step(stepName, run); } else { await run(); }
}

/**
 * Web: Verify page title -text: {param} -options: {param}
 *
 * Verifies the page title matches the expected text.
 *
 * @param expectedTitle - The expected page title to match (e.g., "Your store").
 * @param options - Optional JSON string or object, supporting fields:
 *   - partial_check: [boolean] Perform partial match (default: false).
 *   - ignoreCase: [boolean] Case-sensitive match (default: true).
 *   - assert: [boolean] If false, continues the test even if the verification fails. Default: true.
 *   - screenshot: [boolean] Capture screenshot after verification (default: true).
 *   - screenshotText: [string] Description for screenshot attachment.
 *   - screenshotFullPage: [boolean] Full page screenshot (default: true).
 *
 * Example usage:
 *  * Web: Verify page title -text: "Your store" -options: "{partial_check: true, ignoreCase: false, assert: true}"
 */
export async function verifyPageTitle(
  page: Page,
  expectedTitle: string,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    partialMatch = false,
    ignoreCase = false,
    assert = true,
    screenshot = true,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;

  if (isPlaywrightRunner()) {
    await __allureAny_val.step(
      `Web: Verify page title -text: ${expectedTitle} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doVerifyPageTitle();
      }
    );
  } else {
    await doVerifyPageTitle();
  }

  async function doVerifyPageTitle() {
    await waitForPageToLoad(page);
    let actualTitle = await page.title();
    let expected = vars.replaceVariables(expectedTitle);
    let actual = actualTitle;

    if (!ignoreCase) {
      expected = expected.toLowerCase();
      actual = actual.toLowerCase();
    }

    if (partialMatch ? actual.includes(expected) : actual === expected) {
      await attachLog(
        `✅ Page title matched: expected: "${expectedTitle}", found: "${actualTitle}"`,
        "text/plain"
      );
    } else {
      await attachLog(
        `❌ Page title mismatch: expected: "${expectedTitle}", found: "${actualTitle}"`,
        "text/plain"
      );
      if (assert !== false) {
        throw new Error(`❌ Page title verification failed`);
      }
    }

    await processScreenshot(
      page,
      screenshot,
      screenshotText,
      screenshotFullPage
    );
  }
}

/**
 * Web: Verify header text -field: {param} -options: {param}
 *
 * Verifies that a header element's text (e.g., h1, h2, h3) matches the expected text. Supports partial or exact match, case sensitivity, and optional screenshot capture. The field parameter is the expected text, while pattern refines element selection if needed.
 *
 * @param field - The expected header text to match (e.g., "Welcome", "Dashboard").
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Optional Action timeout in milliseconds for waiting. Default: Configured timeout.
 *   - navigationTimeout: [number] Optional Navigation timeout in milliseconds for waiting. Default: Configured timeout.
 *   - partialMatch: [boolean] Perform a partial match instead of an exact match. Default: false.
 *   - pattern: [string] Override the default pattern from config for element resolution. Default: Configured pattern in config.
 *   - ignoreCase: [boolean] Perform a case-sensitive match. Default: false.
 *   - assert: [boolean] If false, continues the test even if the verification fails. Default: true.
 *   - locator: [string] Optional locator to refine element search. Default: "". Eg:locator: locator: "xpath=(//h3[@class='module-title'])[1]"
 *   - headerType: [string] Specify a header level (e.g., "h1", "h2", "h3"). Default: Checks all headers from h1 to h4.
 *   - screenshot: [boolean] Capture a screenshot during verification. Default: true.
 *   - screenshotText: [string] Text description for the screenshot. Default: "".
 *   - screenshotFullPage: [boolean] Capture a full page screenshot. Default: true.
 *
 * @example
 *  Web: Verify header text -field: "Your Account Has Been Created!" -options: "{partialMatch: true, screenshot: true, screenshotText: 'After account creation',  locator: "xpath=(//h3[@class='module-title'])[1]" }"
 */
export async function verifyHeaderText(
  page: Page,
  expectedText: string,
  options?: string | Record<string, any>
) {
  let resolved_expectedText = vars.replaceVariables(expectedText);
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    navigationTimeout = Number(vars.getConfigValue("testExecution.navigationTimeout")),
    partialMatch = false,
    ignoreCase = false,
    assert = true,
    screenshot = true,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;

  if (isPlaywrightRunner()) {
    await __allureAny_val.step(
      `Web: Verify header -text: ${resolved_expectedText} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doverifyHeaderText();
      }
    );
  } else {
    await doverifyHeaderText();
  }
  async function doverifyHeaderText() {
    if (!page) throw new Error("Page not initialized");
    await waitForPageToLoad(page, navigationTimeout);
    await page.waitForSelector("h1, h2, h3, h4, h5, h6", {
      timeout: actionTimeout,
    });

    const startTime = Date.now();
    let matchFound = false;

    while (Date.now() - startTime < actionTimeout) {
      const target = page.locator("h1, h2, h3, h4, h5, h6");
      const count = await target.count();
      for (let i = 0; i < count; i++) {
        let actualText = await target.nth(i).innerText();
        let expected = resolved_expectedText;
        let actual = actualText;
        if (!ignoreCase) {
          expected = expected.toLowerCase();
          actual = actual.toLowerCase();
        }
        if (partialMatch ? actual.includes(expected) : actual === expected) {
          await attachLog(`✅ Header matched: "${actualText}"`, "text/plain");
          matchFound = true;
          break;
        }
      }
      if (matchFound) break;
      await waitInMilliSeconds(500); // Wait for 500ms before retrying
    }

    if (!matchFound) {
      const msg = `❌ Header text verification failed for "${resolved_expectedText}"`;
      await attachLog(msg, "text/plain");
      if (assert !== false) throw new Error(msg);
    }
    await processScreenshot(
      page,
      screenshot,
      screenshotText,
      screenshotFullPage
    );
  }
}

/**
 * Web: Verify text on page -text: {param} -options: {param}
 *
 * Verifies that the provided text is present somewhere in the page.
 *
 * @param text - The expected text to search for on the page.
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Optional timeout in milliseconds for waiting. Default: Configured timeout.
 *   - partialMatch: [boolean] Perform a partial match instead of an exact match. Default: false.
 *   - ignoreCase: [boolean] Perform a case-sensitive match. Default: false.
 *   - assert: [boolean] If false, logs the failure but does not throw. Default: true.
 *   - screenshot: [boolean] Capture a screenshot. Default: true.
 *   - screenshotText: [string] Description for the screenshot.
 *   - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 *
 * @example
 *  Web: Verify text on page -text: "Welcome back!" -options: "{partialMatch: true, screenshot: true, screenshotText: 'Verifying greeting'}"
 */
export async function verifyTextOnPage(
  page: Page,
  text: string,
  options?: string | Record<string, any>
) {
  const resolvedText = vars.replaceVariables(text);
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    partialMatch = false,
    ignoreCase = false,
    assert = true,
    screenshot = true,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;

  if (isPlaywrightRunner()) {
    await __allureAny_val.step(
      `Web: Verify text on page -text: ${resolvedText} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doVerifyTextOnPage();
      }
    );
  } else {
    await doVerifyTextOnPage();
  }

  async function doVerifyTextOnPage() {
    if (!page) throw new Error("Page not initialized");
    await waitForPageToLoad(page, actionTimeout);
    let matched = false;
    let allText = await page.textContent("body");
    let actual = allText || "";
    let expected = resolvedText;
    if (!ignoreCase) {
      actual = actual.toLowerCase();
      expected = expected.toLowerCase();
    }
    matched = partialMatch
      ? actual.includes(expected)
      : actual.includes(expected);
    if (!matched) {
      const message = `❌ Text "${resolvedText}" not found in page content.`;
      await attachLog(message, "text/plain");
      if (assert !== false) throw new Error(message);
    } else {
      await attachLog(`✅ Text "${resolvedText}" found in page.`, "text/plain");
    }
    await processScreenshot(
      page,
      screenshot,
      screenshotText || `Verify text in page: ${resolvedText}`,
      screenshotFullPage
    );
  }
}

/**
 * Web: Verify text not empty at location -field: {param} -options: {param}
 *
 * Verifies that the text content of an element is not empty.
 *
 * @param page - Playwright Page instance
 * @param field - The label, id, name, or selector of the element to verify
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Optional timeout in milliseconds. Default: Configured timeout.
 *   - pattern: [string] Optional pattern to refine element search.
 *   - assert: [boolean] If false, logs the failure but does not throw. Default: true.
 *   - screenshot: [boolean] Capture screenshot. Default: true.
 *   - screenshotText: [string] Screenshot description.
 *   - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 */
export async function verifyTextNotEmptyAtLocation(
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    pattern,
    assert = true,
    screenshot = true,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;

  if (isPlaywrightRunner()) {
    await __allureAny_val.step(
      `Web: Verify text not empty at location -field: ${field} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doVerifyTextNotEmptyAtLocation();
      }
    );
  } else {
    await doVerifyTextNotEmptyAtLocation();
  }

  async function doVerifyTextNotEmptyAtLocation() {
    if (!page) throw new Error("Page not initialized");
    await waitForPageToLoad(page, actionTimeout);

    const target =
      typeof field === "string"
        ? await webLocResolver("text", field, page, pattern, actionTimeout)
        : field;

    await target.waitFor({ state: "visible", timeout: actionTimeout });

    const actualText = (await target.innerText()).trim();

    if (!actualText) {
      await attachLog(`❌ Text at location "${field}" is empty!`, "text/plain");
      if (assert !== false) {
        throw new Error(`❌ Text at location "${field}" is empty.`);
      }
    } else {
      await attachLog(
        `✅ Text at location "${field}" is not empty: "${actualText}"`,
        "text/plain"
      );
    }

    await processScreenshot(
      page,
      screenshot,
      screenshotText,
      screenshotFullPage
    );
  }
}

/**
 * Web: Verify text at location -field: {param} -value: {param} -options: {param}
 *
 * Verifies that the text content of an element matches the expected value.
 *
 * @param field - The label, id, name, or selector of the element to verify.
 * @param expectedText - The expected text content.
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Optional timeout in milliseconds. Default: Configured timeout.
 *   - partialMatch: [boolean] If true, performs substring match. Default: false.
 *   - pattern: [string] Optional pattern to refine element search.
 *   - ignoreCase: [boolean] Whether the match is case-sensitive. Default: true.
 *   - assert: [boolean] If false, logs the failure but does not throw. Default: true.
 *   - screenshot: [boolean] Capture screenshot. Default: true.
 *   - screenshotText: [string] Screenshot description.
 *   - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 */
export async function verifyTextAtLocation(
  page: Page,
  field: string | Locator,
  expectedText: string,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};

  const {
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    partialMatch = false,
    pattern,
    ignoreCase = true,
    assert = true,
    screenshot = true,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;
  const resolvedExpectedValue = vars.replaceVariables(expectedText);
  if (isPlaywrightRunner()) {
    await __allureAny_val.step(
      `Web: Verify text at location -field: ${field} -value: ${resolvedExpectedValue} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doVerifyTextAtLocation();
      }
    );
  } else {
    await doVerifyTextAtLocation();
  }

  async function doVerifyTextAtLocation() {
    if (!page) throw new Error("Page not initialized");
    await waitForPageToLoad(page, actionTimeout);

    const target =
      typeof field === "string"
        ? await webLocResolver("text", field, page, pattern, actionTimeout)
        : field;

    await target.waitFor({ state: "visible", timeout: actionTimeout });

    const tagName = await target.evaluate(el => el.tagName.toLowerCase());
    let actualText: string;
    if (tagName === 'textarea' || tagName === 'input') {
      actualText = (await target.inputValue()).trim();
    } else {
      actualText = (await target.innerText()).trim();
    }

    const expected = vars.getValue(resolvedExpectedValue).trim();

    let match = false;
    if (ignoreCase) {
      match = partialMatch
        ? actualText.includes(expected)
        : actualText === expected;
    } else {
      match = partialMatch
        ? actualText.toLowerCase().includes(expected.toLowerCase())
        : actualText.toLowerCase() === expected.toLowerCase();
    }

    if (match) {
      await attachLog(`✅ Text matched: "${actualText}"`, "text/plain");
    } else {
      await attachLog(
        `❌ Text mismatch: expected "${expected}", got "${actualText}"`,
        "text/plain"
      );
      if (assert !== false) {
        throw new Error(`❌ Text mismatch for field "${field}"`);
      }
    }

    await processScreenshot(
      page,
      screenshot,
      screenshotText,
      screenshotFullPage
    );
  }
}

/**
 * Web: Verify input field is blank -field: {param} -options: {param}
 *
 * Verifies that an input field is blank (empty value).
 *
 * @param page - Playwright Page instance
 * @param field - The label, id, name, selector, or Locator for the input field
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Optional timeout in milliseconds. Default: Configured timeout.
 *   - pattern: [string] Optional pattern to refine element search.
 *   - assert: [boolean] If false, logs the failure but does not throw. Default: true.
 *   - screenshot: [boolean] Capture screenshot. Default: true.
 *   - screenshotText: [string] Screenshot description.
 *   - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 */
export async function verifyInputFieldIsBlank(
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    pattern,
    assert = true,
    screenshot = true,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;

  if (isPlaywrightRunner()) {
    await __allureAny_val.step(
      `Web: Verify input field is blank -field: ${field} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doVerifyInputFieldIsBlank();
      }
    );
  } else {
    await doVerifyInputFieldIsBlank();
  }

  async function doVerifyInputFieldIsBlank() {
    if (!page) throw new Error("Page not initialized");
    await waitForPageToLoad(page, actionTimeout);

    const target =
      typeof field === "string"
        ? await webLocResolver("input", field, page, pattern, actionTimeout)
        : field;

    await target.waitFor({ state: "visible", timeout: actionTimeout });

    const actualValue = (await target.inputValue()).trim();

    if (actualValue === "") {
      await attachLog(
        `✅ Input field "${field}" is blank.`,
        "text/plain"
      );
    } else {
      await attachLog(
        `❌ Input field "${field}" is not blank. Value: "${actualValue}"`,
        "text/plain"
      );
      if (assert !== false) {
        throw new Error(`❌ Input field "${field}" is not blank.`);
      }
    }

    await processScreenshot(
      page,
      screenshot,
      screenshotText,
      screenshotFullPage
    );
  }
}

/**
 * Web: Verify input field is present -field: {param} -options: {param}
 *
 * Verifies that an input field is present on the page, identified by label, text, id, name, or pattern.
 *
 * @param field - The label, text, id, name, or selector of the input field to verify (e.g., "Email", "Password").
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Optional timeout in milliseconds for waiting. Default: Configured timeout.
 *   - pattern: [string] Optional pattern to refine element search. Default: Configured pattern.
 *   - assert: [boolean] If false, continues the test even if the verification fails. Default: true.
 *   - screenshot: [boolean] Capture a screenshot during verification. Default: true.
 *   - screenshotText: [string] Text description for the screenshot. Default: "".
 *   - screenshotFullPage: [boolean] Capture a full page screenshot. Default: true.
 *
 * @example
 *  Web: Verify input field is present -field: "Email" -options: "{screenshot: true, screenshotText: 'Verifying Email input field'}"
 */
export async function verifyInputFieldPresent(
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    pattern,
    assert = true,
    screenshot = true,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;

  if (!page) throw new Error("Page not initialized");
  await waitForPageToLoad(page, actionTimeout);

  const target =
    typeof field === "string"
      ? await webLocResolver("input", field, page, pattern, actionTimeout)
      : field;

  const isVisible = await target.isVisible();

  if (isVisible) {
    await attachLog(
      `✅ Input field "${field}" is present and visible.`,
      "text/plain"
    );
  } else {
    await attachLog(`❌ Input field "${field}" is not visible.`, "text/plain");
    if (assert !== false) {
      throw new Error(`❌ Input field "${field}" is not visible.`);
    }
  }
  await processScreenshot(page, screenshot, screenshotText, screenshotFullPage);
}

/**
 * Web: Verify input field value -field: {param} -value: {param} -options: {param}
 *
 * Verifies that the value of an input field matches the expected value.
 *
 * @param field - The label, id, name, or selector of the input field to verify.
 * @param expectedValue - The expected value of the input field.
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Optional timeout in milliseconds. Default: Configured timeout.
 *   - partialMatch: [boolean] If true, performs substring match. Default: false.
 *   - pattern: [string] Optional pattern to refine element search.
 *   - ignoreCase: [boolean] Whether the match is case-sensitive. Default: true.
 *   - assert: [boolean] If false, logs the failure but does not throw. Default: true.
 *   - screenshot: [boolean] Capture screenshot. Default: true.
 *   - screenshotText: [string] Screenshot description.
 *   - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 */
export async function verifyInputFieldValue(
  page: Page,
  field: string | Locator,
  expectedValue: string,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    partialMatch = false,
    pattern,
    ignoreCase = true,
    assert = true,
    screenshot = true,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;
  const resolvedExpectedValue = vars.replaceVariables(expectedValue);

  if (isPlaywrightRunner()) {
    await __allureAny_val.step(
      `Web: Verify input field value -field: ${field} -value: ${resolvedExpectedValue} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doVerifyInputFieldValue();
      }
    );
  } else {
    await doVerifyInputFieldValue();
  }

  async function doVerifyInputFieldValue() {
    if (!page) throw new Error("Page not initialized");
    await waitForPageToLoad(page, actionTimeout);

    const target =
      typeof field === "string"
        ? await webLocResolver("input", field, page, pattern, actionTimeout)
        : field;

    await target.waitFor({ state: "visible", timeout: actionTimeout });

    const tagName = await target.evaluate(el => el.tagName.toLowerCase());
    let actualValue: string;
    if (tagName === 'textarea' || tagName === 'input') {
      actualValue = (await target.inputValue()).trim();
    } else {
      actualValue = (await target.innerText()).trim();
    }

    const expected = vars.getValue(resolvedExpectedValue).trim();

    let match = false;
    if (ignoreCase) {
      match = partialMatch
        ? actualValue.includes(expected)
        : actualValue === expected;
    } else {
      match = partialMatch
        ? actualValue.toLowerCase().includes(expected.toLowerCase())
        : actualValue.toLowerCase() === expected.toLowerCase();
    }

    if (match) {
      await attachLog(`✅ Input value matched: "${actualValue}"`, "text/plain");
    } else {
      await attachLog(
        `❌ Input value mismatch: expected "${expected}", got "${actualValue}"`,
        "text/plain"
      );
      if (assert !== false) {
        throw new Error(`❌ Input value mismatch for field "${field}"`);
      }
    }

    await processScreenshot(
      page,
      screenshot,
      screenshotText,
      screenshotFullPage
    );
  }
}

/**
 * Web: Verify locked input field value -field: {param} -value: {param} -options: {param}
 *
 * Verifies that the value of an locked input field matches the expected value.
 *
 * @param field - The label, id, name, or selector of the input field to verify.
 * @param expectedValue - The expected value of the input field.
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Optional timeout in milliseconds. Default: Configured timeout.
 *   - partialMatch: [boolean] If true, performs substring match. Default: false.
 *   - pattern: [string] Optional pattern to refine element search.
 *   - ignoreCase: [boolean] Whether the match is case-sensitive. Default: true.
 *   - assert: [boolean] If false, logs the failure but does not throw. Default: true.
 *   - screenshot: [boolean] Capture screenshot. Default: true.
 *   - screenshotText: [string] Screenshot description.
 *   - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 */
export async function verifyLockedInputFieldValue(
  page: Page,
  field: string | Locator,
  expectedValue: string,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? vars.parseLooseJson(options) : options || {};
  const {
    actionTimeout = config?.testExecution?.actionTimeout || Number(
      vars.getConfigValue("testExecution.actionTimeout")
    ) || 30000,
    partialMatch = false,
    pattern,
    ignoreCase = false,
    assert = true,
    screenshot = true,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;
  const resolvedExpectedValue = vars.replaceVariables(expectedValue);

  if (isPlaywrightRunner()) {
    await __allureAny_web.step(
      `Web: Verify input field value -field: ${field} -value: ${resolvedExpectedValue} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doVerifyInputFieldValue();
      }
    );
  } else {
    await doVerifyInputFieldValue();
  }

  async function doVerifyInputFieldValue() {
    if (!page) throw new Error("Page not initialized");
    await waitForPageToLoad(page, actionTimeout);

    const target =
      typeof field === "string"
        ? await webLocResolver("input", field, page, pattern, actionTimeout)
        : field;

    await target.waitFor({ state: "visible", timeout: actionTimeout });

    const actualValue = (await target.inputValue()).trim();
    const expected = vars.getValue(resolvedExpectedValue).trim();

    let match = false;
    if (ignoreCase) {
      match = partialMatch
        ? actualValue.includes(expected)
        : actualValue === expected;
    } else {
      match = partialMatch
        ? actualValue.toLowerCase().includes(expected.toLowerCase())
        : actualValue.toLowerCase() === expected.toLowerCase();
    }

    if (match) {
      await attachLog(`✅ Input value matched: "${actualValue}"`, "text/plain");
    } else {
      await attachLog(
        `❌ Locked input value mismatch: expected "${expected}", got "${actualValue}"`,
        "text/plain"
      );
      if (assert !== false) {
        throw new Error(`❌ Locked input value mismatch for field "${field}"`);
      }
    }

    await processScreenshot(
      page,
      screenshot,
      screenshotText,
      screenshotFullPage
    );
  }
}

/**
 * Web: Verify Tab field Present -field: {param} -options: {param}
 *
 * Verifies that a "Tab" field is present on the page, identified by label, text, id, name, or pattern.
 *
 * @param field - The label, text, id, name, or selector of the tab to verify (e.g., "Overview", "Settings").
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Optional timeout in milliseconds for waiting. Default: from [config] or 30000.
 *   - pattern: [string] Optional pattern to refine element search.
 *   - assert: [boolean] If false, logs the failure but does not throw. Default: true.
 *   - isPresent: [boolean] Check Tab is present on the page. Default: true.
 *   - isEnabled: [boolean] Check if Tab is enabled. Default: false.
 *   - isSelected: [boolean] Check if Tab is selected. Default: false.
 *   - isNotSelected: [boolean] Check if Tab is not selected. Default: false.
 *   - screenshot: [boolean] Capture a screenshot. Default: true.
 *   - screenshotText: [string] Description for the screenshot.
 *   - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 */
export async function verifyTabField(
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    pattern,
    assert = true,
    isPresent = true,
    isEnabled = false,
    isSelected = false,
    isNotSelected = false,
    screenshot = true,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;

  if (isPlaywrightRunner()) {
    await __allureAny_val.step(
      ` Web: Verify Tab field Present -field: ${field} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doVerifyTabField();
      }
    );
  } else {
    await doVerifyTabField();
  }

  async function doVerifyTabField() {
    if (!page) throw new Error("Page not initialized");
    await waitForPageToLoad(page);

    const target =
      typeof field === "string"
        ? await webLocResolver("tab", field, page, pattern, actionTimeout)
        : field;
    await waitForEnabled(target, actionTimeout);
    let failureReason = "";

    if (isPresent) {
      const isVisible = await target.isVisible();
      if (!isVisible) {
        failureReason += `❌ Tab "${field}" is not visible.\n`;
      } else {
        await attachLog(`✅ Tab "${field}" is visible.`, "text/plain");
      }
    }

    if (isEnabled) {
      const isEnabled = await target.isEnabled();
      if (!isEnabled) {
        failureReason += `❌ Tab "${field}" is disabled.\n`;
      } else {
        await attachLog(`✅ Tab "${field}" is enabled.`, "text/plain");
      }
    }

    if (isSelected) {
      const ariaSelected = await target.getAttribute("aria-selected");
      const tabIndex = await target.getAttribute("tabindex");
      if (ariaSelected !== "true" || tabIndex !== "0") {
        failureReason += `❌ Tab "${field}" is not selected (aria-selected != true).\n`;
      } else {
        await attachLog(
          `✅ Tab "${field}" is selected (aria-selected = true).`,
          "text/plain"
        );
      }
    }

    if (isNotSelected) {
      const ariaSelected = await target.getAttribute("aria-selected");
      const tabIndex = await target.getAttribute("tabindex");
      if (ariaSelected !== "false" || tabIndex !== "-1") {
        failureReason += `❌ Tab "${field}" is focused (expected not focused).\n`;
      } else {
        await attachLog(`✅ Tab "${field}" is not focused.`, "text/plain");
      }
    }

    if (failureReason) {
      await attachLog(failureReason.trim(), "text/plain");
      if (assert !== false) {
        throw new Error(failureReason.trim());
      }
    }

    await processScreenshot(
      page,
      screenshot,
      screenshotText,
      screenshotFullPage
    );
  }
}

/**
 * Web: Verify Toast Text Contains -text: {param} -options: {param}
 *
 * Verifies that a toast (notification) element appears on the page and contains the expected text.
 * Throws an error (or logs a warning if `assert: false`) if the text is not found.
 *
 * @param page - Playwright Page instance.
 * @param text - The expected substring to match within the toast notification (e.g., "Saved successfully").
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Timeout in milliseconds to wait for toast visibility. Default: 30000.
 *   - pattern: [string] Optional pattern to refine toast element search (e.g., class name or attribute).
 *   - assert: [boolean] If false, logs the failure but does not throw. Default: true.
 *   - screenshot: [boolean] Capture a screenshot after verification. Default: true.
 *   - screenshotText: [string] Description for screenshot attachment.
 *   - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 *
 * @example
 * Web: Verify Toast Text Contains -text: "Saved successfully"
 */
export async function verifyToastTextContains(
  page: Page,
  text: string,
  options?: any
) {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    pattern,
    assert = true,
    screenshot = true,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;

  const target =
    typeof text === "string"
      ? await webLocResolver(
        "text",
        text,
        page,
        pattern,
        actionTimeout,
        "before"
      )
      : text;

  await target.waitFor({ state: "visible", timeout: actionTimeout });

  const actual = await target.textContent();
  if (!actual?.includes(text)) {
    await attachLog(
      `❌ Expected toast to contain "${text}", but got "${actual}"`,
      "text/plain"
    );
    if (assert) {
      throw new Error(
        `❌ Expected toast to contain "${text}", but got "${actual}"`
      );
    } else {
      await logFixture
        .getLogger()
        ?.warn(`❌ Expected toast to contain "${text}", but got "${actual}"`);
    }
  } else {
    await attachLog(`✅ Toast contains expected text: "${text}"`, "text/plain");
  }
  await processScreenshot(page, screenshot, screenshotText, screenshotFullPage);
}

/**
 * Web: Verify text to disappear at location -field: {param} -text: {param} -options: {param}
 *
 * Verifies that the specified text disappears from the given field/locator within a timeout.
 *
 * @param page - Playwright Page instance
 * @param field - The selector or Locator where the text should disappear
 * @param textToDisappear - The text to wait for disappearance
 * @param options - Optional string or object:
 *   - actionTimeout: [number] Timeout in ms (default: 30000)
 *   - partialMatch: [boolean] If true, waits for substring match (default: false)
 *   - ignoreCase: [boolean] If true, match is case-insensitive (default: true)
 *   - assert: [boolean] If false, logs the failure but does not throw. Default: true.
 *   - screenshot: [boolean] Capture screenshot after waiting (default: true)
 *   - screenshotText: [string] Description for screenshot
 *   - screenshotFullPage: [boolean] Full page screenshot (default: true)
 *
 * @example
 *   await verifyTextToDisappearAtLocation(page, 'h1', 'Loading...', { actionTimeout: 10000, partialMatch: true });
 */
export async function verifyTextToDisappearAtLocation(
  page: Page,
  field: string | Locator,
  textToDisappear: string,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    partialMatch = false,
    ignoreCase = true,
    assert = true,
    screenshot = true,
    screenshotText = "",
    screenshotFullPage = true,
    pattern,
  } = options_json;

  if (isPlaywrightRunner()) {
    await __allureAny_val.step(
      `Web: Verify text to disappear at location -field: ${field} -text: ${textToDisappear} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doVerifyTextToDisappearAtLocation();
      }
    );
  } else {
    await doVerifyTextToDisappearAtLocation();
  }

  async function doVerifyTextToDisappearAtLocation() {
    if (!page) throw new Error("Page not initialized");
    await waitForPageToLoad(page, actionTimeout);

    const target =
      typeof field === "string"
        ? await webLocResolver("text", field, page, pattern, actionTimeout)
        : field;

    const start = Date.now();
    let disappeared = false;
    let lastActual = "";

    while (Date.now() - start < actionTimeout) {
      if (!(await target.isVisible().catch(() => false))) {
        disappeared = true;
        break;
      }
      const actualText = ((await target.innerText().catch(() => "")) || "").trim();
      lastActual = actualText;
      let expected = textToDisappear;
      let actual = actualText;
      if (ignoreCase) {
        expected = expected.toLowerCase();
        actual = actual.toLowerCase();
      }
      if (partialMatch ? !actual.includes(expected) : actual !== expected) {
        disappeared = true;
        break;
      }
      await new Promise((res) => setTimeout(res, 300));
    }

    if (!disappeared) {
      const msg = `❌ Text "${textToDisappear}" did not disappear from location "${field}" within ${actionTimeout}ms. Last actual: "${lastActual}"`;
      await attachLog(msg, "text/plain");
      if (assert !== false) throw new Error(msg);
    } else {
      await attachLog(
        `✅ Text "${textToDisappear}" disappeared from location "${field}"`,
        "text/plain"
      );
    }

    await processScreenshot(
      page,
      screenshot,
      screenshotText || `Verified text disappeared at location: ${textToDisappear}`,
      screenshotFullPage
    );
  }
}

/**
 * Web: Verify field is locked -field: {param} -options: {param}
 * Verifies that the specified field on the page is locked (read-only).
 * Designed for use in Cucumber step definitions.
 * 
 * @param page - Playwright Page instance.
 * @param field - The label, text, id, name, or selector of the field.
 * @param options - Optional settings for the verification action. Can be a JSON string or an object:
 *  - screenshot: [boolean] Capture a screenshot. Default: true.
 *  - screenshotText: [string] Description for the screenshot.
 * - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 * 
 */
export async function verifyFieldIsLocked(
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? vars.parseLooseJson(options) : options || {};
  const {
    iframe = "",
    actionTimeout = config?.testExecution?.actionTimeout || Number(
      vars.getConfigValue("testExecution.actionTimeout")
    ) || 30000, // Default timeout
    pattern,
    fieldType,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
    screenshotField = false,
    smartIQ_refreshLoc = "",
  } = options_json || {};

  if (isPlaywrightRunner()) {
    await __allureAny_web.step(
      `Web: Verify field is locked -field: ${field} -options: ${JSON.stringify(options_json)}`,
      async () => {
        await doverifyFieldLocked();
      }
    );
  } else {
    await doverifyFieldLocked();
  }

  async function doverifyFieldLocked() {
    const target =
      typeof field === "string"
        ? await webLocResolver(
          fieldType || "input",
          field,
          page,
          pattern,
          smartIQ_refreshLoc
        )
        : field;
    if (iframe) {
      await waitForEnabled(
        page.frameLocator(iframe).locator(target),
        actionTimeout
      );
      await expect(target).toBeVisible({ timeout: actionTimeout });
    } else {
      await waitForEnabled(target, actionTimeout);
      await expect(target).toBeVisible({ timeout: actionTimeout });
    }
    const isFieldScreenshot = screenshotField === true;
    await processScreenshot(
      page,
      screenshot,
      screenshotText,
      !isFieldScreenshot,
      isFieldScreenshot ? target : undefined
    );
  }
}

/**
 * Web: Verify field is mandatory -field: {param} -options: {param}
 * Verifies that the specified field on the page is locked (read-only).
 * Designed for use in Cucumber step definitions.
 * 
 * @param page - Playwright Page instance.
 * @param field - The label, text, id, name, or selector of the field.
 * @param options - Optional settings for the verification action. Can be a JSON string or an object:
 *  - screenshot: [boolean] Capture a screenshot. Default: true.
 *  - screenshotText: [string] Description for the screenshot.
 * - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 * 
 */
export async function verifyFieldIsMandatory(
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? vars.parseLooseJson(options) : options || {};
  const {
    iframe = "",
    actionTimeout = config?.testExecution?.actionTimeout || Number(
      vars.getConfigValue("testExecution.actionTimeout")
    ) || 30000, // Default timeout
    pattern,
    fieldType,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
    screenshotField = false,
    smartIQ_refreshLoc = "",
  } = options_json || {};

  if (isPlaywrightRunner()) {
    await __allureAny_web.step(
      `Web: Verify field is mandatory -field: ${field} -options: ${JSON.stringify(options_json)}`,
      async () => {
        await doverifyFieldIsMandatory();
      }
    );
  } else {
    await doverifyFieldIsMandatory();
  }

  async function doverifyFieldIsMandatory() {
    const target =
      typeof field === "string"
        ? await webLocResolver(
          fieldType || "input",
          field,
          page,
          pattern,
          smartIQ_refreshLoc
        )
        : field;
    if (iframe) {
      await waitForEnabled(
        page.frameLocator(iframe).locator(target),
        actionTimeout
      );
      await expect(target).toBeVisible({ timeout: actionTimeout });
    } else {
      await waitForEnabled(target, actionTimeout);
      await expect(target).toBeVisible({ timeout: actionTimeout });
    }
    const isFieldScreenshot = screenshotField === true;
    await processScreenshot(
      page,
      screenshot,
      screenshotText,
      !isFieldScreenshot,
      isFieldScreenshot ? target : undefined
    );
  }
}

/**
 * Web: Verify field is secured -field: {param} -options: {param}
 * Verifies that the specified field on the page is secured.
 * Designed for use in Cucumber step definitions.
 * 
 * @param page - Playwright Page instance.
 * @param field - The label, text, id, name, or selector of the field.
 * @param options - Optional settings for the verification action. Can be a JSON string or an object:
 *  - screenshot: [boolean] Capture a screenshot. Default: true.
 *  - screenshotText: [string] Description for the screenshot.
 * - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 * 
 */
export async function verifyFieldIsSecured(
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? vars.parseLooseJson(options) : options || {};
  const {
    iframe = "",
    actionTimeout = config?.testExecution?.actionTimeout || Number(
      vars.getConfigValue("testExecution.actionTimeout")
    ) || 30000, // Default timeout
    pattern,
    fieldType,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
    screenshotField = false,
    smartIQ_refreshLoc = "",
  } = options_json || {};

  if (isPlaywrightRunner()) {
    await __allureAny_web.step(
      `Web: Verify field is secured -field: ${field} -options: ${JSON.stringify(options_json)}`,
      async () => {
        await doverifyFieldIsSecured();
      }
    );
  } else {
    await doverifyFieldIsSecured();
  }

  async function doverifyFieldIsSecured() {
    const target =
      typeof field === "string"
        ? await webLocResolver(
          fieldType || "input",
          field,
          page,
          pattern,
          smartIQ_refreshLoc
        )
        : field;
    if (iframe) {
      await waitForEnabled(
        page.frameLocator(iframe).locator(target),
        actionTimeout
      );
      await expect(target).toBeVisible({ timeout: actionTimeout });
    } else {
      await waitForEnabled(target, actionTimeout);
      await expect(target).toBeVisible({ timeout: actionTimeout });
    }
    const isFieldScreenshot = screenshotField === true;
    await processScreenshot(
      page,
      screenshot,
      screenshotText,
      !isFieldScreenshot,
      isFieldScreenshot ? target : undefined
    );
  }
}

/**
 * Web: Verify select field value -field: {param} -value: {param} -options: {param}
 *
 * Verifies that the value of a select field matches the expected value.
 *
 * @param field - The label, id, name, or selector of the select field to verify.
 * @param expectedValue - The expected value of the select field.
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Optional timeout in milliseconds. Default: Configured timeout.
 *   - partialMatch: [boolean] If true, performs substring match. Default: false.
 *   - pattern: [string] Optional pattern to refine element search.
 *   - ignoreCase: [boolean] Whether the match is case-sensitive. Default: true.
 *   - assert: [boolean] If false, logs the failure but does not throw. Default: true.
 *   - screenshot: [boolean] Capture screenshot. Default: true.
 *   - screenshotText: [string] Screenshot description.
 *   - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 */
export async function verifySelectDropdownValue(
  page: Page,
  field: string | Locator,
  expectedValue: string,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? vars.parseLooseJson(options) : options || {};
  const {
    actionTimeout = config?.testExecution?.actionTimeout || Number(
      vars.getConfigValue("testExecution.actionTimeout")
    ) || 30000,
    partialMatch = false,
    pattern,
    ignoreCase = false,
    assert = true,
    screenshot = true,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;
  const resolvedExpectedValue = vars.replaceVariables(expectedValue);

  if (isPlaywrightRunner()) {
    await __allureAny_web.step(
      `Web: Verify select dropdown value -field: ${field} -value: ${resolvedExpectedValue} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doVerifySelectDropdownValue();
      }
    );
  } else {
    await doVerifySelectDropdownValue();
  }

  async function doVerifySelectDropdownValue() {
    if (!page) throw new Error("Page not initialized");
    await waitForPageToLoad(page, actionTimeout);

    const target =
      typeof field === "string"
        ? await webLocResolver("dropdown", field, page, pattern, actionTimeout)
        : field;

    await target.waitFor({ state: "visible", timeout: actionTimeout });

    const actualValue = (await target.getAttribute("value")).trim();
    const expected = vars.getValue(resolvedExpectedValue).trim();

    let match = false;
    if (ignoreCase) {
      match = partialMatch
        ? actualValue.includes(expected)
        : actualValue === expected;
    } else {
      match = partialMatch
        ? actualValue.toLowerCase().includes(expected.toLowerCase())
        : actualValue.toLowerCase() === expected.toLowerCase();
    }

    if (match) {
      await attachLog(`✅ Select value matched: "${actualValue}"`, "text/plain");
    } else {
      await attachLog(
        `❌ Select value mismatch: expected "${expected}", got "${actualValue}"`,
        "text/plain"
      );
      if (assert !== false) {
        throw new Error(`❌ Select value mismatch for field "${field}"`);
      }
    }

    await processScreenshot(
      page,
      screenshot,
      screenshotText,
      screenshotFullPage
    );
  }
}

/**
 * Web: Verify select list does not have given value -field: {param} -value: {param} -options: {param}
 *
 * Verifies that a select dropdown does NOT contain the specified value in its options list.
 *
 * @param page - Playwright Page instance
 * @param field - The label, id, name, or selector of the select field to verify.
 * @param excludedValue - The value that should NOT be present in the dropdown options.
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Optional timeout in milliseconds. Default: Configured timeout.
 *   - pattern: [string] Optional pattern to refine element search.
 *   - ignoreCase: [boolean] Whether the match is case-sensitive. Default: true.
 *   - assert: [boolean] If false, logs the failure but does not throw. Default: true.
 *   - screenshot: [boolean] Capture screenshot. Default: true.
 *   - screenshotText: [string] Screenshot description.
 *   - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 *
 * @example
 *  Web: Verify select list does not have given value -field: "Country" -value: "Antarctica" -options: "{screenshot: true, screenshotText: 'Verified Antarctica not in list'}"
 */
export async function verifySelectListNotHaveGivenValue(
  page: Page,
  field: string | Locator,
  excludedValue: string,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? vars.parseLooseJson(options) : options || {};
  const {
    actionTimeout = config?.testExecution?.actionTimeout || Number(
      vars.getConfigValue("testExecution.actionTimeout")
    ) || 30000,
    pattern,
    ignoreCase = false,
    assert = true,
    screenshot = true,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;
  const resolvedExcludedValue = vars.replaceVariables(excludedValue);

  if (isPlaywrightRunner()) {
    await __allureAny_web.step(
      `Web: Verify select list does not have given value -field: ${field} -value: ${resolvedExcludedValue} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doVerifySelectListNotHaveGivenValue();
      }
    );
  } else {
    await doVerifySelectListNotHaveGivenValue();
  }

  async function doVerifySelectListNotHaveGivenValue() {
    if (!page) throw new Error("Page not initialized");
    await waitForPageToLoad(page, actionTimeout);

    const target =
      typeof field === "string"
        ? await webLocResolver("dropdown", field, page, pattern, actionTimeout)
        : field;

    await target.waitFor({ state: "visible", timeout: actionTimeout });
    await target.click();
    await page.waitForTimeout(2000); // Wait for options to render

    const optionLocator = target.locator('xpath=following::div[@role="option"]');
    const size = await optionLocator.count();
    if (size === 0) {
      throw new Error(`❌ No options found for the select field "${field}".`);
    }

    // Collect all option texts and check for the excluded value
    const optionTexts: string[] = [];
    for (let i = 0; i < size; i++) {
      optionTexts.push((await optionLocator.nth(i).innerText()).trim());
    }

    // Case handling: when ignoreCase=true, compare in lowercase; else compare exact
    const found = optionTexts.some((optText) => {
      const current = ignoreCase ? optText.toLowerCase() : optText;
      const compare = ignoreCase
        ? vars.replaceVariables(resolvedExcludedValue).trim().toLowerCase()
        : vars.replaceVariables(resolvedExcludedValue).trim();
      return current === compare;
    });

    if (found) {
      const msg = `❌ Select list should NOT contain "${resolvedExcludedValue}", but it was found.`;
      await attachLog(msg, "text/plain");
      if (assert !== false) {
        throw new Error(msg);
      }
    } else {
      await attachLog(
        `✅ Select list does not contain "${resolvedExcludedValue}" as expected.`,
        "text/plain"
      );
    }

    await processScreenshot(
      page,
      screenshot,
      screenshotText || `Verified select list does not contain: ${resolvedExcludedValue}`,
      screenshotFullPage
    );
  }
}


/**
 * Extracts the most relevant text/value/label for a given Playwright Locator element.
 * Handles input, textarea, innerText, aria-label, title, and placeholder.
 * Returns a trimmed string for robust matching.
 */
async function extractElementText(el: Locator): Promise<string> {
  try {
    const tag = await el.evaluate(e => e.tagName.toLowerCase());
    if (tag === 'input' || tag === 'textarea') {
      const value = await el.inputValue().catch(() => "");
      const placeholder = await el.getAttribute('placeholder').catch(() => "");
      const ariaLabel = await el.getAttribute('aria-label').catch(() => "");
      const title = await el.getAttribute('title').catch(() => "");
      return (value || placeholder || ariaLabel || title || "").trim();
    } else {
      const innerText = await el.innerText().catch(() => "");
      const ariaLabel = await el.getAttribute('aria-label').catch(() => "");
      const title = await el.getAttribute('title').catch(() => "");
      return (innerText || ariaLabel || title || "").trim();
    }
  } catch {
    return "";
  }
}

/**
 * Web: Verify element is present/visible -field: {param} -options: {param}
 *
 * Generic presence/visibility check for any element type (button, input, dropdown, text, etc.)
 * using PlayQ locator system and fieldType, with support for exact/partial match.
 *
 * @param page - Playwright Page instance
 * @param field - The label, text, id, name, or selector of the element to verify
 * @param options - Optional JSON string or object:
 *   - fieldType: [string] Type of element (e.g., "button", "input", "dropdown", "text", etc.)
 *   - actionTimeout: [number] Optional timeout in milliseconds. Default: Configured timeout.
 *   - pattern: [string] Optional pattern to refine element search.
 *   - partialMatch: [boolean] If true, allows substring match. Default: false (exact match).
 *   - assert: [boolean] If false, logs the failure but does not throw. Default: true.
 *   - screenshot: [boolean] Capture screenshot. Default: true.
 *   - screenshotText: [string] Screenshot description.
 *   - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 *   - unique: [boolean] If true, require exactly one match. Default: false.
 *
 * @example
 *   await web.verifyElementPresent(page, "My Button", { fieldType: "button" });
 *   await web.verifyElementPresent(page, "Search", { fieldType: "input", partialMatch: true });
 */
export async function verifyElementPresent(
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
) {
  const options_json = typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    fieldType = "",
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    pattern,
    partialMatch = false,
    assert = true,
    screenshot = true,
    screenshotText = "",
    screenshotFullPage = true,
    unique = false,
  } = options_json;

  if (!page) throw new Error("Page not initialized");
  await waitForPageToLoad(page, actionTimeout);

  const target =
    typeof field === "string"
      ? await webLocResolver(fieldType, field, page, pattern, actionTimeout)
      : field;


  // Wait for at least one element to be visible and matching (by text or value)
  const pollInterval = 200;
  const maxWait = actionTimeout || 5000;
  let foundIndexes: number[] = [];
  let elapsed = 0;
  while (elapsed < maxWait) {
    foundIndexes = [];
    const count = await target.count();
    for (let i = 0; i < count; i++) {
      const el = target.nth(i);
      if (await el.isVisible() && typeof field === 'string') {
        let text = await extractElementText(el);
        if (
          (partialMatch && text.includes(field)) ||
          (!partialMatch && text === field)
        ) {
          foundIndexes.push(i);
        }
      }
    }
    if ((unique && foundIndexes.length === 1) || (!unique && foundIndexes.length > 0)) {
      break;
    }
    await new Promise(res => setTimeout(res, pollInterval));
    elapsed += pollInterval;
  }

  let pass = false;
  if (unique) {
    pass = foundIndexes.length === 1;
  } else {
    pass = foundIndexes.length > 0;
  }

  if (pass) {
    await attachLog(
      `✅ Element (type: "${fieldType}", field: "${field}", partialMatch: ${partialMatch}) is present and visible. Matches: ${foundIndexes.length}`,
      "text/plain"
    );
  } else {
    await attachLog(
      `❌ Element (type: "${fieldType}", field: "${field}", partialMatch: ${partialMatch}) is not visible. Matches: ${foundIndexes.length}`,
      "text/plain"
    );
    if (assert !== false) {
      throw new Error(`❌ Element (type: "${fieldType}", field: "${field}", partialMatch: ${partialMatch}) is not visible. Matches: ${foundIndexes.length}`);
    }
  }
  await processScreenshot(page, screenshot, screenshotText, screenshotFullPage);
}

/**
 * Web: Verify element is NOT present/visible -field: {param} -options: {param}
 *
 * Generic absence/invisibility check for any element type (button, input, dropdown, text, etc.)
 * using PlayQ locator system and fieldType, with support for exact/partial match.
 *
 * @param page - Playwright Page instance
 * @param field - The label, text, id, name, or selector of the element to verify
 * @param options - Optional JSON string or object:
 *   - fieldType: [string] Type of element (e.g., "button", "input", "dropdown", "text", etc.)
 *   - actionTimeout: [number] Optional timeout in milliseconds. Default: Configured timeout.
 *   - pattern: [string] Optional pattern to refine element search.
 *   - partialMatch: [boolean] If true, allows substring match. Default: false (exact match).
 *   - assert: [boolean] If false, logs the failure but does not throw. Default: true.
 *   - screenshot: [boolean] Capture screenshot. Default: true.
 *   - screenshotText: [string] Screenshot description.
 *   - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 *   - unique: [boolean] If true, require exactly one match. Default: false.
 *
 * @example
 *   await web.verifyElementNotPresent(page, "My Button", { fieldType: "button" });
 *   await web.verifyElementNotPresent(page, "Search", { fieldType: "input", partialMatch: true });
 */
export async function verifyElementNotPresent(
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
) {
  const options_json = typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    fieldType = "",
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    pattern,
    partialMatch = false,
    assert = true,
    screenshot = true,
    screenshotText = "",
    screenshotFullPage = true,
    unique = false,
  } = options_json;

  if (!page) throw new Error("Page not initialized");

  await waitForPageToLoad(page, actionTimeout);

  const target =
    typeof field === "string"
      ? await webLocResolver(fieldType, field, page, pattern, actionTimeout)
      : field;

  // Wait for all matching elements to be absent or invisible (with polling)
  const pollInterval = 200;
  const maxWait = actionTimeout || 5000;
  let foundIndexes: number[] = [];
  let elapsed = 0;
  let pass = false;
  while (elapsed < maxWait) {
    foundIndexes = [];
    const count = await target.count();
    for (let i = 0; i < count; i++) {
      const el = target.nth(i);
      if (await el.isVisible() && typeof field === 'string') {
        let text = await extractElementText(el);
        if (
          (partialMatch && text.includes(field)) ||
          (!partialMatch && text === field)
        ) {
          foundIndexes.push(i);
        }
      }
    }
    // Only assign pass here, not redeclare
    if (unique) {
      pass = foundIndexes.length === 0;
    } else {
      pass = foundIndexes.length === 0;
    }
    if (pass) break;
    await new Promise(res => setTimeout(res, pollInterval));
    elapsed += pollInterval;
  }

  if (pass) {
    await attachLog(
      `✅ Element (type: "${fieldType}", field: "${field}", partialMatch: ${partialMatch}) is NOT present/visible. Matches: 0`,
      "text/plain"
    );
  } else {
    await attachLog(
      `❌ Element (type: "${fieldType}", field: "${field}", partialMatch: ${partialMatch}) IS present/visible. Matches: ${foundIndexes.length}`,
      "text/plain"
    );
    if (assert !== false) {
      throw new Error(`❌ Element (type: "${fieldType}", field: "${field}", partialMatch: ${partialMatch}) IS present/visible. Matches: ${foundIndexes.length}`);
    }
  }
  await processScreenshot(page, screenshot, screenshotText, screenshotFullPage);
}

/**
 * Web: Verify element is enabled -field: {param} -options: {param}
 * 
 * Verifies that the specified element on the page is enabled (not disabled).
 * 
 * @param page - Playwright Page instance.
 * @param field - The label, text, id, name, or selector of the element to verify.
 * @param options - Optional settings for the verification action. Can be a JSON string or an object:
 *  - fieldType: [string] Type of element (e.g., "button", "input", "dropdown", etc.)
 *  - actionTimeout: [number] Timeout in milliseconds to wait for page load. Default: Configured timeout.
 *  - pattern: [string] Optional pattern to refine element search.
 *  - partialMatch: [boolean] If true, allows substring match. Default: false (exact match).
 *  - assert: [boolean] If false, logs the failure but does not throw. Default: true.
 *  - screenshot: [boolean] Capture a screenshot. Default: true.
 *  - screenshotText: [string] Description for the screenshot.
 *  - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 * 
 * @example
 *  await web.verifyElementEnabled(page, "Submit Button", { fieldType: "button" }); 
 * 
 */
export async function verifyElementEnabled(
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
) {
  const options_json = typeof options === "string" ? parseLooseJson(options) : options || {};
  const { fieldType = "", actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")), pattern, partialMatch = false, assert = true, screenshot = true, screenshotText = "", screenshotFullPage = true } = options_json;
  if (!page) throw new Error("Page not initialized");
  await waitForPageToLoad(page, actionTimeout);
  const target = typeof field === "string" ? await webLocResolver(fieldType, field, page, pattern, actionTimeout) : field;
  const count = await target.count();
  let enabled = false;
  for (let i = 0; i < count; i++) {
    const el = target.nth(i);
    if (await el.isVisible() && typeof field === 'string') {
      let text = await extractElementText(el);
      if ((partialMatch && text.includes(field)) || (!partialMatch && text === field)) {
        enabled = await el.isEnabled();
        if (enabled) break;
      }
    }
  }
  if (enabled) {
    await attachLog(`✅ Element (type: "${fieldType}", field: "${field}") is enabled.`, "text/plain");
  } else {
    await attachLog(`❌ Element (type: "${fieldType}", field: "${field}") is not enabled.`, "text/plain");
    if (assert !== false) throw new Error(`❌ Element (type: "${fieldType}", field: "${field}") is not enabled.`);
  }
  await processScreenshot(page, screenshot, screenshotText, screenshotFullPage);
}

/**
 * Web: Verify element is disabled -field: {param} -options: {param}
 * 
 * Verifies that the specified element on the page is disabled (not enabled).
 *  
 * @param page - Playwright Page instance.
 * @param field - The label, text, id, name, or selector of the element to verify.
 * @param options - Optional settings for the verification action. Can be a JSON string or an object: 
 *  - fieldType: [string] Type of element (e.g., "button", "input", "dropdown", etc.)
 *  - actionTimeout: [number] Timeout in milliseconds to wait for page load. Default: Configured timeout.
 *  - pattern: [string] Optional pattern to refine element search.
 *  - partialMatch: [boolean] If true, allows substring match. Default: false (exact match).
 *  - assert: [boolean] If false, logs the failure but does not throw. Default: true.
 *  - screenshot: [boolean] Capture a screenshot. Default: true.
 *  - screenshotText: [string] Description for the screenshot.
 *  - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 * 
 * @example
 * await web.verifyElementDisabled(page, "Submit Button", { fieldType: "button" });
 * 
 */
export async function verifyElementDisabled(
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
) {
  const options_json = typeof options === "string" ? parseLooseJson(options) : options || {};
  const { fieldType = "", actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")), pattern, partialMatch = false, assert = true, screenshot = true, screenshotText = "", screenshotFullPage = true } = options_json;
  if (!page) throw new Error("Page not initialized");
  await waitForPageToLoad(page, actionTimeout);
  const target = typeof field === "string" ? await webLocResolver(fieldType, field, page, pattern, actionTimeout) : field;
  const count = await target.count();
  let disabled = false;
  for (let i = 0; i < count; i++) {
    const el = target.nth(i);
    if (await el.isVisible() && typeof field === 'string') {
      let text = await extractElementText(el);
      if ((partialMatch && text.includes(field)) || (!partialMatch && text === field)) {
        disabled = !(await el.isEnabled());
        if (disabled) break;
      }
    }
  }
  if (disabled) {
    await attachLog(`✅ Element (type: "${fieldType}", field: "${field}") is disabled.`, "text/plain");
  } else {
    await attachLog(`❌ Element (type: "${fieldType}", field: "${field}") is not disabled.`, "text/plain");
    if (assert !== false) throw new Error(`❌ Element (type: "${fieldType}", field: "${field}") is not disabled.`);
  }
  await processScreenshot(page, screenshot, screenshotText, screenshotFullPage);
}

/**
 * Web: Verify element is selected -field: {param} -options: {param}
 *
 * Verifies that the specified element on the page is selected (e.g., checkbox, radio button, option).
 * 
 * @param page - Playwright Page instance.
 * @param field - The label, text, id, name, or selector of the element to verify.
 * @param options - Optional settings for the verification action. Can be a JSON string or an object:
 *  - fieldType: [string] Type of element (e.g., "checkbox", "radio", "option", etc.)
 *  - actionTimeout: [number] Timeout in milliseconds to wait for page load. Default: Configured timeout.
 *  - pattern: [string] Optional pattern to refine element search.
 *  - partialMatch: [boolean] If true, allows substring match. Default: false (exact match).
 *  - assert: [boolean] If false, logs the failure but does not throw. Default: true.
 *  - screenshot: [boolean] Capture a screenshot. Default: true.
 *  - screenshotText: [string] Description for the screenshot.
 *  - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 *  
 * 
 * @example
 * await web.verifyElementSelected(page, "Accept Terms", { fieldType: "checkbox" });
 * 
 */
export async function verifyElementSelected(
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
) {
  const options_json = typeof options === "string" ? parseLooseJson(options) : options || {};
  const { fieldType = "", actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")), pattern, partialMatch = false, assert = true, screenshot = true, screenshotText = "", screenshotFullPage = true } = options_json;
  if (!page) throw new Error("Page not initialized");
  await waitForPageToLoad(page, actionTimeout);
  const target = typeof field === "string" ? await webLocResolver(fieldType, field, page, pattern, actionTimeout) : field;
  const count = await target.count();
  let selected = false;
  for (let i = 0; i < count; i++) {
    const el = target.nth(i);
    if (await el.isVisible() && typeof field === 'string') {
      let text = await extractElementText(el);
      if ((partialMatch && text.includes(field)) || (!partialMatch && text === field)) {
        // Try aria-selected, checked, or selected attribute
        const ariaSelected = await el.getAttribute("aria-selected");
        const checked = await el.getAttribute("checked");
        const selectedAttr = await el.getAttribute("selected");
        if (ariaSelected === "true" || checked === "true" || selectedAttr === "true") {
          selected = true;
          break;
        }
      }
    }
  }
  if (selected) {
    await attachLog(`✅ Element (type: "${fieldType}", field: "${field}") is selected.`, "text/plain");
  } else {
    await attachLog(`❌ Element (type: "${fieldType}", field: "${field}") is not selected.`, "text/plain");
    if (assert !== false) throw new Error(`❌ Element (type: "${fieldType}", field: "${field}") is not selected.`);
  }
  await processScreenshot(page, screenshot, screenshotText, screenshotFullPage);
}


/**
 *  
 * Web: Verify element has attribute -field: {param} -attribute: {param} -value: {param} -options: {param}
 * 
 * Verifies that the specified element on the page has the given attribute with the expected value.
 * 
 * @param page - Playwright Page instance.
 * @param field - The label, text, id, name, or selector of the element to verify.
 * @param attribute - The attribute name to check (e.g., "href", "src", "alt", etc.).
 * @param expectedValue - The expected value of the attribute.
 * @param options - Optional settings for the verification action. Can be a JSON string or an object:
 *  - fieldType: [string] Type of element (e.g., "button", "input", "dropdown", etc.)
 * - actionTimeout: [number] Timeout in milliseconds to wait for page load. Default: Configured timeout.
 * - pattern: [string] Optional pattern to refine element search.
 * - partialMatch: [boolean] If true, allows substring match. Default: false (exact match).
 * - assert: [boolean] If false, logs the failure but does not throw. Default: true.
 * - screenshot: [boolean] Capture a screenshot. Default: true.
 * - screenshotText: [string] Description for the screenshot.
 * - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 * 
 * @example
 *  await web.verifyElementHasAttribute(page, "My Link", "href", "https://example.com", { fieldType: "link" });
 * 
 */
export async function verifyElementHasAttribute(
  page: Page,
  field: string | Locator,
  attribute: string,
  expectedValue: string,
  options?: string | Record<string, any>
) {
  const options_json = typeof options === "string" ? parseLooseJson(options) : options || {};
  const { fieldType = "", actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")), pattern, partialMatch = false, assert = true, screenshot = true, screenshotText = "", screenshotFullPage = true } = options_json;
  if (!page) throw new Error("Page not initialized");
  await waitForPageToLoad(page, actionTimeout);
  const target = typeof field === "string" ? await webLocResolver(fieldType, field, page, pattern, actionTimeout) : field;
  const count = await target.count();
  let found = false;
  for (let i = 0; i < count; i++) {
    const el = target.nth(i);
    if (await el.isVisible() && typeof field === 'string') {
      let text = await extractElementText(el);
      if ((partialMatch && text.includes(field)) || (!partialMatch && text === field)) {
        const attrVal = await el.getAttribute(attribute);
        if (attrVal === expectedValue) {
          found = true;
          break;
        }
      }
    }
  }
  if (found) {
    await attachLog(`✅ Element (type: "${fieldType}", field: "${field}") has attribute ${attribute}="${expectedValue}".`, "text/plain");
  } else {
    await attachLog(`❌ Element (type: "${fieldType}", field: "${field}") does not have attribute ${attribute}="${expectedValue}".`, "text/plain");
    if (assert !== false) throw new Error(`❌ Element (type: "${fieldType}", field: "${field}") does not have attribute ${attribute}="${expectedValue}".`);
  }
  await processScreenshot(page, screenshot, screenshotText, screenshotFullPage);
}

/**
 * Web: Verify element count -field: {param} -expectedCount: {param} -options: {param}
 *
 * Verifies that the count of specified elements on the page matches the expected count.
 * 
 *  @param page - Playwright Page instance.
 *  @param field - The label, text, id, name, or selector of the element to verify.
 *  @param expectedCount - The expected number of elements to be present.
 *  @param options - Optional settings for the verification action. Can be a JSON string or an object:
 *   - fieldType: [string] Type of element (e.g., "button", "input", "dropdown", etc.) 
 *   - actionTimeout: [number] Timeout in milliseconds to wait for page load. Default: Configured timeout.
 *   - pattern: [string] Optional pattern to refine element search.
 *   - partialMatch: [boolean] If true, allows substring match. Default: false (exact match).
 *   - assert: [boolean] If false, logs the failure but does not throw. Default: true.
 *   - screenshot: [boolean] Capture a screenshot. Default: true.
 *   - screenshotText: [string] Description for the screenshot.
 *   - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 * 
 * 
 * @example
 * await web.verifyElementCount(page, "Item", 5, { fieldType: "text" });
 * 
 * 
 */
export async function verifyElementCount(
  page: Page,
  field: string | Locator,
  expectedCount: number,
  options?: string | Record<string, any>
) {
  const options_json = typeof options === "string" ? parseLooseJson(options) : options || {};
  const { fieldType = "", actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")), pattern, partialMatch = false, assert = true, screenshot = true, screenshotText = "", screenshotFullPage = true } = options_json;
  if (!page) throw new Error("Page not initialized");
  await waitForPageToLoad(page, actionTimeout);
  const target = typeof field === "string" ? await webLocResolver(fieldType, field, page, pattern, actionTimeout) : field;
  const count = await target.count();
  let matchCount = 0;
  for (let i = 0; i < count; i++) {
    const el = target.nth(i);
    if (await el.isVisible() && typeof field === 'string') {
      let text = await extractElementText(el);
      if ((partialMatch && text.includes(field)) || (!partialMatch && text === field)) {
        matchCount++;
      }
    }
  }
  if (matchCount === expectedCount) {
    await attachLog(`✅ Element (type: "${fieldType}", field: "${field}") count matches expected: ${expectedCount}.`, "text/plain");
  } else {
    await attachLog(`❌ Element (type: "${fieldType}", field: "${field}") count ${matchCount} does not match expected: ${expectedCount}.`, "text/plain");
    if (assert !== false) throw new Error(`❌ Element (type: "${fieldType}", field: "${field}") count ${matchCount} does not match expected: ${expectedCount}.`);
  }
  await processScreenshot(page, screenshot, screenshotText, screenshotFullPage);
}

/**
 * 

/**
 * Web: Verify element order -field: {param} -expectedOrder: {param} -options: {param}
 *
 * Verifies that the order of elements of a specified type on the page matches the expected order.
 *
 * @param page - Playwright Page instance.
 * @param field - The locator, label, text, id, name, or selector of the elements to verify (string or Locator).
 * @param expectedOrder - An array of expected element texts in the correct order.
 * @param options - Optional settings for the verification action. Can be a JSON string or an object:
 *   - fieldType: [string] The type of elements to verify (e.g., "text", "button", "item", etc.).
 *   - actionTimeout: [number] Timeout in milliseconds to wait for page load. Default: Configured timeout.
 *   - pattern: [string] Optional pattern to refine element search.
 *   - partialMatch: [boolean] If true, allows substring match. Default: false (exact match).
 *   - assert: [boolean] If false, logs the failure but does not throw. Default: true.
 *   - screenshot: [boolean] Capture a screenshot. Default: true.
 *   - screenshotText: [string] Description for the screenshot.
 *   - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 *
 * @example
 * // Using a string field (label or logical type)
 * await web.verifyElementOrder(page, "Phase", ["Draft", "Review", "Approved"], { fieldType: "phase", partialMatch: false });
 *
 * // Using a Playwright Locator (e.g., all visible rows in a table)
 * const rows = page.locator('.my-table-row');
 * await web.verifyElementOrder(page, rows, ["Row 1", "Row 2", "Row 3"]);
 */
export async function verifyElementOrder(
  page: Page,
  field: string | Locator,
  expectedOrder: string[],
  options?: string | Record<string, any>
) {
  const options_json = typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    fieldType = "",
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    pattern,
    partialMatch = false,
    assert = true,
    screenshot = true,
    screenshotText = "",
    screenshotFullPage = true
  } = options_json;
  if (!page) throw new Error("Page not initialized");
  await waitForPageToLoad(page, actionTimeout);
  const target =
    typeof field === "string"
      ? await webLocResolver(fieldType, field, page, pattern, actionTimeout)
      : field;
  const count = await target.count();
  let actualOrder: string[] = [];
  for (let i = 0; i < count; i++) {
    const el = target.nth(i);
    if (await el.isVisible()) {
      let text = await extractElementText(el);
      actualOrder.push(text);
    }
  }
  let matches = true;
  if (partialMatch) {
    for (let i = 0; i < expectedOrder.length; i++) {
      if (!actualOrder[i]?.includes(expectedOrder[i])) {
        matches = false;
        break;
      }
    }
  } else {
    matches = JSON.stringify(actualOrder) === JSON.stringify(expectedOrder);
  }
  if (matches) {
    await attachLog(`✅ Element order matches expected.`, "text/plain");
  } else {
    await attachLog(`❌ Element order does not match expected. Actual: ${JSON.stringify(actualOrder)}, Expected: ${JSON.stringify(expectedOrder)}`, "text/plain");
    if (assert !== false) throw new Error(`❌ Element order does not match expected.`);
  }
  await processScreenshot(page, screenshot, screenshotText, screenshotFullPage);
}

/**
 * Web: Verify element is in viewport -field: {param} -options: {param}
 * 
 * Verifies that the specified element on the page is within the visible viewport.
 * 
 * @param page - Playwright Page instance.
 * @param field - The label, text, id, name, or selector of the element to verify.
 * @param options - Optional settings for the verification action. Can be a JSON string or an object:
 *  - fieldType: [string] Type of element (e.g., "button", "input", "dropdown", etc.)
 *  - actionTimeout: [number] Timeout in milliseconds to wait for page load. Default: Configured timeout.
 *  - pattern: [string] Optional pattern to refine element search.
 *  - partialMatch: [boolean] If true, allows substring match. Default: false (exact match).
 *  - assert: [boolean] If false, logs the failure but does not throw. Default: true.
 *  - screenshot: [boolean] Capture a screenshot. Default: true.
 *  - screenshotText: [string] Description for the screenshot.
 *  - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 * 
 * @example
 * await web.verifyElementInViewport(page, "Submit Button", { fieldType: "button" });
 * 
 * 
 */
export async function verifyElementInViewport(
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
) {
  const options_json = typeof options === "string" ? parseLooseJson(options) : options || {};
  const { fieldType = "", actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")), pattern, partialMatch = false, assert = true, screenshot = true, screenshotText = "", screenshotFullPage = true } = options_json;
  if (!page) throw new Error("Page not initialized");
  await waitForPageToLoad(page, actionTimeout);
  const target = typeof field === "string" ? await webLocResolver(fieldType, field, page, pattern, actionTimeout) : field;
  const count = await target.count();
  let inViewport = false;
  for (let i = 0; i < count; i++) {
    const el = target.nth(i);
    if (await el.isVisible() && typeof field === 'string') {
      let text = await extractElementText(el);
      if ((partialMatch && text.includes(field)) || (!partialMatch && text === field)) {
        inViewport = await el.evaluate((node: any) => {
          const rect = node.getBoundingClientRect();
          return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
          );
        });
        if (inViewport) break;
      }
    }
  }
  if (inViewport) {
    await attachLog(`✅ Element (type: "${fieldType}", field: "${field}") is in viewport.`, "text/plain");
  } else {
    await attachLog(`❌ Element (type: "${fieldType}", field: "${field}") is not in viewport.`, "text/plain");
    if (assert !== false) throw new Error(`❌ Element (type: "${fieldType}", field: "${field}") is not in viewport.`);
  }
  await processScreenshot(page, screenshot, screenshotText, screenshotFullPage);
}