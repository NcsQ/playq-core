/**
 * @file apiActions.ts
 *
 * Provides a unified API for api actions in Playwright and Cucumber frameworks.
 * Supports navigation, interaction, and verification across both runners.
 *
 * Key Features:
 * - Supports hybrid context: Playwright Runner (`page`) and Cucumber World (`webFixture`).
 * - Rich options for screenshots, timeouts, locators, and assertions.
 * - Enterprise-ready design with robust error handling, logging, and extensibility.
 *
 * Authors: Renish Kozhithottathil [Lead Automation Principal, NCS]
 * Date: 2025-07-01
 * Version: v1.0.0
 *
 * Note: This file adheres to the PlayQ Enterprise Automation Standards.
 */

import axios from "axios";
import type { AxiosResponse } from "axios";
import { vars,comm } from "@playq";
import * as allure from "allure-js-commons";
import { isCucumberRunner, isPlaywrightRunner } from "@config/runner";



/**
 * Calls a predefined API action using configuration from a resource file, supporting dynamic variable replacement,
 * custom headers, body, parameters, authentication, and assertion of expected status codes.
 * 
 * This function is designed for hybrid Playwright/Cucumber test frameworks, enabling enterprise-grade API testing
 * with robust error handling and flexible options.
 *
 * @param action - The API action name (corresponds to a file in `resources/api/{action}.api.ts`).
 * @param config - The configuration key within the API module (e.g., "success", "errorCase").
 * @param baseUrl - The base URL for the API endpoint.
 * @param options - Optional. Additional options as a JSON string or object. Supports:
 *   - `maxUrlRedirects`: Maximum number of redirects (default: from config or 5).
 *   - `maxTimeout`: Request timeout in milliseconds (default: from config or 10000).
 *   - `auth`: Axios authentication object.
 *   - Any other Axios request config options.
 *
 * @throws Error if the API config is not found or if the response status does not match `expectedStatus` in config.
 *
 * @example
 * // Example API config file: resources/api/user.api.ts
 * export const api = {
 *   getUser: {
 *     path: "/users/{userId}",
 *     method: "GET",
 *     headers: { "Authorization": "Bearer ${token}" },
 *     expectedStatus: "200"
 *   }
 * };
 *
 * // Usage in test:
 * await callApi(
 *   "user", 
 *   "getUser", 
 *   "https://api.example.com", 
 *   { userId: "123", token: "abc123" }
 * );
 *
 * @example
 * // With options as a JSON string:
 * await callApi(
 *   "user",
 *   "getUser",
 *   "https://api.example.com",
 *   '{"userId":"123","token":"abc123","maxTimeout":5000}'
 * );
 *
 * @example
 * // With custom authentication:
 * await callApi(
 *   "user",
 *   "getUser",
 *   "https://api.example.com",
 *   { auth: { username: "admin", password: "secret" } }
 * );
 */
export async function callApi(action: string, config: string, baseUrl: string, options?: string | Record<string, any>) {
  const options_json =
    typeof options === "string" ? vars.parseLooseJson(options) : options || {};
  const {
    maxUrlRedirects = Number(vars.getConfigValue("apiTest.maxUrlRedirects")) || 5, // Axios defalt is 5
    maxTimeout = Number(vars.getConfigValue("apiTest.timeout")) || 10000,
    auth,
    toNumber = undefined,
    toBoolean = undefined,
  } = options_json ?? {};

  if (isPlaywrightRunner()) {
    await allure.step(`Api: Call api -action: ${action} -config: ${config} -baseUrl: ${baseUrl} -options: ${JSON.stringify(options_json)}`,
      async () => {
        await doCallApi();
      });
  } else {
    await doCallApi();
  }

  async function doCallApi() {
    // Dynamic import of the module
    vars.setValue("internal.api.last.resStatus", "");
    vars.setValue("internal.api.last.resStatusText", "");
    vars.setValue("internal.api.last.resHeader", "");
    vars.setValue("internal.api.last.resBody", "");

    const actionPath = require.resolve(`../../../resources/api/${action}.api.ts`);

    const apiModule = await require(actionPath);
    const apiConfig = apiModule.api[config];

    if (!apiConfig) {
      throw new Error(`Config '${config}' not found in ${actionPath}`);
    }

    const reqUrl = vars.replaceVariables(`${baseUrl}${apiConfig.path ?? ""}`);
    const reqMethod = vars.replaceVariables(apiConfig.method ?? "");
    const reqHeaders = apiConfig.headers
      ? JSON.parse(vars.replaceVariables(JSON.stringify(apiConfig.headers)))
      : {};
    const reqBody = apiConfig.body
      ? JSON.parse(vars.replaceVariables(JSON.stringify(apiConfig.body)))
      : undefined;
    const reqParams = apiConfig.params
      ? JSON.parse(vars.replaceVariables(JSON.stringify(apiConfig.params)))
      : undefined;


    if (toNumber) convertJsonNodes(reqBody, "toNumber", toNumber);
    if (toBoolean) convertJsonNodes(reqBody, "toBoolean", toBoolean);

    let response: AxiosResponse;
    if (reqMethod.toUpperCase().trim() == 'GET') {
      response = await axios({
        method: reqMethod,
        url: reqUrl,
        headers: reqHeaders,
        params: reqParams,
        maxRedirects: maxUrlRedirects,
        timeout: maxTimeout,
        auth
      });
    } else {
      response = await axios({
        method: reqMethod,
        url: reqUrl,
        headers: reqHeaders,
        data: reqBody,
        maxRedirects: maxUrlRedirects,
        timeout: maxTimeout,
        auth
      });
    }

    const resStatus = (await response).status.toString();
    const resStatusText = (await response).statusText;
    const resHeader = JSON.stringify((await response).headers);
    const resBody = JSON.stringify((await response).data);

    vars.setValue("playq.api.last.resStatus", resStatus);
    vars.setValue("playq.api.last.resStatusText", resStatusText);
    vars.setValue("playq.api.last.resHeader", resHeader);
    vars.setValue("playq.api.last.resBody", resBody);

    // This console is to show the api response.
    console.log("API Response:", {
      status: resStatus,
      statusText: resStatusText,
      headers: resHeader,
      body: resBody
    });

    if (apiConfig.expectedStatus) {
      if (apiConfig.expectedStatus != resStatus)
        throw new Error(
          `Api Response for '${config}' Expected: '${apiConfig.expectedStatus}' Actual: '${resStatus}'`
        );
    }
  }
}


/**
 * Get the value at a given JSON path from the last API response body.
 * Example: path = "data[0].id" will return the id of the first item in data array.
 * Supports paths like "x.data[0].id" (where "x" is treated as the root).

 */
export async function getLastResponseJsonPathValue(path: string) {
  const resBody = vars.getValue("playq.api.last.resBody");
  if (!resBody) return undefined;

  const json = JSON.parse(resBody);

     // Remove leading "x." if present
  const normalisedPath = path.startsWith('x.') ? path.slice(2) : path;

  // Simple dot/bracket notation path resolver
  const segments = normalisedPath.replace(/\[(\w+)\]/g, '.$1').split('.').filter(Boolean);
  let result: any = json;
  for (const seg of segments) {
    if (result == null) return undefined;
    result = result[seg];
  }
  return result;
}

/**
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
 */
export async function storeLastResponseJsonPathsToVariables(pathVarString: string, varKeyString: string) {
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

      const segments = normalisedPath.replace(/\[(\w+)\]/g, '.$1').split('.').filter(Boolean);
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
}


/**
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

  if (isPlaywrightRunner()) {
    await allure.step(`Api: Verify value -actual: ${resolvedActual} -expected: ${resolvedExpected} -options: ${JSON.stringify(options_json)}`,
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
        if (assert) throw new Error(`Verification failed (partial_text): expected '${resolvedActual}' to include '${resolvedExpected}'`);
      } else {
        console.info(`✅ Verification passed (partial_text): expected '${resolvedActual}' to include '${resolvedExpected}'`);
      }
      return;
    }
    if (resolvedActual !== resolvedExpected) {
      console.warn(`❌ Verification failed: expected: '${resolvedExpected}', actual: '${resolvedActual}'`);
      if (assert) throw new Error(`Verification failed: expected '${resolvedExpected}', but got '${resolvedActual}'`);
    } else {
      console.info(`✅ Verification passed: expected: '${resolvedExpected}', actual: '${resolvedActual}'`);
    }
  }

}

/**
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

  const sources = {
    body: vars.getValue("playq.api.last.resBody"),
    header: vars.getValue("playq.api.last.resHeader"),
    status: vars.getValue("playq.api.last.resStatus"),
    statusText: vars.getValue("playq.api.last.resStatusText")
  };

  let actual: any;
  let allureMsg = ""
  if (isPlaywrightRunner()) {
    await allure.step(`Api: Verify api path value in last response -path: ${path} -expected: ${resolvedExpected} -options: ${JSON.stringify(options_json)}`,
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
      if (assert) throw new Error(`Verification failed: expected '${resolvedExpected}', but got '${actual}'`);
    } else {
      await comm.attachLog(`✅ Verification passed: expected: '${resolvedExpected}', actual: '${actual}'`, "text/plain", "Verification Details");
      console.assert(`✅ Verification passed: expected: '${resolvedExpected}', actual: '${actual}'`);
    }
  }
}


function convertJsonNodes(obj: any, type: "toNumber" | "toBoolean", keys: string) {
  const keyList = keys.split(',').map(k => k.trim());
  for (const key of keyList) {
    // Support nested keys like "payment.arreasFlag"
    const path = key.split('.');
    let ref = obj;
    for (let i = 0; i < path.length - 1; i++) {
      if (ref[path[i]] === undefined) break;
      ref = ref[path[i]];
    }
    const lastKey = path[path.length - 1];
    if (ref && ref[lastKey] !== undefined) {
      if (type === "toNumber") ref[lastKey] = Number(ref[lastKey]);
      if (type === "toBoolean") ref[lastKey] = ref[lastKey] === "true" || ref[lastKey] === true;
    }
  }
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

  const segments = normalisedPath.replace(/\[(\w+)\]/g, '.$1').split('.').filter(Boolean);
  let result: any = jsonBody;
  for (const seg of segments) {
    if (result == null) return undefined;
    result = result[seg];
  }
  return result;
}
