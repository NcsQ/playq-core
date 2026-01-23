/**
 * @file reportingActions.ts
 *
 * Lightweight reporting helpers for PlayQ web actions.
 * Attaches info/pass/fail messages to the test report via comm fixture.
 *
 * Authors: PlayQ Team
 * Version: v1.0.0
 */
import { comm } from "../../../global";

/**
 * Web: Log Info -message: {param}
 *
 * Attaches an informational log message to the test report.
 *
 * @param message - Message to attach
 */
export async function logInfo(message: string) { await comm.attachLog(message, 'text/plain', 'INFO'); }

/**
 * Web: Log Pass -message: {param}
 *
 * Attaches a success log message to the test report.
 *
 * @param message - Message to attach
 */
export async function logPass(message: string) { await comm.attachLog(`✅ ${message}`, 'text/plain', 'PASS'); }

/**
 * Web: Log Fail -message: {param}
 *
 * Attaches a failure log message to the test report.
 *
 * @param message - Message to attach
 */
export async function logFail(message: string) { await comm.attachLog(`❌ ${message}`, 'text/plain', 'FAIL'); }

/**
 * Web: Assert -condition: {param} -message: {param}
 *
 * Asserts a condition and logs pass/fail. Throws on failure.
 *
 * @param condition - Condition to assert
 * @param message - Optional message to include in logs and error
 */
export async function assert(condition: boolean, message?: string) {
  if (!condition) { await logFail(message || 'Assertion failed'); throw new Error(message || 'Assertion failed'); }
  await logPass(message || 'Assertion passed');
}

// Friendly aliases
export const assertLog = assert;
