import { spawnSync, execSync, spawn } from 'child_process';
import minimist from 'minimist';
import { loadEnv } from '../helper/bundle/env';
import os from 'os';
import path from 'path';
// Note: remove stray invalid import; runner does not need faker

// loadEnv();
// console.log('  - Runner (PLAYQ_ENV):', process.env.PLAYQ_ENV );
// console.log('  - Runner (PLAYQ_RUNNER):', process.env.PLAYQ_RUNNER );
// console.log('  - Runner (PLAYQ_GREP):', process.env.PLAYQ_GREP );
// console.log('  - Runner (PLAYQ_TAGS):', process.env.PLAYQ_TAGS );
// console.log('  - Runner (PLAYQ_PROJECT):', process.env.PLAYQ_PROJECT );
// console.log('  - Env (RUNNER - cc_card_type):', process.env['cc_card_type']);
// console.log('  - Env (RUNNER - config.testExecution.timeout):', process.env['config.testExecution.timeout'] );

if (process.env.PLAYQ_RUNNER && process.env.PLAYQ_RUNNER === 'cucumber') {
  // Allow vars to initialize in the cucumber child process (do NOT set PLAYQ_NO_INIT_VARS here)
  // Ensure legacy TEST_RUNNER flag used by helper code is set
  process.env.TEST_RUNNER = 'cucumber';
  // Provide a default browser type if none supplied via config/env
  if (!process.env['PLAYQ__browser__browserType'] && !process.env['browser.browserType']) {
    process.env.PLAYQ__browser__browserType = 'chromium';
  }
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
    try {
      const pkgPath = path.resolve(process.cwd(), 'package.json');
      const pkg = require(pkgPath);
      if (pkg.scripts && pkg.scripts['posttest:cucumber']) {
        execSync('npm run posttest:cucumber', { stdio: 'inherit' });
      } else {
        console.log('ℹ️ Skipping posttest:cucumber (script not defined)');
      }
    } catch (err) {
      console.log('ℹ️ Posttest check failed, continuing:', (err as any)?.message || err);
    }
    process.exit(code);
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
  process.env.PLAYQ_NO_INIT_VARS = '1';
  loadEnv();
      const command = `npx playwright test --config=playq/config/playwright/playwright.config.js${process.env.PLAYQ_GREP ? ` --grep="${process.env.PLAYQ_GREP}"` : ''
        }${process.env.PLAYQ_PROJECT ? ` --project="${process.env.PLAYQ_PROJECT}"` : ''}`;

  const childEnv = { ...process.env } as any;
      // Ensure child initializes vars by removing the parent-side guard
      delete childEnv.PLAYQ_NO_INIT_VARS;
  const preload = '-r ts-node/register';
      childEnv.NODE_OPTIONS = childEnv.NODE_OPTIONS
        ? `${childEnv.NODE_OPTIONS} ${preload}`
        : preload;
      // Ensure core and project roots propagate to child
      if (!childEnv.PLAYQ_CORE_ROOT) childEnv.PLAYQ_CORE_ROOT = path.resolve(__dirname, '..');
      if (!childEnv.PLAYQ_PROJECT_ROOT) childEnv.PLAYQ_PROJECT_ROOT = process.cwd();
      // Point ts-node to the project's tsconfig for path aliases
      const projectTsConfig = path.resolve(process.cwd(), 'tsconfig.json');
      childEnv.TS_NODE_PROJECT = projectTsConfig;
      childEnv.TS_NODE_TRANSPILE_ONLY = childEnv.TS_NODE_TRANSPILE_ONLY || 'true';
      const result = spawnSync(command, {
        stdio: 'inherit',
        shell: true,
        env: childEnv,
      });

    }
  } else {
  process.env.PLAYQ_NO_INIT_VARS = '1';
  loadEnv();
    const command = `npx playwright test --config=playq/config/playwright/playwright.config.js${process.env.PLAYQ_GREP ? ` --grep="${process.env.PLAYQ_GREP}"` : ''
      }${process.env.PLAYQ_PROJECT ? ` --project="${process.env.PLAYQ_PROJECT}"` : ''}`;

  const childEnv = { ...process.env } as any;
    // Ensure child initializes vars by removing the parent-side guard
    delete childEnv.PLAYQ_NO_INIT_VARS;
  const preload = '-r ts-node/register';
    childEnv.NODE_OPTIONS = childEnv.NODE_OPTIONS
      ? `${childEnv.NODE_OPTIONS} ${preload}`
      : preload;
    // Ensure core and project roots propagate to child
    if (!childEnv.PLAYQ_CORE_ROOT) childEnv.PLAYQ_CORE_ROOT = path.resolve(__dirname, '..');
    if (!childEnv.PLAYQ_PROJECT_ROOT) childEnv.PLAYQ_PROJECT_ROOT = process.cwd();
    // Point ts-node to the project's tsconfig for path aliases
    const projectTsConfig = path.resolve(process.cwd(), 'tsconfig.json');
    childEnv.TS_NODE_PROJECT = projectTsConfig;
    childEnv.TS_NODE_TRANSPILE_ONLY = childEnv.TS_NODE_TRANSPILE_ONLY || 'true';
    const result = spawnSync(command, {
      stdio: 'inherit',
      shell: true,
      env: childEnv,
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
