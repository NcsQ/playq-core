export default [
  // baseUrl
  {
    "name": "config.baseUrl",
    "value": "https://your-app.com",
    "description": "Base URL for the application",
  },

  // cucumber
  {
    "name": "config.cucumber.featureFileCache",
    "value": "false",
    "description": "Cache feature files for faster execution",
  },
  {
    "name": "config.cucumber.stepGroupCache",
    "value": "true",
    "description": "Cache step groups during execution",
  },

  // browser
  {
    "name": "config.browser.playwrightSession",
    "value": "shared",
    "description": "Playwright browser session control",
  },
  {
    "name": "config.browser.cucumberSession",
    "value": "perScenario",
    "description": "Cucumber browser session control",
  },
  {
    "name": "config.browser.headless",
    "value": "true",
    "description": "Run browser in headless mode",
  },
  {
    "name": "config.browser.browserType",
    "value": "chromium",
    "description": "Browser type: chromium, firefox or webkit",
  },

  // artifacts
  {
    "name": "config.artifacts.screenshot",
    "value": "true",
    "description": "Capture screenshots",
  },
  {
    "name": "config.artifacts.video",
    "value": "true",
    "description": "Capture videos",
  },
  {
    "name": "config.artifacts.trace",
    "value": "true",
    "description": "Capture Playwright traces",
  },
  {
    "name": "config.artifacts.onFailureOnly",
    "value": "true",
    "description": "Capture artifacts only on failure",
  },
  {
    "name": "config.artifacts.onSuccessOnly",
    "value": "false",
    "description": "Capture artifacts only on success",
  },
  {
    "name": "config.artifacts.cleanUpBeforeRun",
    "value": "true",
    "description": "Clean up artifacts before run",
  },

  // testExecution
  {
    "name": "config.testExecution.timeout",
    "value": "80000",
    "description": "Test execution timeout",
  },
  {
    "name": "config.testExecution.actionTimeout",
    "value": "10000",
    "description": "Action timeout in milliseconds",
  },
  {
    "name": "config.testExecution.navigationTimeout",
    "value": "20000",
    "description": "Navigation timeout in milliseconds",
  },
  {
    "name": "config.testExecution.retryOnFailure",
    "value": "true",
    "description": "Retry tests on failure",
  },
  {
    "name": "config.testExecution.parallel",
    "value": "true",
    "description": "Run tests in parallel",
  },
  {
    "name": "config.testExecution.maxInstances",
    "value": "5",
    "description": "Maximum parallel test instances",
  },
  {
    "name": "config.testExecution.maxRetries",
    "value": "2",
    "description": "Maximum number of retries",
  },
  {
    "name": "config.testExecution.retryDelay",
    "value": "1000",
    "description": "Delay between retries in milliseconds",
  },
  {
    "name": "config.testExecution.retryInterval",
    "value": "2000",
    "description": "Interval between retries in milliseconds",
  },
  {
    "name": "config.testExecution.retryTimeout",
    "value": "30000",
    "description": "Total retry timeout in milliseconds",
  },
  {
    "name": "config.testExecution.order",
    "value": "sequential",
    "description": "Test execution order",
  },

  // apiTest
  {
    "name": "config.apiTest.maxUrlRedirects",
    "value": "5",
    "description": "Maximum number of URL redirects",
  },
  {
    "name": "config.apiTest.timeout",
    "value": "10000",
    "description": "API request timeout in milliseconds",
  },

  // patternIq
  {
    "name": "config.patternIq.enable",
    "value": "false",
    "description": "Enable PatternIQ",
  },
  {
    "name": "config.patternIq.config",
    "value": "default",
    "description": "PatternIQ configuration source",
  },
  {
    "name": "config.patternIq.retryInterval",
    "value": "2000",
    "description": "PatternIQ retry interval in milliseconds",
  },
  {
    "name": "config.patternIq.retryTimeout",
    "value": "30000",
    "description": "PatternIQ total retry timeout in milliseconds",
  },

  // smartAi
  {
    "name": "config.smartAi.enable",
    "value": "false",
    "description": "Enable SmartAI",
  },
  {
    "name": "config.smartAi.consoleLog",
    "value": "true",
    "description": "Log SmartAI actions to console",
  },
  {
    "name": "config.smartAi.resolve",
    "value": "smart",
    "description": "SmartAI resolution mode",
  },

  
  // report
  {
    "name": "report.allure.singleFile",
    "value": "false",
    "description": "Enable Allure single file report",
  },
  // featureFlags
  {
    "name": "config.featureFlags.enableBetaUI",
    "value": "true",
    "description": "Enable Beta UI",
  },
  {
    "name": "config.featureFlags.useMockBackend",
    "value": "false",
    "description": "Use mock backend",
  },

  // supportedLanguages
  {
    "name": "config.supportedLanguages",
    "value": "en,fr,es",
    "description": "Supported languages",
  },
];
