/**
 * @file commActions.ts
 *
 * Communication actions gateway for logging, attachments, and utilities.
 * Exposes a stable public surface while implementations live under ./comm/*.
 *
 * Key Features:
 * - Allure-friendly logging and attachment helpers
 * - Error context utilities for diagnostics
 * - Backward-compatible re-exports via gateway
 *
 * Authors: Renish Kozhithottathil [Lead Automation Principal, NCS]
 * Version: v1.0.0
 *
 * Note: This file adheres to the PlayQ Enterprise Automation Standards.
 */
export * from './comm/commonActions';
export * from './comm/utilityActions';
