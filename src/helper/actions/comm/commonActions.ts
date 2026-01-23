import { vars, webFixture, logFixture } from "../../../global";
import { parseLooseJson } from '../../bundle/vars';
import * as allure from "allure-js-commons";

function isPlaywrightRunner() { return process.env.TEST_RUNNER === 'playwright'; }
function isCucumberRunner() { return process.env.TEST_RUNNER === 'cucumber'; }

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
export async function comment(message: string) {
  if (typeof message !== 'string' || message.trim().length === 0) {
    throw new Error('❌ comment: message must be a non-empty string.');
  }
  const formattedMessage = vars.replaceVariables(message);

  if (isPlaywrightRunner()) {
    await __allureAny_comm.step(
      `Comm: Comment -text: ${formattedMessage}`,
      async () => {
        console.log(`💬 Comment: ${formattedMessage}`);
      }
    );
  } else {
    console.log(`💬 Comment: ${formattedMessage}`);
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
export async function storeValue(value: string, varName: string, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? parseLooseJson(options) : (options || {});
  if (typeof varName !== 'string' || varName.trim().length === 0) {
    throw new Error('❌ storeValue: varName must be a non-empty string.');
  }
  if (value === undefined || value === null) {
    throw new Error('❌ storeValue: value must be provided.');
  }
  const resolvedValue = vars.replaceVariables(value);

  if (isPlaywrightRunner()) {
    await __allureAny_comm.step(
      `Comm: Store -value: ${resolvedValue} in -variable: ${varName} -options: ${JSON.stringify(options_json)}`,
      async () => {
        vars.setValue(varName, resolvedValue);
      }
    );
  } else {
    vars.setValue(varName, resolvedValue);
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

) {
  if (message === undefined || message === null || (typeof message === 'string' && message.length === 0)) {
    console.warn('⚠️ attachLog: empty message provided; skipping attachment');
    return;
  }
  if (!mimeType) mimeType = "text/plain";
  if (!msgType) msgType = "Log";


  if (isCucumberRunner()) {
    const world = webFixture.getWorld();
    if (world?.attach) {
      await world.attach(message, mimeType);
    } else {
      console.warn("⚠️ No World.attach() available in Cucumber context");
    }
  } else if (isPlaywrightRunner()) {
    try {
      const anyAllure: any = allure as any;
      if (typeof anyAllure.attachment === 'function') {
        anyAllure.attachment(msgType, message, mimeType);
      } else if (typeof anyAllure.attach === 'function') {
        anyAllure.attach(msgType || 'Log', message, mimeType);
      } else {
        if (typeof message === 'string') console.log(message);
      }
    } catch {
      if (typeof message === 'string') console.log(message);
    }
    // await playwrightTest
    //   .info()
    //   .attach("Log", { body: message, contentType: mimeType });
  } else {
    console.warn("⚠️ attachLog: Unknown runner type");
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
export async function waitInMilliSeconds(ms: number) {
  if (typeof ms !== 'number' || !isFinite(ms) || ms < 0) {
    throw new Error('❌ waitInMilliSeconds: ms must be a non-negative number.');
  }
  const logger = logFixture.getLogger?.();
  const doWait = async () => {
    logger?.info?.(`⏳ Waiting for ${ms} ms`);
    await new Promise((resolve) => setTimeout(resolve, ms));
  };
  if (isPlaywrightRunner()) {
    await __allureAny_comm.step(`Comm: Wait-In-Milli-Seconds -seconds: ${ms}`, async () => {
      await doWait();
    });
  } else {
    await doWait();
  }
}
