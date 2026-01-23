/**
 * @file mouseActions.ts
 *
 * Mouse interaction helpers for PlayQ web actions.
 * Provides click/hover/drag/scroll utilities with runner-aware step wrappers,
 * locator resolution, and screenshot options.
 *
 * Authors: PlayQ Team
 * Version: v1.0.0
 */
import * as allure from "allure-js-commons";
import { Page, Locator, BrowserContext } from "@playwright/test";
import { vars, webLocResolver } from "../../../global";
// no fs/path usage required in this module
import { waitForPageToLoad } from "./waitActions";
import { processScreenshot } from "./screenshotActions";
import { parseLooseJson } from '../../bundle/vars';
import { attachLog } from '../commActions';
// wait helpers provided via waitActions where needed
const config: any = {};
function isPlaywrightRunner() { return process.env.TEST_RUNNER === 'playwright'; }
const __allureAny_mouse: any = allure as any;
if (typeof __allureAny_mouse.step !== 'function') {
  __allureAny_mouse.step = async (_name: string, fn: any) => await fn();
}
// Allure compatibility shim: if step is unavailable, just run the body
const __allureAny_web: any = allure as any;
if (typeof __allureAny_web.step !== 'function') {
  __allureAny_web.step = async (_name: string, fn: any) => await fn();
}


/**
 * Web: Click Element -field: {param} -options: {param}
 *
 * Clicks an element on the page using the given fieldType.
 *
 * @param page - Playwright Page instance
 * @param field - Label, text, selector, or Locator
 * @param options - Optional JSON string or object:
 *   - fieldType: [string] Field type to resolve (button | action | div | text | link etc.)
 *   - actionTimeout: [number] Timeout in ms
 *   - pattern: [string] PatternIQ config override
 *   - isDoubleClick: [boolean]
 *   - screenshot: [boolean]
 *   - screenshotBefore: [boolean]
 *   - screenshotText: [string]
 *   - screenshotFullPage: [boolean]
 */
export async function click(
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};

  const {
    fieldType = "button",
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    pattern,
    isDoubleClick = false,
    screenshot = false,
    screenshotBefore = false,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;

  if (isPlaywrightRunner()) {
    await __allureAny_mouse.step(
      `Web: Click -field: ${field} -fieldType: ${fieldType} -options: ${JSON.stringify(options_json)}`,
      async () => {
        await doClick();
      }
    );
  } else {
    await doClick();
  }

  async function doClick() {
    if (!page) throw new Error("Page not initialized");

    const target =
      typeof field === "string"
        ? await webLocResolver(
          fieldType,
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

    if (isDoubleClick) {
      await target.dblclick();
    } else {
      await target.click();
    }

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
 *   - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
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
    await __allureAny_mouse.step(
      `Web: Mouseover on link -field: ${resolvedField || field
      } -options: ${JSON.stringify(options_json)}`,
      async () => {
        await doMouseoverOnLink();
      }
    );
  } else {
    await doMouseoverOnLink();
  }

  async function doMouseoverOnLink() { }

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

/**
 * Web: Mouseover on text -text: {param} -options: {param}
 *
 * Performs a mouse hover over an element identified by its visible text.
 *
 * @param page - Playwright Page instance
 * @param text - The visible text of the element to hover over
 * @param options - Optional string or object:
 *   - actionTimeout: [number] Optional timeout in milliseconds for waiting. Default: Configured timeout.
 *   - pattern: [string] Optional pattern to refine element search.
 *   - screenshot: [boolean] Capture a screenshot after hovering. Default: false.
 *   - screenshotText: [string] Description for the screenshot.
 *   - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
 *
 * @example
 *  Web: Mouseover on text -text: "Menu" -options: "{screenshot: true, screenshotText: 'Hovered on Menu'}"
 */
export async function mouseoverOnText(
  page: Page,
  text: string,
  options?: string | Record<string, any>
) {
  const resolvedText = vars.replaceVariables(text);
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    pattern,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;

  if (isPlaywrightRunner()) {
    await __allureAny_mouse.step(
      `Web: Mouseover on text -text: ${resolvedText} -options: ${JSON.stringify(options_json)}`,
      async () => {
        await doMouseoverOnText();
      }
    );
  } else {
    await doMouseoverOnText();
  }

  async function doMouseoverOnText() {
    if (!page) throw new Error("Page not initialized");
    // Use webLocResolver to find the element by text
    const target = await webLocResolver(
      "text",
      resolvedText,
      page,
      pattern,
      actionTimeout
    );
    await target.hover({ timeout: actionTimeout });
    await processScreenshot(
      page,
      screenshot,
      screenshotText || `Hovered on text: ${resolvedText}`,
      screenshotFullPage
    );
  }
}

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
 *   - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
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
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    pattern,
    isDoubleClick = false,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
    screenshotBefore = false,
  } = options_json || {};

  if (isPlaywrightRunner()) {
    await __allureAny_mouse.step(
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
 *   - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
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
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    pattern,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
    screenshotBefore = false,
  } = options_json || {};

  if (isPlaywrightRunner()) {
    await __allureAny_mouse.step(
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
 *   - screenshotFullPage: [boolean] Capture full page screenshot. Default: true.
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
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    pattern,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
    screenshotBefore = false,
  } = options_json || {};

  if (isPlaywrightRunner()) {
    await __allureAny_mouse.step(
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
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    pattern,
    force = true, // Playwright's force option
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
    screenshotBefore = false,
    smartIQ_refreshLoc = "",
  } = options_json || {};
  if (isPlaywrightRunner()) {
    await __allureAny_mouse.step(
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
 * Web: Click checkbox -field: {param} -options: {param}
 *
 * Selects a checkbox element on the page, identified by label, text, id, name, or pattern.
 *
 * @param field - The label, text, id, name, or selector of the checkbox to select (e.g., "Agree", "Subscribe").
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Optional timeout in milliseconds for waiting. Default: Configured timeout.
 *   - pattern: [string] Optional pattern to refine element search. Default: Configured pattern.
 *   - force: [boolean] Force the action (e.g., ignore actionability checks). Default: true.
 *   - screenshot: [boolean] Capture a screenshot after selecting the checkbox. Default: false.
 *   - screenshotText: [string] Text description for the screenshot. Default: "".
 *   - screenshotFullPage: [boolean] Capture a full page screenshot. Default: true.
 *   - screenshotBefore: [boolean] Capture a screenshot before selecting the checkbox. Default: false.
 * 
 *  @example
 *  Web: Click checkbox -field: "{checkbox_group:: Accept Terms} Agree" -options: "{screenshot: true, screenshotText: 'After selecting Agree for Accept Terms'}"
 */
export async function clickCheckbox(
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};
  const {
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    pattern,
    force = true, // Playwright's force option
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
    screenshotBefore = false,
    smartIQ_refreshLoc = "",
  } = options_json || {};

  if (isPlaywrightRunner()) {
    await __allureAny_mouse.step(
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

/**
 * Web: Click at Coordinates -x: {param} -y: {param} -options: {param}
 *
 * Clicks at the specified page coordinates (default: 0,0).
 *
 * @param page - Playwright Page instance
 * @param x - X coordinate (default: 0)
 * @param y - Y coordinate (default: 0)
 * @param options - Optional string or object:
 *   - screenshot: [boolean] Capture screenshot after clicking (default: false)
 *   - screenshotText: [string] Description for screenshot
 *   - screenshotFullPage: [boolean] Full page screenshot (default: true)
 *
 * @example
 *   await clickAtCoordinates(page); // Clicks at (0,0)
 *   await clickAtCoordinates(page, 100, 200, { screenshot: true });
 */
export async function clickAtCoordinates(
  page: Page,
  x: number = 0,
  y: number = 0,
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
    await __allureAny_mouse.step(
      `Web: Click at Coordinates -x: ${x} -y: ${y} -options: ${JSON.stringify(options_json)}`,
      async () => {
        await doClickAtCoordinates();
      }
    );
  } else {
    await doClickAtCoordinates();
  }

  async function doClickAtCoordinates() {
    await page.mouse.click(x, y);
    await attachLog(
      `✅ Clicked at coordinates (${x}, ${y})`,
      "text/plain"
    );
    await processScreenshot(
      page,
      screenshot,
      screenshotText || `Clicked at coordinates (${x}, ${y})`,
      screenshotFullPage
    );
  }
}


/**
 * Web: Drag and Drop -source: {param} -target: {param} -options: {param}
 *
 * Drags an element from source to target location.
 * 
 * @param page Playwright Page instance
 * @param source The source element to drag (label, text, id, name, or selector).
 * @param target The target element to drop onto (label, text, id, name, or selector).
 * @param options Optional JSON string or object:
 *   - fieldType: [string] Type of the elements (e.g., "item", "icon"). Default: "".
 *  - actionTimeout: [number] Optional timeout in milliseconds for waiting. Default: Configured timeout.
 *  - pattern: [string] Optional pattern to refine element search. Default: Configured pattern.
 *  - screenshot: [boolean] Capture a screenshot after drag and drop. Default: false.
 *  - screenshotText: [string] Text description for the screenshot. Default: "".
 *  - screenshotFullPage: [boolean] Capture a full page screenshot. Default: true.
 *  - screenshotBefore: [boolean] Capture a screenshot before drag and drop. Default: false.
 * 
 * @example
 *  Web: Drag and Drop -source: "Item A" -target: "Item B" -options: "{screenshot: true, screenshotText: 'After drag and drop'}"
 */
export async function dragAndDrop(page: Page, source: string | Locator, target: string | Locator, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : options || {};
  const src = typeof source === 'string'
    ? await webLocResolver(options_json?.fieldType || '', source, page, options_json?.pattern, typeof options_json?.actionTimeout === 'number' ? options_json.actionTimeout : undefined, options_json?.smartAiRefresh || '')
    : source;
  const dst = typeof target === 'string'
    ? await webLocResolver(options_json?.fieldType || '', target, page, options_json?.pattern, typeof options_json?.actionTimeout === 'number' ? options_json.actionTimeout : undefined, options_json?.smartAiRefresh || '')
    : target;
  const stepName = `Web: Drag And Drop -source: ${typeof source === 'string' ? source : '<locator>'} -target: ${typeof target === 'string' ? target : '<locator>'}`;
  if (isPlaywrightRunner()) {
    await __allureAny_mouse.step(stepName, async () => { await src.dragTo(dst); });
  } else {
    await src.dragTo(dst);
  }
}

/**
 * Web: Scroll To -x: {param} -y: {param} -options: {param}
 * 
 * Scrolls the page to the specified x and y coordinates.
 * 
 * @param page Playwright Page instance
 * @param x The x-coordinate to scroll to.
 * @param y The y-coordinate to scroll to.
 * @param options Optional JSON string or object (reserved for future use).
 * 
 * @example
 *  Web: Scroll To -x: 0 -y: 500 -options: "{}"
 */
export async function scrollTo(page: Page, x: number, y: number, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : options || {};
  const stepName = `Web: Scroll To -x: ${x} -y: ${y}`;
  if (isPlaywrightRunner()) {
    await __allureAny_mouse.step(stepName, async () => {
      await page.evaluate(([px, py]) => window.scrollTo(px, py), [x, y]);
    });
  } else {
    await page.evaluate(([px, py]) => window.scrollTo(px, py), [x, y]);
  }
}

/**
 * Web: Scroll Up -amount: {param} -options: {param}
 *
 * Scrolls the page up by the specified amount.
 *
 * @param page Playwright Page instance
 * @param amount The amount in pixels to scroll up (default: 200).
 * @param options Optional JSON string or object (reserved for future use).
 *
 * @example
 *  Web: Scroll Up -amount: 300 -options: "{}"
 */
export async function scrollUp(page: Page, amount: number = 200, options?: string | Record<string, any>) {
  return scrollBy(page, -Math.abs(amount), options);
}

/**
 * Web: Scroll Down -amount: {param} -options: {param}
 *
 * Scrolls the page down by the specified amount.
 *
 * @param page Playwright Page instance
 * @param amount The amount in pixels to scroll down (default: 200).
 * @param options Optional JSON string or object (reserved for future use).
 *
 * @example
 *  Web: Scroll Down -amount: 300 -options: "{}"
 */
export async function scrollDown(page: Page, amount: number = 200, options?: string | Record<string, any>) {
  return scrollBy(page, Math.abs(amount), options);
}

/**
 * Web: Scroll By -dy: {param} -options: {param}
 *
 * Scrolls the page vertically by the specified amount.
 * 
 * @param page Playwright Page instance
 * @param dy The amount in pixels to scroll by (positive for down, negative for up).
 * @param options Optional JSON string or object (reserved for future use).
 * 
 * @example
 *  Web: Scroll By -dy: 250 -options: "{}"
 */
async function scrollBy(page: Page, dy: number, options?: string | Record<string, any>) {
  /**
   * Web: Scroll By -dy: {param} -options: {param}
   *
   * Scrolls the page vertically by the specified amount.
   * Wraps the action in an Allure step when running under Playwright.
   *
   * @param page - Playwright Page instance
   * @param dy - Pixels to scroll by (positive = down, negative = up)
   * @param options - Optional JSON string or object (reserved)
   */
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : options || {};
  const stepName = `Web: Scroll By -dy: ${dy}`;
  if (isPlaywrightRunner()) {
    await __allureAny_mouse.step(stepName, async () => {
      await page.evaluate((d) => window.scrollBy(0, d), dy);
    });
  } else {
    await page.evaluate((d) => window.scrollBy(0, d), dy);
  }
}

/**
 * Web: Click and Wait for New Page -field: {param} -options: {param}
 *
 * Clicks a button or link and waits for a new page (tab) to open.
 *
 * @param context - Playwright BrowserContext
 * @param page - Current Playwright Page
 * @param field - The button/link text or locator to click
 * @param options - Options for clickButton/clickLink
 * @returns The new Page object
 *
 * @example
 *   const newPage = await clickAndWaitForNewPage(context, page, "Open Tab", { screenshot: true });
 */
export async function clickAndWaitForNewPage(
  context: BrowserContext,
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? parseLooseJson(options) : options || {};

  if (isPlaywrightRunner()) {
    return await __allureAny_web.step(
      `Web: Click and Wait for New Page -field: ${field} -options: ${JSON.stringify(options_json)}`,
      async () => {
        return await doClickAndWaitForNewPage();
      }
    );
  } else {
    return await doClickAndWaitForNewPage();
  }

  async function doClickAndWaitForNewPage() {
    if (!context) throw new Error("BrowserContext not initialized");
    if (!page) throw new Error("Page not initialized");

    // Try button first, fallback to link if not found
    let clickFn = clickButton;
    try {
      if (typeof field === "string") {
        await page.waitForSelector(`button:has-text("${field}")`, { timeout: 2000 });
      }
    } catch {
      clickFn = clickLink;
    }

    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      clickFn(page, field, options_json)
    ]);
    await newPage.waitForLoadState('domcontentloaded');
    return newPage;
  }
}
