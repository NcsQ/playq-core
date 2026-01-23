/**
 * @file javascriptActions.ts
 *
 * Execute custom JavaScript in the page context with PlayQ.
 * Wraps page.evaluate with reporting-friendly step wrappers.
 *
 * Authors: PlayQ Team
 * Version: v1.0.0
 */
import * as allure from "allure-js-commons";
import type { Page } from "playwright";

function isPlaywrightRunner() { return process.env.TEST_RUNNER === 'playwright'; }
const __allureAny_js: any = allure as any;
if (typeof __allureAny_js.step !== 'function') { __allureAny_js.step = async (_n: string, f: any) => await f(); }

/**
 * Web: Execute Script -options: {param}
 *
 * Executes a function in the browser context via `page.evaluate`.
 *
 * @param page - Playwright Page instance
 * @param fn - Function to execute in the page context
 * @param args - Optional array passed as a single argument to the function
 * @returns The function result
 * @throws Error if page is not initialized or `fn` is not a function
 */
export async function execute<T>(page: Page, fn: (...args: any[]) => any, args?: any[]) {
  if (!page) throw new Error("Page not initialized");
  if (typeof fn !== 'function') throw new Error("javascript.execute: 'fn' must be a function");
  const stepName = `Web: Execute Script`;
  const run = async () => page.evaluate(fn, ...(args ? [args] : []));
  if (isPlaywrightRunner()) { return __allureAny_js.step(stepName, run); }
  return run();
}

// Friendly aliases
export const executeScript = execute;