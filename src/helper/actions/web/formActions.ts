/**
 * @file formActions.ts
 *
 * Form interaction helpers for PlayQ web actions.
 * Provides fill/select/upload utilities with runner-aware step wrappers,
 * locator resolution, and screenshot options.
 *
 * Authors: PlayQ Team
 * Version: v1.0.0
 */
import * as allure from "allure-js-commons";
import { Page, Locator } from "@playwright/test";
import { vars } from "../../../global";
import path from "path";
import fs from "fs";
import { webLocResolver } from "../../fixtures/webLocFixture";
import { waitForEnabled } from "./waitActions";
import { processScreenshot } from "./screenshotActions";
import { parseLooseJson } from '../../bundle/vars';
import { waitInMilliSeconds } from '../commActions';

function isPlaywrightRunner() { return process.env.TEST_RUNNER === 'playwright'; }
const __allureAny_form: any = allure as any;
if (typeof __allureAny_form.step !== 'function') { __allureAny_form.step = async (_n: string, f: any) => await f(); }

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
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    pattern,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
    screenshotField = false,
    smartIQ_refreshLoc = "",
  } = options_json || {};

  if (isPlaywrightRunner()) {
    await __allureAny_form.step(
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

// Friendly aliases
export const input = fill;
export const type = fill;
export const set = fill;
export const enter = fill;

/**
 * Web: Append -field: {param} -value: {param} -options: {param}
 *
 * Appends text to an input or textarea without clearing existing content.
 *
 * @param page - Playwright Page instance
 * @param field - The label, placeholder, id, name, or pattern of the input field
 * @param value - The text value to append
 * @param options - Optional JSON string or object:
 *   - actionTimeout: [number] Timeout in ms (default: 30000)
 *   - pattern: [string] Optional pattern to refine element search
 *   - screenshot: [boolean] Capture a screenshot after appending (default: false)
 *   - screenshotText: [string] Text description for the screenshot
 *   - screenshotFullPage: [boolean] Capture a full page screenshot (default: true)
 *   - screenshotField: [boolean] Capture screenshot of the field (input element) only (default: false)
 */
export async function append(
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
    actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")),
    pattern,
    screenshot = false,
    screenshotText = "",
    screenshotFullPage = true,
    screenshotField = false,
    smartIQ_refreshLoc = "",
  } = options_json || {};

  if (isPlaywrightRunner()) {
    await __allureAny_form.step(
      `Web: Append -field: ${field} -value: ${value} -options: ${JSON.stringify(
        options_json
      )}`,
      async () => {
        await doAppend();
      }
    );
  } else {
    await doAppend();
  }
  async function doAppend() {
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
        .type(resolvedvalue, { timeout: actionTimeout });
    } else {
      await waitForEnabled(target, actionTimeout);
      await target.type(resolvedvalue, { timeout: actionTimeout });
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
 * Web: Select Option -field: {param} -value: {param} -options: {param}
 *
 * Selects an option in a dropdown by label or value.
 * Delegates to core `selectDropdown`.
 *
 * @param page Playwright Page instance
 * @param field Dropdown locator or string selector
 * @param value Option label or value
 * @param options Optional JSON string or object ({ actionTimeout, pattern })
 */
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
export async function selectOption(page: Page, field: string | Locator, value: string | number, options?: string | Record<string, any>) {
  const resolvedValue = value !== undefined && value !== null ? vars.replaceVariables(value.toString()) : "";
  const options_json = typeof options === "string" ? vars.parseLooseJson(options) : options || {};
  const { actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")) || 30000, pattern, screenshot = false, screenshotText = "", screenshotFullPage = true, smartIQ_refreshLoc = "" } = options_json;
  const stepName = `Web: Select Dropdown -field: ${String(field)} -value: ${resolvedValue} -options: ${JSON.stringify(options_json)}`;
  async function run() {
    if (!page) throw new Error("Page not initialized");
    const target = typeof field === "string" ? await webLocResolver("dropdown", field, page, pattern, actionTimeout, smartIQ_refreshLoc) : field;
    const tag = await (target as Locator).evaluate((el) => el.tagName.toLowerCase());
    try {
      if (tag === "select") {
        await (target as Locator).selectOption({ label: resolvedValue }).catch(async () => { await (target as Locator).selectOption({ value: resolvedValue }); });
      } else {
        await waitForEnabled(target as Locator, actionTimeout);
        await (target as Locator).click();
        const dropdownOptions = page.locator(`role=option >> text="${resolvedValue}"`);
        const visibleOption = dropdownOptions.first();
        if (await visibleOption.isVisible()) {
          await visibleOption.click();
        } else {
          await page.locator(`text="${resolvedValue}"`).first().click();
        }
      }
    } catch (e) {
      throw new Error(`❌ Failed to select "${resolvedValue}" from dropdown: ${e}`);
    }
    await processScreenshot(page, screenshot, screenshotText || `Select: ${resolvedValue}`, screenshotFullPage);
  }
  if (isPlaywrightRunner()) { await __allureAny_form.step(stepName, run); } else { await run(); }
}

/**
 * Web: Upload File -field: {param} -file: {param} -options: {param}
 *
 * Uploads a file to an input element.
 * Delegates to core `uploadFile`.
 *
 * @param page Playwright Page instance
 * @param field File input locator or string selector
 * @param file Local file path
 * @param options Optional JSON string or object ({ actionTimeout })
 */
export async function uploadFile(page: Page, field: string | Locator, file: string, options?: string | Record<string, any>) {
  const projectRoot = process.env['PLAYQ_PROJECT_ROOT'] || process.cwd();
  let filePath = file;
  if (!path.isAbsolute(filePath)) {
    const basePath = path.resolve(projectRoot, 'test-data');
    filePath = path.resolve(basePath, file);
  }
  filePath = path.normalize(filePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found for upload: ${filePath}`);
  }
  const options_json = typeof options === "string" ? vars.parseLooseJson(options) : options || {};
  const { actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")) || 10000, screenshot = false, screenshotText = "", screenshotFullPage = true, pattern } = options_json || {};
  const stepName = `Web: Upload file at -field: ${String(field)} with filename: ${file} -options: ${JSON.stringify(options_json)}`;
  async function run() {
    if (!page) throw new Error("Page not initialized");
    const target = typeof field === "string" ? await webLocResolver("input", field, page, pattern, actionTimeout) : field;
    await (target as Locator).waitFor({ state: "visible", timeout: actionTimeout });
    const tag = await (target as Locator).evaluate((el: any) => ({ tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || '' }));
    if (tag.tag === 'input' && tag.type.toLowerCase() === 'file') {
      await (target as Locator).setInputFiles(filePath, { timeout: actionTimeout });
    } else {
      const fileChooserPromise = page.waitForEvent('filechooser');
      await (target as Locator).click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(filePath);
    }
  }
  if (isPlaywrightRunner()) { await __allureAny_form.step(stepName, run); } else { await run(); }
}

/**
 * Web: Select Dropdown by Index -field: {param} -index: {param} -options: {param}
 *
 * Selects a dropdown option by its index (zero-based).
 * Works with both native <select> elements and custom dropdowns.
 *
 * @param page - Playwright Page instance
 * @param field - Locator or label of the dropdown
 * @param index - Index of the option to select (zero-based)
 * @param options - Optional string or object containing:
 *   - actionTimeout: custom timeout
 *   - pattern: extra pattern string for locator resolution
 *   - screenshot: boolean (default false)
 *   - screenshotText: text for screenshot description
 *   - screenshotFullPage: boolean (default true)
 *   - smartIQ_refreshLoc: optional override for locator refresh key
 */
export async function selectOptionByIndex(page: Page, field: string | Locator, index: number, options?: string | Record<string, any>) {
  const options_json = typeof options === "string" ? vars.parseLooseJson(options) : options || {};
  const { actionTimeout = Number(vars.getConfigValue("testExecution.actionTimeout")) || 30000, pattern, screenshot = false, screenshotText = "", screenshotFullPage = true, smartIQ_refreshLoc = "" } = options_json;
  const stepName = `Web: Select Dropdown by Index -field: ${String(field)} -index: ${index} -options: ${JSON.stringify(options_json)}`;
  async function run() {
    if (!page) throw new Error("Page not initialized");
    const target = typeof field === "string" ? await webLocResolver("dropdown", field, page, pattern, actionTimeout, smartIQ_refreshLoc) : field;
    const tag = await (target as Locator).evaluate((el) => el.tagName.toLowerCase());
    try {
      if (tag === "select") {
        const optionsCount = await (target as Locator).locator("option").count();
        if (index < 0 || index >= optionsCount) { throw new Error(`❌ Index ${index} is out of bounds for dropdown with ${optionsCount} options`); }
        const optionLocator = (target as Locator).locator("option").nth(index);
        const value = await optionLocator.getAttribute("value");
        await (target as Locator).selectOption({ value });
      } else {
        await (target as Locator).click();
        const dropdownOptions = page.locator('role=option');
        const optionCount = await dropdownOptions.count();
        if (index < 0 || index >= optionCount) { throw new Error(`❌ Index ${index} is out of bounds for custom dropdown with ${optionCount} options`); }
        const optionToClick = dropdownOptions.nth(index);
        await optionToClick.click();
      }
    } catch (e) {
      throw new Error(`❌ Failed to select index ${index} from dropdown: ${e}`);
    }
    await processScreenshot(page, screenshot, screenshotText || `Select dropdown index: ${index}`, screenshotFullPage);
  }
  if (isPlaywrightRunner()) { await __allureAny_form.step(stepName, run); } else { await run(); }
}

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
    await __allureAny_form.step(
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
 * Alias: Select Dropdown by Index (wrapper to selectOptionByIndex)
 */
export async function selectDropdownByIndex(page: Page, field: string | Locator, index: number, options?: string | Record<string, any>) {
  return selectOptionByIndex(page, field, index, options);
}
