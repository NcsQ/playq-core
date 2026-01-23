const { spawn } = require('child_process');
const minimist = require('minimist');

console.log("🧪 CLI args raw in runnerCuke:", process.argv);

const argsFromCLI = minimist(process.argv.slice(2));

console.log("🧪 CLI args received:", argsFromCLI);
console.log("🔍 Resolved variables:");
console.log("  - TEST_RUNNER:", process.env.TEST_RUNNER || 'cucumber');
console.log("  - TAGS:", 
  argsFromCLI.tags ||
  argsFromCLI.tag ||
  argsFromCLI.TAGS ||
  process.env.TAGS ||
  process.env.npm_config_TAGS ||
  ''
);
console.log("  - ENV:", argsFromCLI.env || process.env.ENV || process.env.npm_config_ENV || '');
console.log("  - GREP:", argsFromCLI.grep || process.env.npm_config_GREP || '');

const TEST_RUNNER = process.env.TEST_RUNNER || 'cucumber';

// const tag =
//   argsFromCLI.tags ||
//   argsFromCLI.tag ||
//   argsFromCLI.TAGS ||
//   process.env.TAGS ||
//   process.env.npm_config_TAGS ||
//   '';
// const env = argsFromCLI.env || process.env.ENV || process.env.npm_config_ENV || '';
// const grep = argsFromCLI.grep || process.env.npm_config_GREP || '';

const tag = argsFromCLI.tags || argsFromCLI.tag || '';
const env = argsFromCLI.env || '';
const grep = argsFromCLI.grep || '';

// Set environment variables for downstream use
process.env.TAGS = tag;
process.env.ENV = env;
process.env.GREP = grep;

console.log(`🔧 TEST_RUNNER: ${TEST_RUNNER}`);
console.log(`🌍 ENV: ${env}`);
console.log(`🏷️ TAGS used: "${tag}"`);
console.log(`🔍 GREP: ${grep}`);

let run;

  const cucumberArgs = ['cucumber-js', '--config', 'cucumber.js', '--profile', 'default'];
  if (tag) cucumberArgs.push('--tags', tag);
  console.log(`🚀 Running Cucumber with args: ${cucumberArgs.join(' ')}`);
  console.log("📦 Final Cucumber command:", `npx ${cucumberArgs.join(' ')}`);

  run = spawn('npx', cucumberArgs, {
    stdio: 'inherit',
    env: { ...process.env, RUN_ENV: env },
    shell: true
  });

// if (TEST_RUNNER === 'cucumber') {
//   const cucumberArgs = ['cucumber-js', '--config', 'cucumber.js', '--profile', 'default'];
//   if (tag) cucumberArgs.push('--tags', tag);
//   console.log(`🚀 Running Cucumber with args: ${cucumberArgs.join(' ')}`);
//   console.log("📦 Final Cucumber command:", `npx ${cucumberArgs.join(' ')}`);

//   run = spawn('npx', cucumberArgs, {
//     stdio: 'inherit',
//     env: { ...process.env, ENV: env },
//     shell: true
//   });

// } else if (TEST_RUNNER === 'playwright') {
//   const pwArgs = ['playwright', 'test', '--config=config/playwright/playwright.config.ts'];
//   if (grep) pwArgs.push('--grep', grep);

//   console.log("📦 Final Playwright command:", `npx ${pwArgs.join(' ')}`);

//   run = spawn('npx', pwArgs, {
//     stdio: 'inherit',
//     env: { ...process.env, ENV: env },
//     shell: true
//   });

// } else {
//   console.error(`❌ Unknown TEST_RUNNER: ${TEST_RUNNER}`);
//   process.exit(1);
// }

run.on('close', code => process.exit(code));