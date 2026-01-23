/**
 * @file elementReaderActions.ts
 *
 * Element reader helpers for PlayQ web actions.
 * Provides text/value/attribute/class/html readers and a utility to store
 * element text into a PlayQ variable, with runner-aware step wrappers.
 *
 * Authors: PlayQ Team
 * Version: v1.0.0
 */
import * as allure from "allure-js-commons";
import type { Page, Locator } from "playwright";
import { vars, webLocResolver } from "../../../global";
import { processScreenshot } from "./screenshotActions";
import { attachLog } from '../comm/commonActions';
const config: any = {};
function isPlaywrightRunner() { return process.env.TEST_RUNNER === 'playwright'; }
const __allureAny_reader: any = allure as any;
if (typeof __allureAny_reader.step !== 'function') { __allureAny_reader.step = async (_n: string, f: any) => await f(); }
// Allure compatibility shim: if step is unavailable, just run the body
const __allureAny_web: any = allure as any;
if (typeof __allureAny_web.step !== 'function') {
  __allureAny_web.step = async (_name: string, fn: any) => await fn();
}
/**
 * Web: Get Text -field: {param} -options: {param}
 *
 * Returns the inner text of the resolved element.
 *
 * @param page - Playwright Page instance
 * @param field - Label/selector or Locator of the element
 * @param options - Optional JSON string or object ({ pattern, actionTimeout })
 * @returns The element's inner text
 * @throws Error if page is not initialized or element resolution fails
 */
export async function getText(page: Page, field: string | Locator, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : options || {};
  const stepName = `Web: Get Text -field: ${typeof field === 'string' ? field : '<locator>'}`;
  const run = async () => {
    if (!page) throw new Error("Page not initialized");
    const locator = typeof field === 'string'
      ? await webLocResolver(options_json?.fieldType || '', field, page, options_json?.pattern, typeof options_json?.actionTimeout === 'number' ? options_json.actionTimeout : undefined, options_json?.smartAiRefresh || '')
      : field;
    return locator.innerText();
  };
  if (isPlaywrightRunner()) { return __allureAny_reader.step(stepName, run); }
  return run();
}

/**
 * Web: Get Value -field: {param} -options: {param}
 *
 * Returns the input value of the resolved element.
 *
 * @param page - Playwright Page instance
 * @param field - Label/selector or Locator of the element
 * @param options - Optional JSON string or object ({ pattern, actionTimeout })
 * @returns The input's current value
 * @throws Error if page is not initialized or element resolution fails
 */
export async function getValue(page: Page, field: string | Locator, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : options || {};
  const stepName = `Web: Get Value -field: ${typeof field === 'string' ? field : '<locator>'}`;
  const run = async () => {
    if (!page) throw new Error("Page not initialized");
    const locator = typeof field === 'string'
      ? await webLocResolver(options_json?.fieldType || '', field, page, options_json?.pattern, typeof options_json?.actionTimeout === 'number' ? options_json.actionTimeout : undefined, options_json?.smartAiRefresh || '')
      : field;
    return locator.inputValue();
  };
  if (isPlaywrightRunner()) { return __allureAny_reader.step(stepName, run); }
  return run();
}

/**
 * Web: Get Attribute -field: {param} -name: {param} -options: {param}
 *
 * Returns the value of an attribute from the resolved element.
 *
 * @param page - Playwright Page instance
 * @param field - Label/selector or Locator of the element
 * @param name - Attribute name
 * @param options - Optional JSON string or object ({ pattern, actionTimeout })
 * @returns The attribute value or null
 * @throws Error if page is not initialized or element resolution fails
 */
export async function getAttribute(page: Page, field: string | Locator, name: string, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : options || {};
  const stepName = `Web: Get Attribute -field: ${typeof field === 'string' ? field : '<locator>'} -name: ${name}`;
  const run = async () => {
    if (!page) throw new Error("Page not initialized");
    const locator = typeof field === 'string'
      ? await webLocResolver(options_json?.fieldType || '', field, page, options_json?.pattern, typeof options_json?.actionTimeout === 'number' ? options_json.actionTimeout : undefined, options_json?.smartAiRefresh || '')
      : field;
    return locator.getAttribute(name);
  };
  if (isPlaywrightRunner()) { return __allureAny_reader.step(stepName, run); }
  return run();
}

/**
 * Web: Has Class -field: {param} -className: {param} -options: {param}
 *
 * Checks whether the element has the specified CSS class.
 *
 * @param page - Playwright Page instance
 * @param field - Label/selector or Locator of the element
 * @param className - Class name to check
 * @param options - Optional JSON string or object ({ pattern, actionTimeout })
 * @returns True when class present; false otherwise
 * @throws Error if page is not initialized or element resolution fails
 */
export async function hasClass(page: Page, field: string | Locator, className: string, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : options || {};
  const stepName = `Web: Has Class -field: ${typeof field === 'string' ? field : '<locator>'} -className: ${className}`;
  const run = async () => {
    if (!page) throw new Error("Page not initialized");
    const locator = typeof field === 'string'
      ? await webLocResolver(options_json?.fieldType || '', field, page, options_json?.pattern, typeof options_json?.actionTimeout === 'number' ? options_json.actionTimeout : undefined, options_json?.smartAiRefresh || '')
      : field;
    const cls = await locator.getAttribute('class');
    return (cls || '').split(/\s+/).includes(className);
  };
  if (isPlaywrightRunner()) { return __allureAny_reader.step(stepName, run); }
  return run();
}

/**
 * Web: Get HTML -field: {param} -options: {param}
 *
 * Returns the inner HTML of the resolved element.
 *
 * @param page - Playwright Page instance
 * @param field - Label/selector or Locator of the element
 * @param options - Optional JSON string or object ({ pattern, actionTimeout })
 * @returns The element's inner HTML
 * @throws Error if page is not initialized or element resolution fails
 */
export async function getHtml(page: Page, field: string | Locator, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : options || {};
  const stepName = `Web: Get HTML -field: ${typeof field === 'string' ? field : '<locator>'}`;
  const run = async () => {
    if (!page) throw new Error("Page not initialized");
    const locator = typeof field === 'string'
      ? await webLocResolver(options_json?.fieldType || '', field, page, options_json?.pattern, typeof options_json?.actionTimeout === 'number' ? options_json.actionTimeout : undefined, options_json?.smartAiRefresh || '')
      : field;
    return locator.innerHTML();
  };
  if (isPlaywrightRunner()) { return __allureAny_reader.step(stepName, run); }
  return run();
}

/**
 * Web: Store element text in Variable -field: {param} into variable: {param} -options: {param}
 * Stores the text content of a web element into a variable for later use.
 * @param page - Playwright Page instance.
 * @param field - The label, text, id, name, or selector of the web element.
 * @param variableName - The name of the variable to store the text content.
 * @param options - Optional JSON string or object:
 *  - actionTimeout: [number] Optional timeout in milliseconds. Default: Configured timeout.
 * - pattern: [string] Optional pattern to refine element search.
 * - attribute: [string] If provided, reads specific attribute instead of text/value.
 * - trim: [boolean] Whether to trim whitespace. Default: true.
 * - normalizeWhitespace: [boolean] Whether to normalize whitespace. Default: true.
 * - screenshot: [boolean] Capture screenshot after storing text. Default: false.
 * - screenshotText: [string] Description for the screenshot.
 */
export async function storeElementTextInVariable(
  page: Page,
  field: string | Locator,
  variableName: string,
  options?: string | Record<string, any>
) {
  const options_json =
    typeof options === "string" ? vars.parseLooseJson(options) : options || {};
  // Default fieldType to "input" if not provided or falsy
  const {
    actionTimeout = config?.testExecution?.actionTimeout || Number(
      vars.getConfigValue("testExecution.actionTimeout")
    ) || 30000,
    pattern,
    fieldType = "input",
    attribute = "",
    trim = true,
    normalizeWhitespace = true,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
  } = options_json;

  if (isPlaywrightRunner()) {
    await __allureAny_web.step(
      `Web: Store element text in Variable -field: ${field} into variable: ${variableName} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doStoreElementTextInVariable();
      }
    );
  } else {
    await doStoreElementTextInVariable();
  }

  async function doStoreElementTextInVariable() {
    if (!page) throw new Error("Page not initialized");

    const target =
      typeof field === "string"
        ? await webLocResolver(fieldType, field, page, pattern, actionTimeout)
        : field;

    await target.waitFor({ state: "visible", timeout: actionTimeout });

    const tag = await target.evaluate((el) => el.tagName.toLowerCase());
    let raw: string | null;

    if (attribute) {
      raw = await target.getAttribute(attribute);
    } else if (tag === "input" || tag === "textarea" || tag === "select") {
      raw = await target.inputValue();
    } else {
      raw = await target.innerText();
    }

    let value = (raw ?? "").toString();
    if (trim) value = value.trim();
    if (normalizeWhitespace) value = value.replace(/\s+/g, " ");

    if (typeof (vars as any).setValue === "function") {
      vars.setValue(variableName, value);
    } else if (typeof (vars as any).set === "function") {
      (vars as any).set(variableName, value);
    } else {
      throw new Error(
        `No supported setter found on vars to store "${variableName}"`
      );
    }

    await attachLog(
      `✅ Stored element text into "${variableName}": "${value}"`,
      "text/plain"
    );

    await processScreenshot(
      page,
      screenshot,
      screenshotText || `Stored text for: ${variableName}`,
      screenshotFullPage
    );
  }
}

/**
 * Web: Get All Texts -selector/field: {param} -options: {param}
 *
 * Returns an array of inner texts of all elements matching the selector or field.
 *
 * @param page - Playwright Page instance
 * @param field - CSS selector, label, or Locator
 * @param options - Optional JSON string or object:
 *   - pattern: [string] Pattern for pattern engine
 *   - fieldType: [string] Pattern engine field type (default: 'field')
 *   - itemSelector: [string] Sub-selector to locate text inside each element
 *   - attribute: [string] Attribute to extract instead of innerText (e.g., 'textContent', 'value')
 *   - actionTimeout: [number] Timeout in ms
 * @returns Array of strings representing the text of each element
 */
export async function getAllTexts(
  page: Page,
  field: string | Locator,
  options?: string | Record<string, any>
): Promise<string[]> {
  const options_json = typeof options === "string" ? vars.parseLooseJson(options) : options || {};
  const {
    pattern = '',
    fieldType = 'field',
    itemSelector = '',
    attribute = 'innerText',
    actionTimeout = config?.testExecution?.actionTimeout || Number(vars.getConfigValue("testExecution.actionTimeout")) || 30000
  } = options_json;

  const stepName = `Web: Get All Texts -field: ${typeof field === 'string' ? field : '<locator>'} -options: ${JSON.stringify(options_json)}`;

  const run = async () => {
    if (!page) throw new Error("Page not initialized");

    // Resolve locator
    const locator = typeof field === 'string'
      ? await webLocResolver(fieldType, field, page, pattern, actionTimeout)
      : field;

    const count = await locator.count();
    if (count === 0) {
      await attachLog(`❌ No elements found for field/selector "${field}"`, "text/plain");
      return [];
    }

    const texts: string[] = [];
    for (let i = 0; i < count; i++) {
      let el = locator.nth(i);
      if (itemSelector) el = el.locator(itemSelector);

      let value: string;
      if (attribute === 'innerText') {
        value = (await el.innerText()).trim();
      } else if (attribute === 'textContent') {
        value = (await el.textContent() || '').trim();
      } else {
        value = (await el.getAttribute(attribute) || '').trim();
      }

      texts.push(value.replace(/\s+/g, ' '));
    }

    await attachLog(`✅ Retrieved texts for "${field}": ${texts.join(', ')}`, "text/plain");
    return texts;
  };

  if (isPlaywrightRunner()) {
    return __allureAny_reader.step(stepName, run);
  }
  return run();
}
