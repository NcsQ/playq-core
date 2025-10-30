export function isPlaywrightRunner() {
  return process.env.TEST_RUNNER === 'playwright';
}

export function isCucumberRunner() {
  return process.env.TEST_RUNNER === 'cucumber';
}