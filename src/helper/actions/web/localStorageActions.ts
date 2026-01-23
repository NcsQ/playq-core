/**
 * @file localStorageActions.ts
 *
 * window.localStorage helpers for PlayQ web actions.
 * Provides set/get/remove/clear with runner-aware step wrappers.
 *
 * Authors: PlayQ Team
 * Version: v1.0.0
 */
import * as allure from "allure-js-commons";
import type { Page } from "playwright";
import { vars } from "../../../global";

function isPlaywrightRunner() { return process.env.TEST_RUNNER === 'playwright'; }
const __allureAny_ls: any = allure as any;
if (typeof __allureAny_ls.step !== 'function') { __allureAny_ls.step = async (_n: string, f: any) => await f(); }

/**
 * Web: LocalStorage Set -key: {param} -value: {param}
 *
 * Sets a key/value pair in window.localStorage.
 *
 * @param page - Playwright Page instance
 * @param key - Storage key (required)
 * @param value - Storage value
 * @param options - Optional JSON string or object (reserved for future flags)
 * @throws Error if page is not initialized or key is missing
 */
export async function setItem(page: Page, key: string, value: string, options?: any) {
  const stepName = `Web: LocalStorage Set -key: ${key}`;
  if (!page) throw new Error("Page not initialized");
  if (!key) throw new Error("LocalStorage.setItem: 'key' is required");
  const _opts = typeof options === 'string' ? vars.parseLooseJson(options) : (options || {}); // reserved for future flags
  const run = async () => page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
  if (isPlaywrightRunner()) { await __allureAny_ls.step(stepName, run); } else { await run(); }
}

// Friendly aliases
export const localStorageSet = setItem;

/**
  * Web: LocalStorage Get -key: {param} -options: {param}
  *
  * Retrieves a value by key from window.localStorage.
  *
  * @param page - Playwright Page instance
  * @param key - Storage key (required)
  * @param options - Optional JSON string or object:
  *  - assert: [boolean] If true, throws when value is null/undefined (default: false)
  * @returns Stored value or null
  * @throws Error if page is not initialized or key is missing
  */
export async function getItem(page: Page, key: string, options?: any) {
  const stepName = `Web: LocalStorage Get -key: ${key}`;
  if (!page) throw new Error("Page not initialized");
  if (!key) throw new Error("LocalStorage.getItem: 'key' is required");
  const _opts = typeof options === 'string' ? vars.parseLooseJson(options) : (options || {});
  const run = async () => page.evaluate((k) => localStorage.getItem(k), key);
  const result = isPlaywrightRunner() ? await __allureAny_ls.step(stepName, run) : await run();
  if (_opts?.assert === true && (result === null || result === undefined)) {
    throw new Error(`LocalStorage.getItem: No value found for key '${key}'`);
  }
  return result;
}

// Friendly aliases
export const localStorageGet = getItem;

/**
 * Web: LocalStorage Remove -key: {param}
 *
 * Removes a key from window.localStorage.
 *
 * @param page - Playwright Page instance
 * @param key - Storage key (required)
 * @param options - Optional JSON string or object (reserved for future flags)
 * @throws Error if page is not initialized or key is missing
 */
export async function removeItem(page: Page, key: string, options?: any) {
  const stepName = `Web: LocalStorage Remove -key: ${key}`;
  if (!page) throw new Error("Page not initialized");
  if (!key) throw new Error("LocalStorage.removeItem: 'key' is required");
  const _opts = typeof options === 'string' ? vars.parseLooseJson(options) : (options || {}); // reserved for future flags
  const run = async () => page.evaluate((k) => localStorage.removeItem(k), key);
  if (isPlaywrightRunner()) { await __allureAny_ls.step(stepName, run); } else { await run(); }
}

// Friendly aliases
export const localStorageRemove = removeItem;

/**
 * Web: LocalStorage Clear -options: {param}
 *
 * Clears all keys from window.localStorage.
 *
 * @param page - Playwright Page instance
 * @param options - Optional JSON string or object (reserved for future flags)
 * @throws Error if page is not initialized
 */
export async function clearStorage(page: Page, options?: any) {
  const stepName = `Web: LocalStorage Clear`;
  if (!page) throw new Error("Page not initialized");
  const _opts = typeof options === 'string' ? vars.parseLooseJson(options) : (options || {}); // reserved for future flags
  const run = async () => page.evaluate(() => localStorage.clear());
  if (isPlaywrightRunner()) { await __allureAny_ls.step(stepName, run); } else { await run(); }
}

// Friendly aliases
export const localStorageClear = clearStorage;
