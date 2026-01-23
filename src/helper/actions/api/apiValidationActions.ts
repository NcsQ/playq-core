/**
 * @file apiValidationActions.ts
 *
 * Validation utilities for API testing across Playwright and Cucumber runners.
 * Provides value and JSON path assertions with variable interpolation.
 *
 * Key Features:
 * - Hybrid runner support with Allure-compatible steps.
 * - Flexible path resolution for body, headers, status, and status text.
 * - Optional partial text checks and assertion control.
 *
 * Authors: Renish Kozhithottathil [Lead Automation Principal, NCS]
 * Date: 2025-07-01
 * Version: v1.0.0
 *
 * Note: This file adheres to the PlayQ Enterprise Automation Standards.
 */
import * as allure from "allure-js-commons";
import { vars, comm } from "../../../global";

// Inline runner helpers
function isPlaywrightRunner() { return process.env.TEST_RUNNER === 'playwright'; }
function isCucumberRunner() { return process.env.TEST_RUNNER === 'cucumber'; }
const __allureAny_api: any = allure as any;
if (typeof __allureAny_api.step !== 'function') {
  __allureAny_api.step = async (_name: string, fn: any) => await fn();
}

/**
 * Api: Verify value -actual: {param} -expected: {param} -options: {param}
 * 
 * Verifies that a given value matches the expected value.
 * Throws an error if the values do not match.
 *
 * @param actual - The actual value to verify.
 * @param expected - The expected value to compare against.
 * @param message - Optional. Custom error message on failure.
 */
export async function verifyValue(actual: any, expected: string, options?: string | Record<string, any>) {
  const resolvedActual = vars.replaceVariables(String(actual));
  const resolvedExpected = vars.replaceVariables(expected);

  const options_json =
    typeof options === "string" ? vars.parseLooseJson(options) : options || {};
  const {
    assert = true,
    partial_text = false
  } = options_json;

  // Input validation
  if (expected === undefined || expected === null) {
    throw new Error("Expected value must be provided for verification.");
  }

  if (isPlaywrightRunner()) {
    await __allureAny_api.step(`Api: Verify value -actual: ${resolvedActual} -expected: ${resolvedExpected} -options: ${JSON.stringify(options_json)}`,
      async () => {
        await doVerifyValue();
      });
  } else {
    await doVerifyValue();
  }

  async function doVerifyValue() {
    // Debug log for type and value
    console.debug(`[verifyValue] actual (type: ${typeof actual}):`, actual);
    if (partial_text) {
      if (!resolvedActual.includes(resolvedExpected)) {
        console.warn(`❌ Verification failed (partial_text): expected '${resolvedActual}' to include '${resolvedExpected}'`);
        await comm.attachLog(`❌ Verification failed (partial_text): expected '${resolvedActual}' to include '${resolvedExpected}'`, "text/plain", "Verification Details");
        if (assert) throw new Error(`Verification failed (partial_text): expected '${resolvedActual}' to include '${resolvedExpected}'`);
      } else {
        console.info(`✅ Verification passed (partial_text): expected '${resolvedActual}' to include '${resolvedExpected}'`);
        await comm.attachLog(`✅ Verification passed (partial_text): expected '${resolvedActual}' to include '${resolvedExpected}'`, "text/plain", "Verification Details");
      }
      return;
    }
    if (resolvedActual !== resolvedExpected) {
      console.warn(`❌ Verification failed: expected: '${resolvedExpected}', actual: '${resolvedActual}'`);
      await comm.attachLog(`❌ Verification failed: expected: '${resolvedExpected}', actual: '${resolvedActual}'`, "text/plain", "Verification Details");
      if (assert) throw new Error(`Verification failed: expected '${resolvedExpected}', but got '${resolvedActual}'`);
    } else {
      console.info(`✅ Verification passed: expected: '${resolvedExpected}', actual: '${resolvedActual}'`);
      await comm.attachLog(`✅ Verification passed: expected: '${resolvedExpected}', actual: '${resolvedActual}'`, "text/plain", "Verification Details");
    }
  }

}

/**
 * Api: Verify api path value in last response -path: {param} -expected: {param} -options: {param}
 * 
 * Verifies that a value at a given JSON path in the last API response matches the expected value.
 * Throws an error if the values do not match.
 *
 * @param path - The JSON path to extract from the last response body/header/status.
 * @param expected - The expected value to compare against.
 * @param options - Optional. Supports { assert: boolean, partial_text: boolean }
 */
export async function verifyPathValue(path: string, expected: string, options?: string | Record<string, any>) {
  const resolvedExpected = vars.replaceVariables(expected);
  const options_json =
    typeof options === "string" ? vars.parseLooseJson(options) : options || {};
  const {
    assert = true,
    partial_text = false
  } = options_json;

  // Input validation
  if (!path || typeof path !== 'string') {
    throw new Error("Path must be a non-empty string for verification.");
  }
  if (expected === undefined || expected === null) {
    throw new Error("Expected value must be provided for verification.");
  }

  const sources = {
    body: vars.getValue("playq.api.last.resBody"),
    header: vars.getValue("playq.api.last.resHeader"),
    status: vars.getValue("playq.api.last.resStatus"),
    statusText: vars.getValue("playq.api.last.resStatusText")
  };

  let actual: any;
  let allureMsg = ""
  if (isPlaywrightRunner()) {
    await __allureAny_api.step(`Api: Verify api path value in last response -path: ${path} -expected: ${resolvedExpected} -options: ${JSON.stringify(options_json)}`,
      async () => {
        await doVerifyPathValue();
        // if (allureMsg) await allure.attachment(`${allureMsg}`, "", "text/plain");
      });
  } else {
    await doVerifyPathValue();
  }

  async function doVerifyPathValue() {
    actual = getPathValue(path, sources);
    // Debug log for extracted value
    console.debug(`[verifyPathValue] path: ${path},  extracted value (type: ${typeof actual}):`, actual, `Expected: ${resolvedExpected}`);
    // verifyValue(actual, resolvedExpected, options);
    if (partial_text) {
      if (!actual || !actual.includes(resolvedExpected)) {
        console.warn(`❌ Verification failed (partial_text): expected '${actual}' to include '${resolvedExpected}'`);
        await comm.attachLog(`❌ Verification failed (partial_text): expected '${actual}' to include '${resolvedExpected}'`, "text/plain", "Verification Details");
        if (assert) throw new Error(`Verification failed (partial_text): expected '${actual}' to include '${resolvedExpected}'`);
      } else {
        await comm.attachLog(`✅ Verification passed (partial_text): expected '${actual}' to include '${resolvedExpected}'`, "text/plain", "Verification Details");
        console.assert(`✅ Verification passed (partial_text): expected '${actual}' to include '${resolvedExpected}'`);
      }
      return;
    }

    // Handle null/undefined actual values
    const actualString = (actual !== null && actual !== undefined) ? actual.toString() : String(actual);

    if (actualString !== resolvedExpected) {
      console.warn(`❌ Verification failed: expected: '${resolvedExpected}', actual: '${actual}'`);
      await comm.attachLog(`❌ Verification failed: expected: '${resolvedExpected}', actual: '${actual}'`, "text/plain", "Verification Details");
      if (assert) throw new Error(`Verification failed: expected '${resolvedExpected}', but got '${actual}'`);
    } else {
      await comm.attachLog(`✅ Verification passed: expected: '${resolvedExpected}', actual: '${actual}'`, "text/plain", "Verification Details");
      console.assert(`✅ Verification passed: expected: '${resolvedExpected}', actual: '${actual}'`);
    }
  }
}

/**
 * Api: Get last response JSON path value -path: {param} -storeTo: {param}
 * 
 * Get the value at a given JSON path from the last API response body.
 * Example: path = "data[0].id" will return the id of the first item in data array.
 * Supports paths like "x.data[0].id" (where "x" is treated as the root).
 *
 * @param path - JSON path string; supports leading "x." as body alias.
 * @returns The extracted value or undefined if not found.
 * @throws Error if `path` is not a non-empty string.

 */
export async function getLastResponseJsonPathValue(path: string) {
  // Input validation
  if (!path || typeof path !== 'string') {
    throw new Error("Path must be a non-empty string for JSON path extraction.");
  }

  if (isPlaywrightRunner()) {
    return await __allureAny_api.step(
      `Api: Get last response JSON path value -path: ${path}`,
      async () => {
        return await doGetLastResponseJsonPathValue();
      }
    );
  }
  return await doGetLastResponseJsonPathValue();

  async function doGetLastResponseJsonPathValue() {
    const resBody = vars.getValue("playq.api.last.resBody");
    if (!resBody) return undefined;

    const json = JSON.parse(resBody);

    // Remove leading "x." if present
    const normalisedPath = path.startsWith('x.') ? path.slice(2) : path;

    // Simple dot/bracket notation path resolver
    const segments = normalisedPath
  .replace(/^\[(\d+)\]/, '$1')      // handle root array [0]
  .replace(/\[(\d+)\]/g, '.$1')     // handle nested arrays
  .split('.')
  .filter(Boolean);
    let result: any = json;
    for (const seg of segments) {
      if (result == null) return undefined;
      result = result[seg];
    }
    return result;
  }
}

/**
 * Api: Store last response JSON paths to variables -paths: {param} -vars: {param}
 * 
 * Assign multiple values from the last API response body, header, status, or status text to variables.
 * @param pathVarString Comma-separated JSON paths (e.g. "x.data[1].email,h.content-type,s.,t.")
 * @param varKeyString  Comma-separated variable keys (e.g. "var.email,var.contentType,var.status,var.statusText")
 * Prefixes (case-insensitive):
 *   x. / (body). = response body (default if no prefix)
 *   h. / (header). = response header
 *   s / (status) / (statusCode) = response status code
 *   t / (statusText) = response status text
 * Examples:
 *   "x.data[0].id" or "(body).data[0].id" → from body
 *   "h.content-type" or "(header).content-type" → from header
 *   "s" or "(status)" or "(statusCode)" → response status code
 *   "t" or "(statusText)" → response status text
 *   "data[0].id" → from body (default)
 *
 * @throws Error if inputs are missing or the number of paths and variable keys differ.
 */
export async function storeLastResponseJsonPathsToVariables(pathVarString: string, varKeyString: string) {
  // Input validation
  if (!pathVarString || !varKeyString) {
    throw new Error("Both pathVarString and varKeyString must be provided.");
  }

  const execute = async () => {
    const resBody = vars.getValue("playq.api.last.resBody");
    const resHeader = vars.getValue("playq.api.last.resHeader");
    const resStatus = vars.getValue("playq.api.last.resStatus");
    const resStatusText = vars.getValue("playq.api.last.resStatusText");
    if (!resBody && !resHeader && !resStatus && !resStatusText) return;

    const jsonBody = resBody ? JSON.parse(resBody) : {};
    const jsonHeader = resHeader ? JSON.parse(resHeader) : {};

    const paths = pathVarString.split(',').map(s => s.trim());
    const varKeys = varKeyString.split(',').map(s => s.trim());

    if (paths.length !== varKeys.length) {
      throw new Error("Number of paths and variable keys must match.");
    }

    for (let i = 0; i < paths.length; i++) {
      let path = paths[i];
      const varKey = varKeys[i];
      let result: any;

      const lowerPath = path.toLowerCase();

      if (lowerPath.startsWith('h.')) {
        // Header: h.header-name
        const headerKey = path.slice(2).toLowerCase();
        result = Object.entries(jsonHeader).find(([k]) => k.toLowerCase() === headerKey)?.[1];
      } else if (lowerPath.startsWith('(header).')) {
        // Header: (header).header-name
        const headerKey = path.slice(9).toLowerCase();
        result = Object.entries(jsonHeader).find(([k]) => k.toLowerCase() === headerKey)?.[1];
      } else if (lowerPath.startsWith('s') || lowerPath.startsWith('s.')) {
        // Status: s.
        result = resStatus;
      } else if (lowerPath.startsWith('(status)') || lowerPath.startsWith('(statuscode)') || lowerPath.startsWith('(status).') || lowerPath.startsWith('(statuscode).')) {
        // Status: (status).
        result = resStatus;
      } else if (lowerPath.startsWith('t.')) {
        // Status Text: t.
        result = resStatusText;
      } else if (lowerPath.startsWith('(statustext)') || lowerPath.startsWith('(statustext).')) {
        // Status Text: (statusText).
        result = resStatusText;
      } else {
        // Body: x., (body)., or no prefix
        let normalisedPath = path;
        if (lowerPath.startsWith('x.')) normalisedPath = path.slice(2);
        else if (lowerPath.startsWith('(body).')) normalisedPath = path.slice(7);

        const segments = normalisedPath
  .replace(/^\[(\d+)\]/, '$1')      
  .replace(/\[(\d+)\]/g, '.$1')     
  .split('.')
  .filter(Boolean);
        result = jsonBody;
        for (const seg of segments) {
          if (result == null) break;
          result = result[seg];
        }
      }
      if (result !== undefined && result !== null) {
        vars.setValue(varKey, result.toString());
      }
    }
  };

  if (isPlaywrightRunner()) {
    await __allureAny_api.step(
      `Api: Store last response JSON paths to variables -paths: ${pathVarString} -vars: ${varKeyString}`,
      async () => {
        await execute();
      }
    );
  } else {
    await execute();
  }
}

// Internal helper used only by verifyPathValue
function getPathValueInternal(
  path: string,
  sources: { body?: string | object, header?: string | object, status?: string, statusText?: string }
): any {
  const lowerPath = path.toLowerCase();
  const jsonBody = typeof sources.body === "string" && sources.body ? JSON.parse(sources.body) : sources.body || {};
  const jsonHeader = typeof sources.header === "string" && sources.header ? JSON.parse(sources.header) : sources.header || {};

  if (lowerPath.startsWith('h.')) {
    const headerKey = path.slice(2).toLowerCase();
    return Object.entries(jsonHeader).find(([k]) => k.toLowerCase() === headerKey)?.[1];
  }
  if (lowerPath.startsWith('(header).')) {
    const headerKey = path.slice(9).toLowerCase();
    return Object.entries(jsonHeader).find(([k]) => k.toLowerCase() === headerKey)?.[1];
  }
  if (lowerPath === 's' || lowerPath === 's.' || lowerPath.startsWith('s.') || lowerPath.startsWith('(status)') || lowerPath.startsWith('(statuscode)') || lowerPath.startsWith('(status).') || lowerPath.startsWith('(statuscode).')) {
    return sources.status;
  }
  if (lowerPath === 't' || lowerPath === 't.' || lowerPath.startsWith('(statustext)') || lowerPath.startsWith('(statustext).')) {
    return sources.statusText;
  }
  let normalisedPath = path;
  if (lowerPath.startsWith('x.')) normalisedPath = path.slice(2);
  else if (lowerPath.startsWith('(body).')) normalisedPath = path.slice(7);
  const segments = normalisedPath
  .replace(/^\[(\d+)\]/, '$1')      // handle root array [0]
  .replace(/\[(\d+)\]/g, '.$1')     // handle nested arrays
  .split('.')
  .filter(Boolean);
  let result: any = jsonBody;
  for (const seg of segments) {
    if (result == null) return undefined;
    result = result[seg];
  }
  return result;
}

/**
 * Generic internal function to extract a value from a JSON object, header, status, or status text
 * using a flexible path syntax.
 *
 * @param path - Path string with optional prefix (e.g., "x.data[0].id", "h.content-type", "s", "t")
 * @param sources - Object containing { body, header, status, statusText }
 * @returns The extracted value or undefined if not found.
 */
function getPathValue(
  path: string,
  sources: {
    body?: string | object,
    header?: string | object,
    status?: string,
    statusText?: string
  }
): any {
  const lowerPath = path.toLowerCase();

  // Prepare parsed objects
  const jsonBody = typeof sources.body === "string" && sources.body
    ? JSON.parse(sources.body)
    : sources.body || {};
  const jsonHeader = typeof sources.header === "string" && sources.header
    ? JSON.parse(sources.header)
    : sources.header || {};

  if (lowerPath.startsWith('h.')) {
    // Header: h.header-name
    const headerKey = path.slice(2).toLowerCase();
    return Object.entries(jsonHeader).find(([k]) => k.toLowerCase() === headerKey)?.[1];
  }
  if (lowerPath.startsWith('(header).')) {
    // Header: (header).header-name
    const headerKey = path.slice(9).toLowerCase();
    return Object.entries(jsonHeader).find(([k]) => k.toLowerCase() === headerKey)?.[1];
  }
  if (lowerPath === 's' || lowerPath === 's.' ||
    lowerPath.startsWith('s.') ||
    lowerPath.startsWith('(status)') || lowerPath.startsWith('(statuscode)') ||
    lowerPath.startsWith('(status).') || lowerPath.startsWith('(statuscode).')) {
    return sources.status;
  }
  if (lowerPath === 't' || lowerPath === 't.' ||
    lowerPath.startsWith('(statustext)') || lowerPath.startsWith('(statustext).')) {
    return sources.statusText;
  }

  // Body: x., (body)., or no prefix
  let normalisedPath = path;
  if (lowerPath.startsWith('x.')) normalisedPath = path.slice(2);
  else if (lowerPath.startsWith('(body).')) normalisedPath = path.slice(7);

  const segments = normalisedPath
  .replace(/^\[(\d+)\]/, '$1')      // handle root array [0]
  .replace(/\[(\d+)\]/g, '.$1')     // handle nested arrays
  .split('.')
  .filter(Boolean);
  let result: any = jsonBody;
  for (const seg of segments) {
    if (result == null) return undefined;
    result = result[seg];
  }
  return result;
}

/**
 * Api: Get path value from last response -path: {param} -storeTo: {param}
 * 
 * Get a value from the last API response using a flexible path.
 * Supports body, header, status, and statusText via prefixes:
 *  - Body: default or `x.` or `(body).`
 *  - Header: `h.` or `(header).`
 *  - Status code: `s` or `(status)` or `(statusCode)`
 *  - Status text: `t` or `(statusText)`
 *
 * @param path - Path string (e.g., `title`, `x.data[0].id`, `h.content-type`, `s`, `t`)
 * @param options - Optional JSON string or object (reserved)
 * @returns Extracted value or undefined
 * @throws Error if `path` is not a non-empty string
 */
export async function getPathValueFromLastResponse(path: string, options?: string | Record<string, any>) {
  if (!path || typeof path !== 'string') {
    throw new Error("Path must be a non-empty string");
  }
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : options || {};
  const sources = {
    body: vars.getValue("playq.api.last.resBody"),
    header: vars.getValue("playq.api.last.resHeader"),
    status: vars.getValue("playq.api.last.resStatus"),
    statusText: vars.getValue("playq.api.last.resStatusText")
  };
  const stepName = `Api: Get path value from last response -path: ${path} -options: ${JSON.stringify(options_json)}`;
  const run = async () => getPathValue(path, sources);
  if (isPlaywrightRunner()) { return __allureAny_api.step(stepName, run); }
  return run();
}

// Friendly aliases
export const assertValue = verifyValue;
export const assertPathValue = verifyPathValue;
export const storePaths = storeLastResponseJsonPathsToVariables;

/**
 * Api: Extract the entire root-level array from the last API response body.
 * @returns {any[]} The parsed array, or throws if not an array.
 */
export async function getLastResponseArray() {
  const resBody = vars.getValue("playq.api.last.resBody");
  if (!resBody) throw new Error("No last response body found.");
  const arr = JSON.parse(resBody);
  if (!Array.isArray(arr)) throw new Error("Last response body is not an array.");
  return arr;
}

/**
 * Api: Extract a property from each object in the root-level array from the last API response body.
 * @param {string} property - The property name to extract from each object.
 * @returns {any[]} Array of property values.
 */
export async function getPropertyFromLastResponseArray(property: string) {
  const arr = await getLastResponseArray();
  return arr.map(obj => obj && typeof obj === 'object' ? obj[property] : undefined);
}

/**
 * Api: Generic extractor for last response body (array, object, or primitive).
 * If a path is provided, will attempt to extract using dot/bracket notation.
 * If no path is provided, returns the parsed body (array/object/primitive).
 * @param {string} [path] - Optional dot/bracket path (e.g., 'data[0].id').
 * @returns {any} Extracted value or the parsed body.
 */
export async function extractFromLastResponse(path?: string) {
  const resBody = vars.getValue("playq.api.last.resBody");
  if (!resBody) throw new Error("No last response body found.");
  const json = JSON.parse(resBody);
  if (!path) return json;
  // Simple dot/bracket notation path resolver
  const segments = path.replace(/\[(\w+)\]/g, '.$1').split('.').filter(Boolean);
  let result = json;
  for (const seg of segments) {
    if (result == null) return undefined;
    result = result[seg];
  }
  return result;
}

/**
 * Api: Assert last response status code.
 * @param expectedStatus - Expected HTTP status code (string or number).
 * @param options - Optional: { assert: boolean }
 */
export async function verifyStatus(expectedStatus: string | number, options?: string | Record<string, any>) {
  const actual = vars.getValue("playq.api.last.resStatus");
  const expected = String(expectedStatus);
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : options || {};
  const { assert = true } = options_json;
  if (actual !== expected) {
    await comm.attachLog(`❌ Status code mismatch: expected ${expected}, got ${actual}`, "text/plain");
    if (assert) throw new Error(`Status code mismatch: expected ${expected}, got ${actual}`);
  } else {
    await comm.attachLog(`✅ Status code matched: ${expected}`, "text/plain");
  }
}

/**
 * Api: Assert last response header value.
 * @param header - Header name (case-insensitive).
 * @param expectedValue - Expected value (string).
 * @param options - Optional: { assert: boolean, partial_text: boolean }
 */
export async function verifyHeader(header: string, expectedValue: string, options?: string | Record<string, any>) {
  const resHeader = vars.getValue("playq.api.last.resHeader");
  const jsonHeader = resHeader ? JSON.parse(resHeader) : {};
  const actual = Object.entries(jsonHeader).find(([k]) => k.toLowerCase() === header.toLowerCase())?.[1];
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : options || {};
  const { assert = true, partial_text = false } = options_json;
  if (
    partial_text
      ? !(typeof actual === "string" && actual.includes(expectedValue))
      : actual !== expectedValue
  ) {
    await comm.attachLog(`❌ Header mismatch: ${header} expected ${expectedValue}, got ${actual}`, "text/plain");
    if (assert) throw new Error(`Header mismatch: ${header} expected ${expectedValue}, got ${actual}`);
  } else {
    await comm.attachLog(`✅ Header matched: ${header} = ${expectedValue}`, "text/plain");
  }
}

/**
 * Api: Assert last response body matches JSON schema.
 * @param schema - JSON schema object.
 * @param options - Optional: { assert: boolean }
 */
export async function verifySchema(schema: object, options?: string | Record<string, any>) {
  const resBody = vars.getValue("playq.api.last.resBody");
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : options || {};
  const { assert = true } = options_json;
  if (!resBody) throw new Error("No last response body found.");
  const Ajv = require('ajv');
  const ajv = new Ajv();
  const json = JSON.parse(resBody);
  const valid = ajv.validate(schema, json);
  if (!valid) {
    await comm.attachLog(`❌ Schema validation failed: ${JSON.stringify(ajv.errors)}`, "application/json");
    if (assert) throw new Error(`Schema validation failed: ${JSON.stringify(ajv.errors)}`);
  } else {
    await comm.attachLog(`✅ Schema validation passed.`, "text/plain");
  }
}

/**
 * Api: Assert last response is error/timeout (negative test).
 * @param expectedStatus - Expected error status code (string or number).
 * @param options - Optional: { assert: boolean }
 */
export async function verifyError(expectedStatus: string | number, options?: string | Record<string, any>) {
  const actual = vars.getValue("playq.api.last.resStatus");
  const expected = String(expectedStatus);
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : options || {};
  const { assert = true } = options_json;
  if (actual !== expected) {
    await comm.attachLog(`❌ Expected error status ${expected}, got ${actual}`, "text/plain");
    if (assert) throw new Error(`Expected error status ${expected}, got ${actual}`);
  } else {
    await comm.attachLog(`✅ Error status matched: ${expected}`, "text/plain");
  }
}