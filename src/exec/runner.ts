import { spawnSync, execSync, spawn } from 'child_process';
import minimist from 'minimist';
import { loadEnv } from '../helper/bundle/env';
import os from 'os';
import path from 'path';
import { ne } from '@faker-js/faker/.';

// loadEnv();
// console.log('  - Runner (PLAYQ_ENV):', process.env.PLAYQ_ENV );
// console.log('  - Runner (PLAYQ_RUNNER):', process.env.PLAYQ_RUNNER );
// console.log('  - Runner (PLAYQ_GREP):', process.env.PLAYQ_GREP );
// console.log('  - Runner (PLAYQ_TAGS):', process.env.PLAYQ_TAGS );
// console.log('  - Runner (PLAYQ_PROJECT):', process.env.PLAYQ_PROJECT );
// console.log('  - Env (RUNNER - cc_card_type):', process.env['cc_card_type']);
// console.log('  - Env (RUNNER - config.testExecution.timeout):', process.env['config.testExecution.timeout'] );

if (process.env.PLAYQ_RUNNER && process.env.PLAYQ_RUNNER === 'cucumber') {
  loadEnv();
  const cucumberArgs = [
    'cucumber-js',
    '--config',
    'cucumber.js',
    '--profile',
    'default',
  ];
  if (process.env.PLAYQ_TAGS) cucumberArgs.push('--tags', process.env.PLAYQ_TAGS);

  const run = spawn('npx', cucumberArgs, {
    stdio: 'inherit',
    env: { ...process.env },
    shell: true,
  });

  run.on('close', (code) => {
    execSync('npm run posttest:cucumber', { stdio: 'inherit' });
    // Set exit code but let npm handle posttest
    if (code !== 0) {
      process.exitCode = code;
    }
  });
} else {
  if (process.env.PLAYQ_RUN_CONFIG) {
    // Dynamically import the run_config object from the specified run config file
    // Look for run config in the user's project root
    const runConfigPath = path.resolve(process.cwd(), `resources/run-configs/${process.env.PLAYQ_RUN_CONFIG}.run`);
    const runConfig = require(runConfigPath).default;
    console.log('🌐 Running with runConfig:', JSON.stringify(runConfig));
    for (const cfg of runConfig.runs) {

      console.log(`    - Running test with grep: ${cfg.PLAYQ_GREP}, env: ${cfg.PLAYQ_ENV}`);
      Object.keys(cfg).forEach(key => {
        if (key.trim() == 'PLAYQ_RUNNER') throw new Error('PLAYQ_RUNNER is not allowed in run configs');
        process.env[key] = cfg[key];
        console.log(`Setting ${key} = ${cfg[key]}`);
      });
      loadEnv();
      const command = `npx playwright test --config=config/playwright/playwright.config.ts${process.env.PLAYQ_GREP ? ` --grep="${process.env.PLAYQ_GREP}"` : ''
        }${process.env.PLAYQ_PROJECT ? ` --project="${process.env.PLAYQ_PROJECT}"` : ''}`;

      const result = spawnSync(command, {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env },
      });

    }
  } else {
    loadEnv();
    const command = `npx playwright test --config=config/playwright/playwright.config.ts${process.env.PLAYQ_GREP ? ` --grep="${process.env.PLAYQ_GREP}"` : ''
      }${process.env.PLAYQ_PROJECT ? ` --project="${process.env.PLAYQ_PROJECT}"` : ''}`;

    const result = spawnSync(command, {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env },
    });

  }

}

// console.log('  - Runner (PLAYQ_ENV):', process.env.PLAYQ_ENV );
// console.log('  - Runner (PLAYQ_RUNNER):', process.env.PLAYQ_RUNNER );
// console.log('  - Runner (PLAYQ_GREP):', process.env.PLAYQ_GREP );
// console.log('  - Runner (PLAYQ_TAGS):', process.env.PLAYQ_TAGS );
// console.log('  - Runner (PLAYQ_PROJECT):', process.env.PLAYQ_PROJECT );
// console.log('  - Env (RUNNER - cc_card_type):', process.env.cc_card_type );


// let runner = 'playwright';
// let env = '';
// let grep = '';
// let tags = '';
// let prj = '';
// console.log('🌐 os.platform():', os.platform());

// // Use minimist for all platforms for consistency
// const args = minimist(process.argv.slice(2));

// // Try npm_config_* first (for npm script context), then fall back to minimist
// grep = process.env.npm_config_grep || args.grep || '';
// env = process.env.npm_config_env || args.env || '';
// tags = process.env.npm_config_tags || args.tags || '';
// prj = process.env.npm_config_project || args.project || '';
// runner = ['cucumber', 'bdd', 'cuke'].includes(
//   (process.env.npm_config_runner || args.runner || '').toLowerCase()
// )
//   ? 'cucumber'
//   : 'playwright';

// console.log('🌐 grep:', grep);
// console.log('🌐 env:', env);
// console.log('🌐 tags:', tags);
// console.log('🌐 prj:', prj);
// console.log('🌐 runner:', runner);

// // Debug information
// console.log('🔍 Debug - process.argv:', process.argv);
// console.log('🔍 Debug - minimist args:', args);
// console.log('🔍 Debug - npm_config_env:', process.env.npm_config_env);
// console.log('🔍 Debug - npm_config_grep:', process.env.npm_config_grep);

// process.env.TS_NODE_PROJECT = './tsconfig.json';
// require('tsconfig-paths').register();

// console.log('🌐 Running tests with args:', process.argv);
// console.log(process.platform);
// console.log(process.env.npm_config_env);

// process.env.TEST_RUNNER = runner;
// if (tags) process.env.TAGS = tags;
// if (grep) process.env.GREP = grep;
// if (prj) process.env.PROJECT = prj;

// if (env) {
//   process.env.RUN_ENV = env;
//   loadEnv(env);
// }

// if (runner === 'cucumber') {
//   execSync('npm run pretest:cucumber', { stdio: 'inherit' });

//   const cucumberArgs = [
//     'cucumber-js',
//     '--config',
//     'cucumber.js',
//     '--profile',
//     'default',
//   ];
//   if (tags) cucumberArgs.push('--tags', tags);

//   console.log(`🚀 Running Cucumber with args: ${cucumberArgs.join(' ')}`);
//   console.log('📦 Final Cucumber command:', `npx ${cucumberArgs.join(' ')}`);

//   const run = spawn('npx', cucumberArgs, {
//     stdio: 'inherit',
//     env: { ...process.env, RUN_ENV: env, PROJECT: prj },

//     shell: true,
//   });

//   run.on('close', (code) => {
//     execSync('npm run posttest:cucumber', { stdio: 'inherit' });
//     process.exit(code);
//   });
// } else if (runner === 'playwright') {
//   try {
//     execSync('npm run pretest:playwright', { stdio: 'inherit' });
//   } catch (error) {
//     console.log(
//       '⚠️  Pre-test cleanup had some issues, but continuing with tests...'
//     );
//   }

//   const command = `npx playwright test --config=config/playwright/playwright.config.ts${
//     grep ? ` --grep='${grep}'` : ''
//   }${prj ? ` --project=${prj}` : ''}`;

//   const result = spawnSync(command, {
//     stdio: 'inherit',
//     shell: true,
//     env: { ...process.env, RUN_ENV: env, PROJECT: prj },
//   });

//   try {
//     execSync('npm run posttest:playwright', { stdio: 'inherit' });
//   } catch (error) {
//     console.log(
//       '⚠️  Post-test reporting had some issues, but test execution completed.'
//     );
//   }

//   process.exit(result.status || 0);
// } else {
//   console.error(`❌ Unknown runner: ${runner}`);
//   process.exit(1);
// }
