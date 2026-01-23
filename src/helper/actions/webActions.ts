/**
 * @file webActions.ts
 *
 * Unified web actions bridging Playwright and Cucumber.
 * Provides navigation, interaction, validation, and reporting helpers.
 *
 * Key Features:
 * - Hybrid context: Playwright Runner (page) and Cucumber World (webFixture)
 * - Rich options for screenshots, timeouts, locators, and assertions
 * - Robust error handling, logging, and Allure-compatible step wrappers
 *
 * Authors: Renish Kozhithottathil [Lead Automation Principal, NCS]
 * Version: v1.0.0
 *
 * Note: This file adheres to the PlayQ Enterprise Automation Standards.
 */

export * from "./web/alertActions";
export * from "./web/cookieActions";
export * from "./web/downloadActions";
export * from "./web/elementReaderActions";
export * from "./web/formActions";
export * from "./web/iframeActions";
export * from "./web/javascriptActions";
export * from "./web/keyboardActions";
export * from "./web/localStorageActions";
export * from "./web/mouseActions";
export * from "./web/reportingActions";
export * from "./web/screenshotActions";
export * from "./web/testDataActions";
export * from "./web/validationActions";
export * from "./web/waitActions";
export * from "./web/webNavigation";