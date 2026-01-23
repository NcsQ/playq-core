import { Given, When, Then } from "@cucumber/cucumber";
import { api, vars } from "../../global";

/**
 * API Step Definitions
 *
 * Cucumber step patterns for API request and validation actions.
 * Mirrors the functions in apiRequestActions.ts and apiValidationActions.ts.
 */


Given("Api: Call api -action: {param} -config: {param} -baseUrl: {param} -options: {param}", async function (action: string, config: string, baseUrl: string, options?: string) {
  await api.callApi(action, config, baseUrl, options);
});

Given("Api: Get -action: {param} -config: {param} -baseUrl: {param} -options: {param}", async function (action: string, config: string, baseUrl: string, options?: string) {
  await api.get(action, config, baseUrl, options);
});

Given("Api: Post -action: {param} -config: {param} -baseUrl: {param} -options: {param}", async function (action: string, config: string, baseUrl: string, options?: string) {
  await api.post(action, config, baseUrl, options);
});

Given("Api: Request -action: {param} -config: {param} -baseUrl: {param} -options: {param}", async function (action: string, config: string, baseUrl: string, options?: string) {
  await api.request(action, config, baseUrl, options);
});

Given("Api: Put -action: {param} -config: {param} -baseUrl: {param} -options: {param}", async function (action: string, config: string, baseUrl: string, options?: string) {
  await api.put(action, config, baseUrl, options);
});

Given("Api: Patch -action: {param} -config: {param} -baseUrl: {param} -options: {param}", async function (action: string, config: string, baseUrl: string, options?: string) {
  await api.patch(action, config, baseUrl, options);
});

Given("Api: Delete -action: {param} -config: {param} -baseUrl: {param} -options: {param}", async function (action: string, config: string, baseUrl: string, options?: string) {
  await api.del(action, config, baseUrl, options);
});

Given("Api: Send request -method: {param} -action: {param} -config: {param} -baseUrl: {param} -options: {param}", async function (method: string, action: string, config: string, baseUrl: string, options?: string) {
  await api.sendRequest(method, action, config, baseUrl, options);
});

Given("Api: Verify value -actual: {param} -expected: {param} -options: {param}", async function (actual: string, expected: string, options?: string) {
  await api.verifyValue(actual, expected, options);
});

Given("Api: Assert value -actual: {param} -expected: {param} -options: {param}", async function (actual: string, expected: string, options?: string) {
  await api.assertValue(actual, expected, options);
});

Given("Api: Verify api path value in last response -path: {param} -expected: {param} -options: {param}", async function (path: string, expected: string, options?: string) {
  await api.verifyPathValue(path, expected, options);
});

Given("Api: Assert api path value -path: {param} -expected: {param} -options: {param}", async function (path: string, expected: string, options?: string) {
  await api.assertPathValue(path, expected, options);
});

Given("Api: Get last response JSON path value -path: {param} -storeTo: {param}", async function (pathExpr: string, varName: string) {
  const value = await api.getLastResponseJsonPathValue(pathExpr);
  if (value !== undefined && value !== null) {
    vars.setValue(varName, String(value));
  }
});

Given("Api: Store last response JSON paths to variables -paths: {param} -vars: {param}", async function (paths: string, varsCsv: string) {
  await api.storeLastResponseJsonPathsToVariables(paths, varsCsv);
});

Given("Api: Get path value from last response -path: {param} -storeTo: {param}", async function (pathExpr: string, varName: string) {
  const value = await api.getPathValueFromLastResponse(pathExpr);
  if (value !== undefined && value !== null) {
    vars.setValue(varName, String(value));
  }
});

Given("Api: Store paths -paths: {param} -vars: {param}", async function (paths: string, varsCsv: string) {
  await api.storePaths(paths, varsCsv);
});
