/**
 * @file waitActions.ts
 *
 * Wait utilities for PlayQ web actions.
 * Provides time-based waits, page load settling, element visibility/state
 * waits, header/text waits, and URL waits with runner-aware step wrappers.
 *
 * Authors: PlayQ Team
 * Version: v1.0.0
 */
import * as allure from "allure-js-commons";
import { Page, Locator, expect } from "@playwright/test";
import { vars, comm } from "../../../global";
import { webLocResolver } from "../../fixtures/webLocFixture";
import { processScreenshot } from "./screenshotActions";
import { attachLog } from "../comm/commonActions";
import { parseLooseJson } from '../../bundle/vars';

function isPlaywrightRunner() { return process.env.TEST_RUNNER === 'playwright'; }
const __allureAny_wait: any = allure as any;
if (typeof __allureAny_wait.step !== 'function') { __allureAny_wait.step = async (_n: string, f: any) => await f(); }

/**
 * Comm: Wait-In-Milli-Seconds -seconds: {param}
 *
 * Pauses execution for the given number of milliseconds.
 * Delegates to `comm.waitInMilliSeconds`.
 *
 * @param ms Milliseconds to wait
 */
export async function wait(ms: number) {
  return comm.waitInMilliSeconds(ms);
}

/**
 * Web: Wait For Condition -timeout: {param}
 *
 * Polls a predicate until it returns true or times out.
 *
 * @param page Playwright Page instance
 * @param predicate Async function returning a boolean
 * @param options Optional JSON string or object ({ timeout, interval })
 */
export async function waitForCondition(page: Page, predicate: (page: Page) => Promise<boolean>, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : options || {};
  const { timeout = Number(vars.getConfigValue('testExecution.actionTimeout')) || 10000, interval = 250 } = options_json;
  const stepName = `Web: Wait For Condition -timeout: ${timeout}`;
  const start = Date.now();
  async function loop() {
    while (Date.now() - start < timeout) {
      if (await predicate(page)) return true;
      await comm.waitInMilliSeconds(interval);
    }
    throw new Error('Condition not met within timeout');
  }
  if (isPlaywrightRunner()) { await __allureAny_wait.step(stepName, loop); } else { await loop(); }
}

/**
 * Waits for the page to fully load by checking multiple browser states:
 * - `domcontentloaded`: Ensures DOM is parsed and ready.
 * - `load`: Waits for all resources like images and scripts to load.
 * - `requestIdleCallback`: Ensures the browser is idle before proceeding.
 *
 * This function is useful after navigation, form submission, or any page transition
 * to ensure stable element interaction.
 *
 * @param page - The Playwright Page instance.
 * @param actionTimeout - Optional timeout (in ms) to wait for each load state. Default: 10000.
 *
 */
export async function waitForPageToLoad(
  page: Page,
  actionTimeout: number = 10000
): Promise<void> {
  const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

  console.log("⏳ Waiting for DOMContentLoaded...");
  try {
    await page.waitForLoadState("domcontentloaded", { timeout: actionTimeout });
    console.log("✅ DOMContentLoaded");
  } catch {
    console.warn("⚠️ DOMContentLoaded not detected within timeout");
  }

  console.log("🔄 Waiting for load event...");
  try {
    await page.waitForLoadState("load", { timeout: actionTimeout });
    console.log("✅ Load event");
  } catch {
    console.warn("⚠️ Page load event not triggered within timeout");
  }

  console.log("🕓 Waiting for browser idle callback...");
  try {
    await page.evaluate(() => {
      return new Promise((resolve) => {
        window.requestIdleCallback(() => resolve(true));
      });
    });
    console.log("✅ requestIdleCallback done");
  } catch {
    console.warn("⚠️ requestIdleCallback failed or delayed");
  }
}

/**
 * Waits for a given locator (element) to become enabled within the specified timeout.
 * Useful before interacting with inputs, buttons, or other dynamic UI elements.
 *
 * @param locator - The Playwright Locator to wait for (e.g., input field, button).
 * @param actionTimeout - Optional timeout (in ms). Default: 5000.
 *
 * @throws Error if the locator does not become enabled within the timeout.
 *
 */
export async function waitForEnabled(
  locator: Locator,
  actionTimeout: number = 5000
): Promise<void> {
  await expect(locator).toBeEnabled({ timeout: actionTimeout });
}

/**
 * Web: Wait for displayed -field: {param} -options: {param}
 *
 * Waits for an element to become visible on the page.
 *
 * @param page - Playwright Page instance
 * @param field - The label, id, name, or selector of the element to wait for
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Optional timeout in milliseconds. Default: Configured timeout.
 *   - pattern: [string] Optional pattern to refine element search.
 *   - fieldType: [string] Type of field (e.g., input, button, etc.)
 *   - screenshot: [boolean] Capture screenshot after waiting. Default: false.
 *   - screenshotText: [string] Description for screenshot.
 *   - screenshotFullPage: [boolean] Full page screenshot. Default: true.
 */
export async function waitForDisplayed(page: Page, field: string | Locator, options?: string | Record<string, any>) {
  const options_json = typeof options === "string" ? vars.parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")) || 30000,
    pattern,
    fieldType,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true
  } = options_json;

  const stepName = `Web: Wait for displayed -field: ${String(field)} -options: ${JSON.stringify(options_json)}`;
  async function run() {
    if (!page) throw new Error("Page not initialized");
    const target = typeof field === "string" ? await webLocResolver(fieldType, field, page, pattern, actionTimeout) : field;
    try {
      await (target as Locator).waitFor({ state: "visible", timeout: actionTimeout });
      await attachLog(`✅ Element "${String(field)}" is now visible`, "text/plain", "Log");
    } catch {
      throw new Error(`❌ Element "${String(field)}" did not become visible within ${actionTimeout}ms`);
    }
    await processScreenshot(page, screenshot, screenshotText || `Waited for element to be displayed: ${String(field)}`, screenshotFullPage);
  }
  if (isPlaywrightRunner()) { await __allureAny_wait.step(stepName, run); } else { await run(); }
}

/**
 * Web: Wait for disappear -field: {param} -options: {param}
 *
 * Waits for an element to disappear (become hidden or removed) from the page.
 *
 * @param page - Playwright Page instance
 * @param field - The label, id, name, or selector of the element to wait for
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Optional timeout in milliseconds. Default: Configured timeout.
 *   - pattern: [string] Optional pattern to refine element search.
 *   - fieldType: [string] Type of field (e.g., input, button, etc.)
 *   - screenshot: [boolean] Capture screenshot after waiting. Default: false.
 *   - screenshotText: [string] Description for screenshot.
 *   - screenshotFullPage: [boolean] Full page screenshot. Default: true.
 */
export async function waitForDisappear(page: Page, field: string | Locator, options?: string | Record<string, any>) {
  const options_json = typeof options === "string" ? vars.parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")) || 30000,
    pattern,
    fieldType,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true
  } = options_json;
  const stepName = `Web: Wait for disappear -field: ${String(field)} -options: ${JSON.stringify(options_json)}`;
  async function run() {
    if (!page) throw new Error("Page not initialized");
    const target = typeof field === "string" ? await webLocResolver(fieldType, field, page, pattern, actionTimeout) : field;
    try {
      await (target as Locator).waitFor({ state: "hidden", timeout: actionTimeout });
      await attachLog(`✅ Element "${String(field)}" has disappeared`, "text/plain", "Log");
    } catch {
      throw new Error(`❌ Element "${String(field)}" did not disappear within ${actionTimeout}ms`);
    }
    await processScreenshot(page, screenshot, screenshotText || `Waited for element to disappear: ${String(field)}`, screenshotFullPage);
  }
  if (isPlaywrightRunner()) { await __allureAny_wait.step(stepName, run); } else { await run(); }
}


/**
 * Web: Wait for Text at Location -field: {param} -text: {param} -options: {param}
 *
 * Waits until the specified text appears at the given field/locator.
 *
 * @param page - Playwright Page instance
 * @param field - The selector or Locator where the text should appear
 * @param expectedText - The text to wait for
 * @param options - Optional string or object:
 *   - actionTimeout: [number] Timeout in ms (default: 30000)
 *   - partialMatch: [boolean] If true, waits for substring match (default: false)
 *   - caseSensitive: [boolean] If true, match is case-sensitive (default: true)
 *   - screenshot: [boolean] Capture screenshot after waiting (default: false)
 *   - screenshotText: [string] Description for screenshot
 *   - screenshotFullPage: [boolean] Full page screenshot (default: true)
 *
 * @example
 *   await waitForTextAtLocation(page, 'h1', 'Welcome', { actionTimeout: 10000, partialMatch: true });
 */
export async function waitForTextAtLocation(
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
    ignoreCase = true,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
    pattern,
  } = options_json;

  if (!page) throw new Error("Page not initialized");

  if (isPlaywrightRunner()) {
    await __allureAny_wait.step(
      `Web: Wait for Text at Location -field: ${field} -text: ${expectedText} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doWaitForTextAtLocation();
      }
    );
  } else {
    await doWaitForTextAtLocation();
  }

  async function doWaitForTextAtLocation() {
    const target =
      typeof field === "string"
        ? await webLocResolver("text", field, page, pattern, actionTimeout)
        : field;

    const start = Date.now();
    let found = false;
    let lastActual = "";

    while (Date.now() - start < actionTimeout) {
      const actualText = ((await target.innerText()) || "").trim();
      lastActual = actualText;
      let expected = expectedText;
      let actual = actualText;
      if (!ignoreCase) {
        expected = expected.toLowerCase();
        actual = actual.toLowerCase();
      }
      if (partialMatch ? actual.includes(expected) : actual === expected) {
        found = true;
        break;
      }
      await new Promise((res) => setTimeout(res, 300));
    }

    if (!found) {
      const msg = `❌ Text "${expectedText}" did not appear at location "${field}" within ${actionTimeout}ms. Last actual: "${lastActual}"`;
      await attachLog(msg, "text/plain");
      throw new Error(msg);
    } else {
      await attachLog(
        `✅ Text "${expectedText}" appeared at location "${field}"`,
        "text/plain"
      );
    }

    await processScreenshot(
      page,
      screenshot,
      screenshotText || `Waited for text at location: ${expectedText}`,
      screenshotFullPage
    );
  }
}

/**
 * Web: Wait for Text to Disappear at Location -field: {param} -text: {param} -options: {param}
 *
 * Waits until the specified text disappears from the given field/locator.
 *
 * @param page - Playwright Page instance
 * @param field - The selector or Locator where the text should disappear
 * @param textToDisappear - The text to wait for disappearance
 * @param options - Optional string or object:
 *   - actionTimeout: [number] Timeout in ms (default: 30000)
 *   - partialMatch: [boolean] If true, waits for substring match (default: false)
 *   - ignoreCase: [boolean] If true, match is case-insensitive (default: true)
 *   - screenshot: [boolean] Capture screenshot after waiting (default: false)
 *   - screenshotText: [string] Description for screenshot
 *   - screenshotFullPage: [boolean] Full page screenshot (default: true)
 */
export async function waitForTextToDisappearAtLocation(
  page: Page,
  field: string | Locator,
  textToDisappear: string,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};

  const {
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")) || 30000,
    partialMatch = true,
    ignoreCase = true,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;

  if (!page) throw new Error("Page not initialized");

  let locator: Locator;

  if (typeof field === "string") {
    // ✅ Build regex safely
    const escapedText = textToDisappear.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const pattern = partialMatch
      ? `.*${escapedText}.*`
      : `^${escapedText}$`;

    const regex = new RegExp(pattern, ignoreCase ? "i" : undefined);

    locator = page.getByText(regex);
  } else {
    locator = field;
  }

  await locator.waitFor({
    state: "hidden",
    timeout: actionTimeout,
  });

  await attachLog(
    `✅ Text "${textToDisappear}" disappeared (partialMatch=${partialMatch}, ignoreCase=${ignoreCase})`,
    "text/plain"
  );

  await processScreenshot(
    page,
    screenshot,
    screenshotText || `Waited for text to disappear: ${textToDisappear}`,
    screenshotFullPage
  );
}

/**
 * Web: Wait for Selector -field: {param} -options: {param}
 *
 * Waits for a selector or locator to reach a specific state.
 *
 * @param page - Playwright Page instance
 * @param field - The selector string or Locator to wait for
 * @param options - Optional string or object:
 *   - fieldType: [string] Type of field (e.g., 'button', 'input') for pattern resolution
 *   - state: [string] 'attached' | 'detached' | 'visible' | 'hidden' (default: 'visible')
 *   - actionTimeout: [number] Timeout in ms (default: 30000)
 *   - pattern: [string] Optional pattern for locator resolution
 *   - screenshot: [boolean] Capture screenshot after waiting (default: false)
 *   - screenshotText: [string] Description for screenshot
 *   - screenshotFullPage: [boolean] Full page screenshot (default: true)
 *
 * @example
 *   await waitForSelector(page, 'img[alt="~"]', { state: 'hidden', actionTimeout: 10000 });
 */
export async function waitForSelector(
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    fieldType,
    state = "visible",
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")) || 30000,
    pattern,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;

  if (!page) throw new Error("Page not initialized");

  if (isPlaywrightRunner()) {
    await __allureAny_wait.step(
      `Web: Wait for Selector -field: ${field} -state: ${state} -options: ${JSON.stringify(options_json)}`,
      async () => {
        await doWaitForSelector();
      }
    );
  } else {
    await doWaitForSelector();
  }

  async function doWaitForSelector() {
    if (typeof field === "string" && !fieldType) {
      throw new Error(
        `fieldType is required for string selectors. Received field="${field}"`
      );
    }

    let target: Locator;

    if (typeof field === "string") {
      if (state === "hidden" || state === "detached") {
        if (fieldType === "text") {
          target = page.getByText(field, { exact: false });
        } else {
          target = page.locator(`//*[normalize-space()='${field}']`);
        }
      } else {
        target = await webLocResolver(
          fieldType,
          field,
          page,
          pattern,
          actionTimeout
        );
      }
    } else {
      target = field;
    }

    await target.waitFor({ state, timeout: actionTimeout });

    await attachLog(
      `✅ Selector "${field}" reached state "${state}".`,
      "text/plain"
    );

    await processScreenshot(
      page,
      screenshot,
      screenshotText || `Waited for selector: ${field} state: ${state}`,
      screenshotFullPage
    );
  }


}

/**
 * Web: Wait for Header -header: {param} -text: {param} -options: {param}
 *
 * Waits until a specific header element contains the expected text.
 * The header parameter should be a locator or will use pattern resolution.
 *
 * @param page - Playwright Page instance
 * @param header - The locator of the header element (e.g., "h1", "xpath=//h1[@class='title']", or Locator object)
 * @param headerText - The expected header text to wait for (e.g., "Welcome", "Dashboard")
 * @param options - Optional string or object:
 *   - actionTimeout: [number] Timeout in ms (default: 30000)
 *   - partialMatch: [boolean] If true, waits for substring match (default: false)
 *   - ignoreCase: [boolean] If true, case-insensitive match (default: true)
 *   - pattern: [string] Optional pattern to refine element search
 *   - screenshot: [boolean] Capture screenshot after waiting (default: false)
 *   - screenshotText: [string] Description for screenshot
 *   - screenshotFullPage: [boolean] Full page screenshot (default: true)
 *
 * @example
 *   await waitForHeader(page, 'h1', 'Welcome Back!', { 
 *     partialMatch: true, 
 *     screenshot: true 
 *   });
 */
export async function waitForHeader(
  page: Page,
  header: string | Locator,
  headerText: string,
  options?: string | Record<string, any>
) {
  const resolvedHeaderText = vars.replaceVariables(headerText);
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};

  const {
    actionTimeout = Number(
      vars.getConfigValue("testExecution.actionTimeout")
    ) || 30000,
    partialMatch = false,
    ignoreCase = true,
    pattern,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;

  if (!page) throw new Error("Page not initialized");

  if (isPlaywrightRunner()) {
    await __allureAny_wait.step(
      `Web: Wait for Header -header: ${header} -text: ${resolvedHeaderText} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doWaitForHeader();
      }
    );
  } else {
    await doWaitForHeader();
  }

  async function doWaitForHeader() {
    // Use webLocResolver for header locator resolution or direct Locator
    const target =
      typeof header === "string"
        ? await webLocResolver(
          "header",
          header,
          page,
          pattern,
          actionTimeout
        )
        : header;

    const start = Date.now();
    let found = false;
    let lastActualText = "";

    while (Date.now() - start < actionTimeout) {
      try {
        // Check if header is visible and get its text
        if (await target.isVisible()) {
          const actualText = (await target.innerText()).trim();
          lastActualText = actualText;

          let expected = resolvedHeaderText;
          let actual = actualText;

          // Apply case sensitivity
          if (ignoreCase) {
            expected = expected.toLowerCase();
            actual = actual.toLowerCase();
          }

          // Check for match
          const isMatch = partialMatch
            ? actual.includes(expected)
            : actual === expected;

          if (isMatch) {
            found = true;
            await attachLog(
              `✅ Header found: "${actualText}" matches expected "${resolvedHeaderText}"`,
              "text/plain"
            );
            break;
          }
        }

        // Wait before next check
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        // Continue waiting if there's an error
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    if (!found) {
      const msg = `❌ Header text "${resolvedHeaderText}" did not appear at locator "${header}" within ${actionTimeout}ms. Last seen: "${lastActualText}"`;
      await attachLog(msg, "text/plain");
      throw new Error(msg);
    }

    await processScreenshot(
      page,
      screenshot,
      screenshotText || `Waited for header: ${resolvedHeaderText}`,
      screenshotFullPage
    );
  }
}

/**
 * Web: Wait for Input -field: {param} -state: {param} (enabled or disabled) -options: {param}
 *
 * Waits for an input field to become 'enabled' or 'disabled'.
 *
 * @param page - Playwright Page instance
 * @param field - Locator or label of the input field
 * @param state - Desired state: 'enabled' or 'disabled'
 * @param options - Optional string or object:
 *   - actionTimeout: [number] Optional timeout in milliseconds for waiting. Default: from [config] or 30000.
 *   - pattern: [string] Optional pattern to refine element search.
 *   - screenshot: [boolean] Capture a screenshot. Default: true.
 *   - screenshotText: [string] Description for the screenshot.
 *   - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 *   - smartIQ_refreshLoc: optional override for locator refresh key
 */
export async function waitForInputState(
  page: Page,
  field: string | Locator,
  state: "enabled" | "disabled",
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};

  const {
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    pattern,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
    smartIQ_refreshLoc = "",
  } = options_json;

  if (isPlaywrightRunner()) {
    await __allureAny_wait.step(
      `Web: Wait for Input -field: ${field} -state: ${state} (enabled or disabled) -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doWaitForInputState();
      }
    );
  } else {
    await doWaitForInputState();
  }

  async function doWaitForInputState() {
    if (!page) throw new Error("Page not initialized");

    const target =
      typeof field === "string"
        ? await webLocResolver(
          "input",
          field,
          page,
          pattern,
          actionTimeout,
          smartIQ_refreshLoc
        )
        : field;

    try {
      if (state === "enabled") {
        await expect(target).toBeEnabled({ timeout: actionTimeout });
      } else if (state === "disabled") {
        await expect(target).toBeDisabled({ timeout: actionTimeout });
      } else {
        throw new Error(
          `Invalid state "${state}". Use "enabled" or "disabled".`
        );
      }
    } catch (e) {
      throw new Error(
        `❌ Input "${field}" did not reach state "${state}" within ${actionTimeout}ms. ${e}`
      );
    }

    await processScreenshot(
      page,
      screenshot,
      screenshotText || `Waited for input state: ${state}`,
      screenshotFullPage
    );
  }
}

/**
 * Web: Wait for URL -url: {param} -options: {param}
 *
 * Waits until the current page URL matches or contains the specified string or regex.
 *
 * @param url - The expected URL or substring/regex to match (e.g., "/dashboard", "https://example.com/page").
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Timeout in ms to wait for URL. Default: 30000.
 *   - match: [string] "exact" | "contains" . Default: "contains".
 *   - assert: [boolean] If false, logs the failure but does not throw. Default: true.
 *   - screenshot: [boolean] If true, captures screenshot. Default: false.
 *   - screenshotText: [string] Custom screenshot label.
 *   - screenshotFullPage: [boolean] Full page screenshot. Default: true.
 */
export async function waitForUrl(
  page: Page,
  url: string,
  options?: string | Record<string, any>
): Promise<void> {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    match = "contains",
    screenshot = false,
    screenshotText,
    screenshotFullPage = true,
  } = options_json;

  if (isPlaywrightRunner()) {
    await __allureAny_wait.step(
      `Web: Wait for URL -url: ${url} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doWaitForUrl();
      }
    );
  } else {
    await doWaitForUrl();
  }

  async function doWaitForUrl() {
    try {
      if (match === "exact") {
        await page.waitForURL(url.toString(), { timeout: actionTimeout });
      } else if (match === "contains") {
        const cleanUrl = url.replace(/^\/|\/$/g, "");
        const regexUrl = new RegExp(escapeRegExp(cleanUrl), "i");
        await expect(page).toHaveURL(regexUrl, { timeout: actionTimeout });
      }
    } catch (error) {
      throw new Error(`⚠️ waitForUrl failed: ${error.message}`);
    }
    await waitForPageToLoad(page);
    await processScreenshot(
      page,
      screenshot,
      screenshotText || "",
      screenshotFullPage
    );
  }
}


function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
