/**
 * @file webActions.ts
 *
 * Provides a unified API for web actions in Playwright and Cucumber frameworks.
 * Supports navigation, interaction, and verification across both runners.
 *
 * Key Features:
 * - Supports hybrid context: Playwright Runner (`page`) and Cucumber World (`webFixture`).
 * - Rich options for screenshots, timeouts, locators, and assertions.
 * - Enterprise-ready design with robust error handling, logging, and extensibility.
 *
 * Authors: Renish Kozhithottathil [Lead Automation Principal, NCS]
 * Date: 2025-05-20
 * Version: v1.0.0
 *
 * Note: This file adheres to the PlayQ Enterprise Automation Standards.
 */

import { vars, webLocResolver, webFixture, logFixture } from "@src/global";
import {
  Page,
  Locator,
  expect,
  test as playwrightTest,
} from "@playwright/test";
import { warn } from "winston";
import { isCucumberRunner, isPlaywrightRunner } from "@config/runner";
import * as allure from "allure-js-commons";
import { waitInMilliSeconds } from "./commActions";
import { parseLooseJson } from '../bundle/vars';
const isSmartAIEnabled =
  String(vars.getConfigValue("smartAI.enable")).toLowerCase().trim() === "true";
const isPatternEnabled =
  String(vars.getConfigValue("patternIQ.enable")).toLowerCase().trim() ===
  "true";

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
async function waitForEnabled(
  locator: Locator,
  actionTimeout: number = 5000
): Promise<void> {
  await expect(locator).toBeEnabled({ timeout: actionTimeout });
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
    actionTimeout = Number(
      vars.getConfigValue("testExecution.actionTimeout")
    ) || 10000,
    partialMatch = false,
    ignoreCase = true,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
    pattern,
  } = options_json;

  if (!page) throw new Error("Page not initialized");

  if (isPlaywrightRunner()) {
    await allure.step(
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
    await allure.step(
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
 * Attach log or message to the test context (Cucumber or Playwright runner).
 * @param message The message or buffer to attach
 * @param mimeType The mime type (default: text/plain)
 */
export async function attachLog(
  message: string | Buffer,
  mimeType: string = "text/plain"
) {
  if (isCucumberRunner()) {
    const world = webFixture.getWorld();
    if (world?.attach) {
      await world.attach(message, mimeType);
    } else {
      console.warn("⚠️ No World.attach() available in Cucumber context");
    }
  } else if (isPlaywrightRunner()) {
    await playwrightTest
      .info()
      .attach("Log", { body: message, contentType: mimeType });
  } else {
    console.warn("⚠️ attachLog: Unknown runner type");
  }
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
    await allure.step(
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
    await page.goto(resolvedUrl, { waitUntil: "domcontentloaded",timeout:10000});
    await processScreenshot(
      page,
      screenshot,
      screenshotText,
      screenshotFullPage
    );
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
    await allure.step(
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
 * Web: Fill -field: {param} -value: {param} -options: {param}
 *
 * Fills a form input field (e.g., text box, textarea) with the specified value.
 *
 * @param field - The label, placeholder, id, name, or pattern of the input field (e.g., "Username", "Email", "search").
 * @param value - The text value to fill in the input field (e.g., "JohnDoe", "test@example.com").
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Timeout in ms (default: 30000)
 *   - pattern: [string] Optional pattern to refine element search. Default: Configured pattern.
 *   - screenshot: [boolean] Capture a screenshot after filling the input. Default: false.
 *   - screenshotText: [string] Text description for the screenshot. Default: "".
 *   - screenshotFullPage: [boolean] Capture a full page screenshot. Default: true.
 *   - screenshotField: [boolean] Capture screenshot of the field (input element) only. Overrides fullPage. Default: false.
 *
 * @example
 *  Web: Fill -field: "Username" -value: "JohnDoe" -options: "{screenshot: true, screenshotText: 'After filling Username', screenshotField: true}"
 */
export async function fill(
  page: Page,
  field: string | Locator,
  value: string | number,
  options?: string | Record<string, any>
) {
  let resolvedvalue = vars.replaceVariables(value.toString());
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  if (!page) throw new Error("Page not initialized");
  const {
    iframe = "",
    actionTimeout = Number(
      vars.getConfigValue("testExecution.actionTimeout")
    ) || 30000, // Default timeout
    pattern,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
    screenshotField = false,
    smartIQ_refreshLoc = "",
  } = options_json || {};

  if (isPlaywrightRunner()) {
    await allure.step(
      `Web: Fill -field: ${field} -value: ${value} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doFill();
      }
    );
  } else {
    await doFill();
  }
  async function doFill() {
    const target =
      typeof field === "string"
        ? await webLocResolver(
            "input",
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
      await page
        .frameLocator(iframe)
        .locator(target)
        .fill(resolvedvalue, { timeout: actionTimeout });
    } else {
      await waitForEnabled(target, actionTimeout);
      await target.fill(resolvedvalue, { timeout: actionTimeout });
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
// Alias for Fill
export const type = fill;
export const input = fill;
export const set = fill;
export const enter = fill;

// =================================== CLICK STEPS ===================================

/**
 * Web: Click Button -field: {param} -options: {param}
 *
 * Clicks a button element on the page, identified by text, label, id, name, pattern, or locator.
 *
 * @param field - The label, text, id, name, or selector of the button to click (e.g., "Submit", "Save", "Cancel").
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Optional timeout in milliseconds for waiting. Default: Configured testExecution > actionTimeout or 10000 milliseconds.
 *   - pattern: [string] Optional pattern to refine element search. Default: Configured pattern.
 *   - screenshot: [boolean] Capture a screenshot after clicking the button. Default: false.
 *   - screenshotText: [string] Text description for the screenshot. Default: "".
 *   - screenshotFullPage: [boolean] Capture a full page screenshot. Default: true.
 *   - screenshotBefore: [boolean] Capture a screenshot before clicking. Default: false.
 *
 * @example
 *  Web: Click Button -field: "Register" -options: "{screenshot: true, screenshotText: 'After clicking Register'}"
 */
export async function clickButton(
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(
      vars.getConfigValue("testExecution.actionTimeout") || 10000
    ),
    pattern,
    isDoubleClick = false,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
    screenshotBefore = false,
  } = options_json || {};

  if (isPlaywrightRunner()) {
    await allure.step(
      `Web: Click Button -field: ${field} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doClickButton();
      }
    );
  } else {
    await doClickButton();
  }
  async function doClickButton() {
    if (!page) throw new Error("Page not initialized");
    const target =
      typeof field === "string"
        ? await webLocResolver(
            "button",
            field,
            page,
            pattern,
            actionTimeout,
            "after"
          )
        : field;
    await processScreenshot(
      page,
      screenshotBefore,
      screenshotText,
      screenshotFullPage
    );
    await target.click();
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
 * Web: Click Link -field: {param} -options: {param}
 *
 * Clicks a link element on the page, identified by link text, label, id, name, or pattern.
 *
 * @param field - The text, label, id, name, or selector of the link to click (e.g., "Home", "Login", "Forgot Password").
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Optional timeout in milliseconds for waiting. Default: Configured timeout.
 *   - pattern: [string] Optional pattern to refine element search. Default: Configured pattern.
 *   - screenshot: [boolean] Capture a screenshot after clicking the link. Default: false.
 *   - screenshotText: [string] Text description for the screenshot. Default: "".
 *   - screenshotFullPage: [boolean] Capture a full page screenshot. Default: true.
 *   - screenshotBefore: [boolean] Capture a screenshot before clicking. Default: false.
 *
 * @example
 *  Web: Click Link -field: "Register" -options: "{screenshot: true, screenshotText: 'After clicking Register'}"
 */
export async function clickLink(
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(
      vars.getConfigValue("testExecution.actionTimeout") || 10000
    ), // Default timeout
    pattern,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
    screenshotBefore = false,
  } = options_json || {};

  if (isPlaywrightRunner()) {
    await allure.step(
      `Web: Click Link -field: ${field} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doClickLink();
      }
    );
  } else {
    await doClickLink();
  }

  async function doClickLink() {
    if (!page) throw new Error("Page not initialized");
    await waitForPageToLoad(page, actionTimeout);
    const target =
      typeof field === "string"
        ? await webLocResolver("link", field, page, pattern, actionTimeout)
        : field;
    await processScreenshot(
      page,
      screenshotBefore,
      screenshotText,
      screenshotFullPage
    );
    await target.click({ timeout: actionTimeout });

    await processScreenshot(
      page,
      screenshot,
      screenshotText,
      screenshotFullPage
    );
  }
}

/**
 * Web: Click tab -field: {param} -options: {param}
 *
 * Clicks a tab element on the page, identified by link text, label, id, name, or pattern.
 *
 * @param field - The text, label, id, name, or selector of the link to click (e.g., "Home", "Login", "Forgot Password").
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Optional timeout in milliseconds for waiting. Default: Configured timeout.
 *   - pattern: [string] Optional pattern to refine element search. Default: Configured pattern.
 *   - screenshot: [boolean] Capture a screenshot after clicking the link. Default: false.
 *   - screenshotText: [string] Text description for the screenshot. Default: "".
 *   - screenshotFullPage: [boolean] Capture a full page screenshot. Default: true.
 *   - screenshotBefore: [boolean] Capture a screenshot before clicking. Default: false.
 *
 * @example
 *  Web: Click tab -field: "Register" -options: "{screenshot: true, screenshotText: 'After clicking Register'}"
 */
export async function clickTab(
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(
      vars.getConfigValue("testExecution.actionTimeout") || 10000
    ), // Default timeout
    pattern,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
    screenshotBefore = false,
  } = options_json || {};

  if (isPlaywrightRunner()) {
    await allure.step(
      `Web: Click Link -field: ${field} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doClickTab();
      }
    );
  } else {
    await doClickTab();
  }

  async function doClickTab() {
    if (!page) throw new Error("Page not initialized");
    await waitForPageToLoad(page, actionTimeout);
    const target =
      typeof field === "string"
        ? await webLocResolver("tab", field, page, pattern, actionTimeout)
        : field;
    await processScreenshot(
      page,
      screenshotBefore,
      screenshotText,
      screenshotFullPage
    );
    await target.click({ timeout: actionTimeout });

    await processScreenshot(
      page,
      screenshot,
      screenshotText,
      screenshotFullPage
    );
  }
}

/**
 * Web: Click radio button -field: {param} -options: {param}
 *
 * Selects a radio button element on the page, identified by label, text, id, name, or pattern.
 *
 * @param field - The label, text, id, name, or selector of the radio button to select (e.g., "Yes", "No", "Subscribe").
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Optional timeout in milliseconds for waiting. Default: Configured timeout.
 *   - pattern: [string] Optional pattern to refine element search. Default: Configured pattern.
 *   - force: [boolean] Force the action (e.g., ignore actionability checks). Default: true.
 *   - screenshot: [boolean] Capture a screenshot after selecting the radio button. Default: false.
 *   - screenshotText: [string] Text description for the screenshot. Default: "".
 *   - screenshotFullPage: [boolean] Capture a full page screenshot. Default: true.
 *   - screenshotBefore: [boolean] Capture a screenshot before selecting the radio button. Default: false.
 *
 * @example
 *  Web: Click radio button -field: "{radio_group:: Newsletter} Yes" -options: "{screenshot: true, screenshotText: 'After selecting Yes for Newsletter'}"
 */
export async function clickRadioButton(
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(
      vars.getConfigValue("testExecution.actionTimeout")
    ) || 30000, // Default timeout
    pattern,
    force = true, // Playwright's force option
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
    screenshotBefore = false,
    smartIQ_refreshLoc = "",
  } = options_json || {};
  if (isPlaywrightRunner()) {
    await allure.step(
      `Web: Click radio button -field: ${field} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doClickRadioButton();
      }
    );
  } else {
    await doClickRadioButton();
  }
  async function doClickRadioButton() {
    if (!page) throw new Error("Page not initialized");

    const target =
      typeof field === "string"
        ? await webLocResolver(
            "radio",
            field,
            page,
            pattern,
            smartIQ_refreshLoc
          )
        : field;

    await processScreenshot(
      page,
      screenshotBefore,
      screenshotText,
      screenshotFullPage
    );
    await target.check({ force, timeout: actionTimeout }); // Playwright's API for selecting radio buttons
    await processScreenshot(
      page,
      screenshot,
      screenshotText,
      screenshotFullPage
    );
  }
}

/**
 * Web: Click radio button -field: {param} -options: {param}
 *
 * Selects a radio button element on the page, identified by label, text, id, name, or pattern.
 *
 * @param field - The label, text, id, name, or selector of the radio button to select (e.g., "Yes", "No", "Subscribe").
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Optional timeout in milliseconds for waiting. Default: Configured timeout.
 *   - pattern: [string] Optional pattern to refine element search. Default: Configured pattern.
 *   - force: [boolean] Force the action (e.g., ignore actionability checks). Default: true.
 *   - screenshot: [boolean] Capture a screenshot after selecting the radio button. Default: false.
 *   - screenshotText: [string] Text description for the screenshot. Default: "".
 *   - screenshotFullPage: [boolean] Capture a full page screenshot. Default: true.
 *   - screenshotBefore: [boolean] Capture a screenshot before selecting the radio button. Default: false.
 *
 * @example
 *  Web: Click radio button -field: "{radio_group:: Newsletter} Yes" -options: "{screenshot: true, screenshotText: 'After selecting Yes for Newsletter'}"
 */
export async function clickCheckbox(
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(
      vars.getConfigValue("testExecution.actionTimeout")
    ) || 30000, // Default timeout
    pattern,
    force = true, // Playwright's force option
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
    screenshotBefore = false,
    smartIQ_refreshLoc = "",
  } = options_json || {};

  if (isPlaywrightRunner()) {
    await allure.step(
      `Web: Click radio button -field: ${field} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doClickCheckbox();
      }
    );
  } else {
    await doClickCheckbox();
  }

  async function doClickCheckbox() {
    if (!page) throw new Error("Page not initialized");

    const target =
      typeof field === "string"
        ? await webLocResolver(
            "checkbox",
            field,
            page,
            pattern,
            smartIQ_refreshLoc
          )
        : field;

    await processScreenshot(
      page,
      screenshotBefore,
      screenshotText,
      screenshotFullPage
    );
    await target.check({ force, timeout: actionTimeout }); // Playwright's API for selecting radio buttons
    await processScreenshot(
      page,
      screenshot,
      screenshotText,
      screenshotFullPage
    );
  }
}

// =================================== SELECT STEPS ===================================

/**
 * Web: Select Dropdown -field: {param} -value: {param} -options: {param}
 *
 * Selects a dropdown option by visible text or value.
 * Works with both native <select> elements and custom dropdowns.
 *
 * @param page - Playwright Page instance
 * @param field - Locator or label of the dropdown
 * @param value - Value or label of the option to select
 * @param options - Optional string or object containing:
 *   - actionTimeout: custom timeout
 *   - pattern: extra pattern string for locator resolution
 *   - screenshot: boolean (default false)
 *   - screenshotText: text for screenshot description
 *   - screenshotFullPage: boolean (default true)
 *   - smartIQ_refreshLoc: optional override for locator refresh key
 */
export async function selectDropdown(
  page: Page,
  field: string | Locator,
  value: string | number,
  options?: string | Record<string, any>
) {
  const resolvedValue =
    value !== undefined && value !== null
      ? vars.replaceVariables(value.toString())
      : "";
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};

  const {
    actionTimeout,
    pattern,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
    smartIQ_refreshLoc = "",
  } = options_json;

  if (isPlaywrightRunner()) {
    await allure.step(
      `Web: Select Dropdown -field: ${field} -value: ${resolvedValue} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doSelectDropdown();
      }
    );
  } else {
    await doSelectDropdown();
  }
  async function doSelectDropdown() {
    if (!page) throw new Error("Page not initialized");

    // Resolve dropdown element
    const target =
      typeof field === "string"
        ? await webLocResolver(
            "dropdown",
            field,
            page,
            pattern,
            actionTimeout,
            smartIQ_refreshLoc
          )
        : field;

    // Determine tag
    const tag = await target.evaluate((el) => el.tagName.toLowerCase());

    try {
      if (tag === "select") {
        // Native select dropdown
        await target.selectOption({ label: resolvedValue }).catch(async () => {
          await target.selectOption({ value: resolvedValue });
        });
      } else {
        await waitInMilliSeconds(2000);
        // Custom dropdown: aria-haspopup or role-based
        await target.click();

        const dropdownOptions = page.locator(
          `role=option >> text="${resolvedValue}"`
        );
        const visibleOption = dropdownOptions.first();

        if (await visibleOption.isVisible()) {
          await visibleOption.click();
        } else {
          // Fallback to plain text match
          await page.locator(`text="${resolvedValue}"`).first().click();
        }
      }
    } catch (e) {
      throw new Error(
        `❌ Failed to select "${resolvedValue}" from dropdown: ${e}`
      );
    }

    await processScreenshot(
      page,
      screenshot,
      screenshotText || `Select: ${resolvedValue}`,
      screenshotFullPage
    );
  }
}

/**
 * Web: Mouseover on link -field: {param} -options: {param}
 *
 * Performs a mouse hover over a link element on the page, identified by text, label, id, name, or pattern.
 *
 * @param field - The text, label, id, name, or selector of the link to hover over (e.g., "Account", "Login", "Help").
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Optional timeout in milliseconds for waiting. Default: Configured timeout.
 *   - pattern: [string] Optional pattern to refine element search. Default: Configured pattern.
 *   - screenshot: [boolean] Capture a screenshot after hovering over the link. Default: false.
 *   - screenshotText: [string] Text description for the screenshot. Default: "".
 *   - screenshotFullPage: [boolean] Capture a full page screenshot. Default: true.
 *
 * @example
 *  Web: Mouseover on link -field: "{{top_menu}} My account" -options: "{screenshot: true, screenshotText: 'Hovered on My Account'}"
 */
export async function mouseoverOnLink(
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
) {
  const resolvedField =
    typeof field === "string" ? vars.replaceVariables(field) : undefined;
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    actionTimeout,
    pattern,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json || {};

  if (isPlaywrightRunner()) {
    await allure.step(
      `Web: Mouseover on link -field: ${
        resolvedField || field
      } -options: ${JSON.stringify(options_json)}`,
      async () => {
        await doMouseoverOnLink();
      }
    );
  } else {
    await doMouseoverOnLink();
  }

  async function doMouseoverOnLink() {}

  if (!page) throw new Error("Page not initialized");

  const target =
    typeof field === "string"
      ? await webLocResolver(
          "link",
          resolvedField,
          page,
          pattern,
          actionTimeout
        )
      : field;

  await target.hover();
  await page.waitForLoadState("networkidle");

  await processScreenshot(page, screenshot, screenshotText, screenshotFullPage);
}

// ==========================  VERIFY STEPS  =================================================

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
    actionTimeout = Number(
      vars.getConfigValue("testExecution.actionTimeout") || 10000
    ),
    navigationTimeout = Number(
      vars.getConfigValue("testExecution.navigationTimeout") || 20000
    ),
    partialMatch = false,
    ignoreCase = false,
    assert = true,
    screenshot = true,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;

  if (isPlaywrightRunner()) {
    await allure.step(
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
    actionTimeout = Number(
      vars.getConfigValue("testExecution.actionTimeout")
    ) || 30000,
    partialMatch = false,
    ignoreCase = false,
    assert = true,
    screenshot = true,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;

  if (isPlaywrightRunner()) {
    await allure.step(
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
    actionTimeout = Number(
      vars.getConfigValue("testExecution.actionTimeout")
    ) || 30000,
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
    await allure.step(
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

    const actualText = (await target.innerText()).trim();
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
    await allure.step(
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
    actionTimeout = Number(
      vars.getConfigValue("testExecution.actionTimeout")
    ) || 30000,
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
    actionTimeout = Number(
      vars.getConfigValue("testExecution.actionTimeout")
    ) || 30000,
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
    await allure.step(
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
    actionTimeout = Number(
      vars.getConfigValue("testExecution.actionTimeout")
    ) || 30000,
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
    await allure.step(
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
 *   - screenshotText: [string] Description label for the screenshot.
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
    actionTimeout = Number(
      vars.getConfigValue("testExecution.actionTimeout")
    ) || 30000,
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

// ==========================  WAIT FUNCTION  =================================================

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
    actionTimeout = Number(
      vars.getConfigValue("testExecution.actionTimeout") || 30000
    ),
    pattern,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
    smartIQ_refreshLoc = "",
  } = options_json;

  if (isPlaywrightRunner()) {
    await allure.step(
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
    actionTimeout = Number(
      vars.getConfigValue("testExecution.actionTimeout")
    ) || 30000,
    match = "contains",
    screenshot = false,
    screenshotText,
    screenshotFullPage = true,
  } = options_json;

  if (isPlaywrightRunner()) {
    await allure.step(
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
    await allure.step(
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

async function processScreenshot(
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

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}