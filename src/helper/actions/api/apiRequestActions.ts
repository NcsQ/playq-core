/**
 * @file apiRequestActions.ts
 *
 * Provides a unified API for API actions in Playwright and Cucumber frameworks.
 * Supports dynamic config-driven requests, variable interpolation, and assertions.
 *
 * Key Features:
 * - Hybrid context support: Playwright runner and Cucumber world.
 * - Rich options for redirects, timeouts, auth, and type conversions.
 * - Robust error handling and logging aligned with PlayQ standards.
 *
 * Authors: Renish Kozhithottathil [Lead Automation Principal, NCS]
 * Date: 2025-07-01
 * Version: v1.0.0
 *
 * Note: This file adheres to the PlayQ Enterprise Automation Standards.
 */
import axios from "axios";
import type { AxiosResponse } from "axios";
import * as allure from "allure-js-commons";
import path from "path";
import fs from "fs";
import { vars, comm } from "../../../global";
import { test } from "@playwright/test"; 

// Inline runner helpers
function isPlaywrightRunner() { return process.env.TEST_RUNNER === 'playwright'; }
function isCucumberRunner() { return process.env.TEST_RUNNER === 'cucumber'; }
const __allureAny_api: any = allure as any;
if (typeof __allureAny_api.step !== 'function') {
  __allureAny_api.step = async (_name: string, fn: any) => await fn();
}

/**
 * Api: Call api -action: {param} -config: {param} -baseUrl: {param} -options: {param}
 * 
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

  // Input validation
  if (!action || typeof action !== 'string') {
    throw new Error("Action must be a non-empty string.");
  }
  if (!config || typeof config !== 'string') {
    throw new Error("Config must be a non-empty string.");
  }
  if (!baseUrl || typeof baseUrl !== 'string') {
    throw new Error("Base URL must be a non-empty string.");
  }

  const stepName = `Api: Call api -action: ${action} -config: ${config} -baseUrl: ${baseUrl} -options: ${JSON.stringify(options_json)}`;

  if (isPlaywrightRunner()) {
    await test.step(stepName, async () => {
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
    const projectRoot = process.env.PLAYQ_PROJECT_ROOT || process.cwd();
    const candidateTs = path.resolve(projectRoot, 'resources', 'api', `${action}.api.ts`);
    const candidateJs = path.resolve(projectRoot, 'resources', 'api', `${action}.api.js`);
    let actionPath: string;
    if (fs.existsSync(candidateTs)) {
      actionPath = candidateTs;
    } else if (fs.existsSync(candidateJs)) {
      actionPath = candidateJs;
    } else {
      throw new Error(`API config file not found for action '${action}'. Looked for: ${candidateTs} and ${candidateJs}`);
    }

    // const actionPath = require.resolve(`../../../resources/api/${action}.api.ts`);

    const apiModule = await require(actionPath);
    const apiConfig = apiModule.api[config];

    if (!apiConfig) {
      throw new Error(`Config '${config}' not found in ${actionPath}`);
    }

    const reqUrl = vars.replaceVariables(`${baseUrl}${apiConfig.path ?? ""}`);
    const reqMethod = vars.replaceVariables(apiConfig.method ?? "");
    if (!reqMethod || typeof reqMethod !== 'string') {
      throw new Error(`API config '${config}' must specify a valid 'method'.`);
    }
    const reqHeaders = apiConfig.headers
      ? JSON.parse(vars.replaceVariables(JSON.stringify(apiConfig.headers)))
      : {};
    const reqBody = apiConfig.body
      ? JSON.parse(vars.replaceVariables(JSON.stringify(apiConfig.body)))
      : undefined;
    const reqParams = apiConfig.params
      ? JSON.parse(vars.replaceVariables(JSON.stringify(apiConfig.params)))
      : undefined;


    if (reqBody && toNumber) convertJsonNodes(reqBody, "toNumber", toNumber);
    if (reqBody && toBoolean) convertJsonNodes(reqBody, "toBoolean", toBoolean);

    // Attach request details for traceability
    try {
      const reqInfo = {
        method: reqMethod,
        url: reqUrl,
        headers: reqHeaders,
        params: reqParams,
        body: reqBody
      };
      await comm.attachLog(`API Request: ${JSON.stringify(reqInfo)}`, "application/json", "API Request");
    } catch { }

    let response: AxiosResponse;
    if (reqMethod.toUpperCase().trim() == 'GET') {
      response = await axios({
        method: reqMethod,
        url: reqUrl,
        headers: reqHeaders,
        params: reqParams,
        maxRedirects: maxUrlRedirects,
        timeout: maxTimeout,
        validateStatus: () => true,
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
        validateStatus: () => true,
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

    // Attach response details
    try {
      await comm.attachLog(
        `API Response: ${JSON.stringify({ status: resStatus, statusText: resStatusText })}`,
        "text/plain",
        "API Response"
      );
      // Attach compact body header snapshots to avoid huge logs
      await comm.attachLog(resHeader, "application/json", "API Response Headers");
      await comm.attachLog(resBody, "application/json", "API Response Body");
    } catch { }

    if (apiConfig.expectedStatus) {
      if (apiConfig.expectedStatus != resStatus) {
        await comm.attachLog(
          `❌ Status mismatch for '${config}' Expected: '${apiConfig.expectedStatus}' Actual: '${resStatus}'`,
          "text/plain",
          "API Verification"
        );
        throw new Error(
          `Api Response for '${config}' Expected: '${apiConfig.expectedStatus}' Actual: '${resStatus}'`
        );
      } else {
        await comm.attachLog(
          `✅ Status matched for '${config}': '${resStatus}'`,
          "text/plain",
          "API Verification"
        );
      }
    }
  }
}

/**
 * Converts specific JSON node values within an object based on provided keys.
 * Supports nested keys using dot notation, e.g., "payment.arreasFlag".
 *
 * @param obj - The JSON object to mutate (in-place). If undefined, no-op.
 * @param type - Conversion type: "toNumber" or "toBoolean".
 * @param keys - Comma-separated list of keys to convert.
 */
function convertJsonNodes(obj: any, type: "toNumber" | "toBoolean", keys: string) {
  if (!obj || !keys || typeof keys !== 'string') return;
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
 * Api: Get -action: {param} -config: {param} -baseUrl: {param} -options: {param}
 * 
 * Sends a GET-style request using an API config. Alias of `callApi`.
 *
 * @param action - API action name.
 * @param config - Config key within the action module.
 * @param baseUrl - Base URL for the request.
 * @param options - Additional options forwarded to `callApi`.
 */
export async function get(action: string, config: string, baseUrl: string, options?: string | Record<string, any>) {
  return callApi(action, config, baseUrl, options);
}

/**
 * Api: Post -action: {param} -config: {param} -baseUrl: {param} -options: {param}
 * 
 * Sends a POST-style request using an API config. Alias of `callApi`.
 *
 * @param action - API action name.
 * @param config - Config key within the action module.
 * @param baseUrl - Base URL for the request.
 * @param options - Additional options forwarded to `callApi`.
 */
export async function post(action: string, config: string, baseUrl: string, options?: string | Record<string, any>) {
  return callApi(action, config, baseUrl, options);
}

/**
 * Api: Request -action: {param} -config: {param} -baseUrl: {param} -options: {param}
 * 
 * Sends a request (generic wrapper). Alias of `callApi`.
 *
 * @param action - API action name.
 * @param config - Config key within the action module.
 * @param baseUrl - Base URL for the request.
 * @param options - Additional options forwarded to `callApi`.
 */
export async function request(action: string, config: string, baseUrl: string, options?: string | Record<string, any>) {
  return callApi(action, config, baseUrl, options);
}

/**
 * Api: Put -action: {param} -config: {param} -baseUrl: {param} -options: {param}
 * Sends a PUT-style request using an API config. Alias of callApi.
 */
export async function put(action: string, config: string, baseUrl: string, options?: string | Record<string, any>) {
  return callApi(action, config, baseUrl, { ...(typeof options === 'string' ? vars.parseLooseJson(options) : options || {}), method: 'PUT' });
}

/**
 * Api: Patch -action: {param} -config: {param} -baseUrl: {param} -options: {param}
 * Sends a PATCH-style request using an API config. Alias of callApi.
 */
export async function patch(action: string, config: string, baseUrl: string, options?: string | Record<string, any>) {
  return callApi(action, config, baseUrl, { ...(typeof options === 'string' ? vars.parseLooseJson(options) : options || {}), method: 'PATCH' });
}

/**
 * Api: Delete -action: {param} -config: {param} -baseUrl: {param} -options: {param}
 * Sends a DELETE-style request using an API config. Alias of callApi.
 */
export async function del(action: string, config: string, baseUrl: string, options?: string | Record<string, any>) {
  return callApi(action, config, baseUrl, { ...(typeof options === 'string' ? vars.parseLooseJson(options) : options || {}), method: 'DELETE' });
}

/**
 * Api: Send request -method: {param} -action: {param} -config: {param} -baseUrl: {param} -options: {param}
 * 
 * Sends an HTTP request using the specified method and API config.
 * @param method - HTTP method (GET, POST, PUT, PATCH, DELETE, etc.)
 * @param action - API action name.
 * @param config - Config key within the action module.
 * @param baseUrl - Base URL for the request.
 * @param options - Additional options forwarded to callApi.
 */
export async function sendRequest(method: string, action: string, config: string, baseUrl: string, options?: string | Record<string, any>) {
  return callApi(action, config, baseUrl, { ...(typeof options === 'string' ? vars.parseLooseJson(options) : options || {}), method });
}
