import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { execSync } from 'child_process';
import yargs from 'yargs';

const args = yargs(process.argv).argv as any;
const runnerName = args.runner;

if (!runnerName) {
  console.error('❌ Missing --runner=<name>');
  process.exit(1);
}

const runnerPath = path.resolve(`./resources/runners/${runnerName}.run.json`);
if (!fs.existsSync(runnerPath)) {
  console.error(`❌ Runner file not found: ${runnerPath}`);
  process.exit(1);
}

const runnerConfig = JSON.parse(fs.readFileSync(runnerPath, 'utf-8'));
const { runType, runs } = runnerConfig;

execSync('npm run pretest:playwright', { stdio: 'inherit' });

async function runOneTest(config: any) {
const env = config.env ? config.env : ''
const grep = config.grep ? `--grep="${config.grep}"` : '';
//   const env = config.env ? `--env="${config.env}"` : '';
  const prj = config.project ? `--project=${config.project}"` : '';

  const command = `npx playwright test --config=config/playwright/playwright.config.js ${grep} ${prj}`;
  console.log(`🔹 Running: ${command}`);
  const result = spawnSync(command, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, TEST_RUNNER: "playwright", RUN_ENV: env }
    // env: { ...process.env }
  });

  if (result.status !== 0) {
    console.error(`❌ Test failed: ${grep}`);
    process.exit(result.status);
  }
}

async function runTests() {
  if (runType === 'sequential') {
    for (const run of runs) {
      await runOneTest(run);
    }
  } else if (runType === 'parallel') {
    const promises = runs.map(run =>
      new Promise((resolve, reject) => {
        const env = run.env ? run.env : ''
        const grep = run.grep ? `--grep="${run.grep}"` : '';
        // const env = run.env ? `--env="${run.env}"` : '';
        const prj = run.project ? `--project=${run.project}"` : '';
  const command = `npx playwright test --config=config/playwright/playwright.config.js ${grep} ${prj}`;

        const proc = spawnSync(command, {
          stdio: 'inherit',
          shell: true,
          env: { ...process.env, TEST_RUNNER: "playwright", RUN_ENV: env }
        });

        if (proc.status !== 0) {
          reject(new Error(`Failed: ${command}`));
        } else {
          resolve(true);
        }
      })
    );

    try {
      await Promise.all(promises);
    } catch (err) {
      console.error('❌ One or more test batches failed.');
      process.exit(1);
    }
  } else {
    console.error(`❌ Unknown runType: ${runType}`);
    process.exit(1);
  }
}

runTests().then(() => {
  execSync('npm run posttest:playwright', { stdio: 'inherit' });
  console.log('✅ All test runs completed.');
  process.exit(0);
});