// Support both TEST_RUNNER (legacy) and PLAYQ_RUNNER (env used in npm scripts)
function getRunnerEnv(): string | undefined {
  return (
    process.env.TEST_RUNNER || process.env.PLAYQ_RUNNER || process.env.PLAYQ_RUNNER?.toLowerCase()
  );
}

export function isPlaywrightRunner() {
  const runner = (process.env.TEST_RUNNER || process.env.PLAYQ_RUNNER || "").toLowerCase();
  return runner === "playwright";
}

export function isCucumberRunner() {
  const runner = (process.env.TEST_RUNNER || process.env.PLAYQ_RUNNER || "").toLowerCase();
  return runner === "cucumber";
}