/**
 * @file iframeActions.ts
 *
 * Frame switching helpers for PlayQ web actions.
 * Provides utilities to switch to a specific iframe and back to main content
 * with runner-aware step wrappers and robust error handling.
 *
 * Authors: PlayQ Team
 * Version: v1.0.0
 */
import * as allure from "allure-js-commons";
import type { Page, Frame, Locator } from "playwright";
import { vars, webLocResolver } from "../../../global";

function isPlaywrightRunner() { return process.env.TEST_RUNNER === 'playwright'; }
const __allureAny_iframe: any = allure as any;
if (typeof __allureAny_iframe.step !== 'function') { __allureAny_iframe.step = async (_n: string, f: any) => await f(); }

/**
 * Web: Switch To Frame -selector: {param} -options: {param}
 *
 * Switches execution context to the specified iframe.
 *
 * @param page - Playwright Page instance
 * @param frameSelector - Frame locator or string selector
 * @param options - Optional JSON string or object ({ pattern, actionTimeout })
 * @returns The resolved `Frame`
 * @throws Error if page is not initialized or frame not found
 */
export async function switchToFrame(page: Page, frameSelector: string | Locator, options?: string | Record<string, any>): Promise<Frame> {
  if (!page) throw new Error("Page not initialized");
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : options || {};
  const locator = typeof frameSelector === 'string'
    ? await webLocResolver(options_json?.fieldType || '', frameSelector, page, options_json?.pattern, typeof options_json?.actionTimeout === 'number' ? options_json.actionTimeout : undefined, options_json?.smartAiRefresh || '')
    : frameSelector;
  let frame: Frame | null = null;
  const stepName = `Web: Switch To Frame -selector: ${typeof frameSelector === 'string' ? frameSelector : '<locator>'}`;
  if (isPlaywrightRunner()) {
    await __allureAny_iframe.step(stepName, async () => {
      frame = await locator.elementHandle().then(h => h?.contentFrame() || null);
      if (!frame) throw new Error('Frame not found');
    });
  } else {
    frame = await locator.elementHandle().then(h => h?.contentFrame() || null);
    if (!frame) throw new Error('Frame not found');
  }
  return frame as Frame;
}

/**
 * Web: Switch To Main Content -options: {param}
 *
 * Returns to the main document context.
 *
 * @param page - Playwright Page instance
 * @param options - Optional JSON string or object (reserved)
 * @throws Error if page is not initialized
 */
export async function switchToMainContent(page: Page, options?: string | Record<string, any>) {
  if (!page) throw new Error("Page not initialized");
  const stepName = `Web: Switch To Main Content`;
  if (isPlaywrightRunner()) {
    await __allureAny_iframe.step(stepName, async () => { /* No-op: page operates on main frame */ });
  } else {
    /* No-op */
  }
}
