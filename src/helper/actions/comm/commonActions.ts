/**
 * Common communication actions
 * Provides logging, storage, and utility functions for tests
 */

import { vars, webFixture, logFixture } from '../../../global';
import { parseLooseJson } from '../../bundle/vars';
import * as allure from 'allure-js-commons';

function isPlaywrightRunner() {
  return process.env.TEST_RUNNER === 'playwright';
}

function isCucumberRunner() {
  return process.env.TEST_RUNNER === 'cucumber';
}

const __allureAny_comm: any = allure as any;
if (typeof __allureAny_comm.step !== 'function') {
  __allureAny_comm.step = async (_name: string, fn: any) => await fn();
}

/**
 * Comm: Comment -text: {param}
 *
 * Logs a comment with variable substitution to the console.
 * Useful for adding contextual information to the test log.
 *
 * Variables inside the message string (e.g., ${var.username}) will be replaced using `vars.replaceVariables`.
 *
 * @param message - The comment or message to log.
 *
 * @throws Error if `message` is not a non-empty string.
 *
 * @example
 * Comm: Comment -text: "LAMBDA TEST COMPLETE"
 */
export async function comment(message: string): Promise<void> {
  if (typeof message !== 'string' || message.trim() === '') {
    throw new Error('Message must be a non-empty string');
  }

  const resolved = vars.replaceVariables(message);

  if (isPlaywrightRunner()) {
    await __allureAny_comm.step(`Comm: Comment -text: "${resolved}"`, async () => {
      console.log(`📝 Comment: ${resolved}`);
    });
  } else {
    console.log(`📝 Comment: ${resolved}`);
  }
}

/**
 * Comm: Store -value: {param} in -variable: {param} -options: {param}
 *
 * Stores a value (with optional variable substitution) into a runtime variable.
 *
 * Variables inside the value string (e.g., ${var.username}) will be resolved using `vars.replaceVariables`.
 *
 * @param value - The value to store (can include variable references).
 * @param varName - The name of the variable to store the resolved value into.
 * @param options - Optional string or object with additional parameters (parsed if string). Currently unused but reserved for future logic.
 *
 * @throws Error if `varName` is not a non-empty string or `value` is undefined/null.
 *
 * @example
 * Store -value: "${faker.string.alphanumeric({length:4})}" in -variable: "var.centre.code" -options: ""
 */
export async function storeValue(
  value: string,
  varName: string,
  options?: string | Record<string, any>
): Promise<void> {
  if (!varName || typeof varName !== 'string') {
    throw new Error('Variable name must be a non-empty string');
  }

  if (value === undefined || value === null) {
    throw new Error('Value cannot be undefined or null');
  }

  const resolvedValue = vars.replaceVariables(String(value));
  vars.setValue(varName, resolvedValue);

  if (isPlaywrightRunner()) {
    await __allureAny_comm.step(
      `Comm: Store -value: "***" in -variable: ${varName}`,
      async () => {
        console.log(`💾 Stored: ${varName} = ${resolvedValue}`);
      }
    );
  } else {
    console.log(`💾 Stored: ${varName} = ${resolvedValue}`);
  }
}

/**
 * Comm: Attach-Log -message: {param} -mimeType: {param} -msgType: {param}
 *
 * Attach log or message to the test context (Cucumber or Playwright runner).
 * @param message The message or buffer to attach
 * @param mimeType The mime type (default: text/plain)
 * @param msgType Optional label for the attachment (default: "Log").
 *
 * If `message` is empty or undefined, a warning is logged and no attachment is made.
 */
export async function attachLog(
  message: string | Buffer,
  mimeType?: string,
  msgType?: string
): Promise<void> {
  if (!message || (typeof message === 'string' && message.trim() === '')) {
    console.warn('⚠️ Message is empty. Skipping attachment.');
    return;
  }

  const type = msgType || 'Log';
  const mime = mimeType || 'text/plain';

  try {
    if (isPlaywrightRunner()) {
      // Use allure for Playwright
      const anyAllure: any = allure as any;
      if (typeof anyAllure.attachment === 'function') {
        anyAllure.attachment(type, message, mime);
      } else if (typeof anyAllure.attach === 'function') {
        anyAllure.attach(type, message, mime);
      } else {
        console.log(`📎 [${type}] ${message}`);
      }
    } else if (isCucumberRunner()) {
      // Use world.attach for Cucumber
      const world = webFixture.getWorld();
      if (world?.attach) {
        const buffer = typeof message === 'string' ? Buffer.from(message) : message;
        await world.attach(buffer, mime);
      } else {
        console.log(`📎 [${type}] ${message}`);
      }
    } else {
      console.log(`📎 [${type}] ${message}`);
    }
  } catch (error) {
    console.warn(`⚠️ Could not attach log: ${error}`);
  }
}

/**
 * Comm: Wait-In-Milli-Seconds -seconds: {param}
 *
 * Pauses execution for a given number of milliseconds.
 * Logs a message using the test logger if available.
 *
 * @param ms - The number of milliseconds to wait.
 *
 * @throws Error if `ms` is not a finite number or is negative.
 *
 * @example
 * Comm: Wait-In-Milli-Seconds -seconds: "1000"
 */
export async function waitInMilliSeconds(ms: number): Promise<void> {
  if (!Number.isFinite(ms) || ms < 0) {
    throw new Error('Wait duration must be a non-negative finite number');
  }

  if (isPlaywrightRunner()) {
    await __allureAny_comm.step(`Comm: Wait-In-Milli-Seconds -seconds: ${ms}`, async () => {
      console.log(`⏱️ Waiting ${ms}ms...`);
      await new Promise((resolve) => setTimeout(resolve, ms));
    });
  } else {
    console.log(`⏱️ Waiting ${ms}ms...`);
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
