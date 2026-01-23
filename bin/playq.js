#!/usr/bin/env node
// Lightweight CLI wrapper: maps flags to PLAYQ_* env vars and invokes compiled runner.js


const minimist = require('minimist');
const path = require('path');
const fs = require('fs');

// Version flag support
if (process.argv.includes('--version') || process.argv.includes('-v')) {
  const pkgPath = path.join(__dirname, '../package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  console.log(pkg.version);
  process.exit(0);
}


// If first argument is 'util' and -h/--help/help is present, print help and exit
if (process.argv[2] === 'util' && (process.argv.includes('--help') || process.argv.includes('-h') || process.argv.includes('help'))) {
  console.log(`PlayQ CLI - util
Usage: playq util [options]

Description:
  Interactive utility for various PlayQ operations including encryption, 
  decryption, key generation, TOTP codes, and API schema generation.

Options:
  --help     | -h     Show help

Available Utilities:
  1. Password Encryption    - Encrypt passwords using strong encryption
  2. Text Encryption       - Encrypt any text using strong encryption  
  3. Decryption           - Decrypt previously encrypted values
  4. Generate 32bit Key   - Generate cryptographic keys for encryption
  5. Generate TOTP Code   - Generate time-based one-time passwords
  6. Generate API Schema  - Generate TypeScript schemas from OpenAPI specs
  
Examples:
  npx playq util           # Launch interactive utility menu
  npx playq util --help    # Show this help message
`);
  process.exit(0);
}

// If first argument is 'util', run the util script and exit
if (process.argv[2] === 'util') {
  const { spawnSync } = require('child_process');
  const utilScript = path.join(__dirname, '../dist/scripts/util.js');
  const result = spawnSync(process.execPath, [utilScript], { stdio: 'inherit' });
  process.exit(result.status || 0);
}


// If first argument is 'generate' and -h/--help/help is present, print help and exit
if (process.argv[2] === 'generate' && (process.argv.includes('--help') || process.argv.includes('-h') || process.argv.includes('help'))) {
  console.log(`PlayQ CLI - generate
Usage: playq generate [options]

Options:
  --stepgroup | -sg   Generate step group cache and step defs
  --help     | -h     Show help

Examples:
  npx playq generate --stepgroup
  npx playq generate -sg
`);
  process.exit(0);
}

// If first argument is 'generate' and --stepgroup or -sg is present, run the sgGenerator script and exit
if (process.argv[2] === 'generate' && (process.argv.includes('--stepgroup') || process.argv.includes('-sg'))) {
  const { spawnSync } = require('child_process');
  const sgGenScript = path.join(__dirname, '../dist/exec/sgGenerator.js');
  const result = spawnSync(process.execPath, [sgGenScript], { stdio: 'inherit' });
  process.exit(result.status || 0);
}


// Only run test runner if 'test' subcommand is provided
if (process.argv[2] === 'test') {

  const args = minimist(process.argv.slice(3), {
    string: ['grep', 'tags', 'runner', 'project', 'env', 'filter', 'key'],
    alias: { g: 'grep', t: 'tags', r: 'runner', p: 'project', e: 'env', f: 'filter', k: 'key' }
  });

  // Support --key or -k for PLAYQ_SECRET_KEY
  if (args.key) process.env.PLAYQ_SECRET_KEY = args.key;

  if (args.grep) process.env.PLAYQ_GREP = args.grep;
  if (args.tags) process.env.PLAYQ_TAGS = args.tags;
  if (args.runner) process.env.PLAYQ_RUNNER = args.runner;
  // Mirror to legacy TEST_RUNNER flag used by action helpers
  if (args.runner) process.env.TEST_RUNNER = args.runner;
  if (args.project) process.env.PLAYQ_PROJECT = args.project;
  if (args.env) process.env.PLAYQ_ENV = args.env;

  // --filter support: map to grep/tags based on runner
  if (args.filter) {
    const runner = args.runner || process.env.PLAYQ_RUNNER || 'playwright';
    if (runner === 'cucumber') {
      process.env.PLAYQ_TAGS = args.filter;
    } else {
      process.env.PLAYQ_GREP = args.filter;
    }
  }

  // Provide defaults if not set
  if (!process.env.PLAYQ_ENV) process.env.PLAYQ_ENV = 'default';
  if (!process.env.PLAYQ_RUNNER) process.env.PLAYQ_RUNNER = 'playwright';
  if (!process.env.TEST_RUNNER) process.env.TEST_RUNNER = process.env.PLAYQ_RUNNER;
  // Core & project root hints for helpers
  process.env.PLAYQ_CORE_ROOT = path.join(__dirname, '../dist');
  process.env.PLAYQ_PROJECT_ROOT = process.cwd();

  // Do NOT register ts-node or tsconfig-paths here; the test runner handles TypeScript via project config.

  // Provide basic help for test subcommand
  if (args.help || args.h) {
    console.log(`PlayQ CLI (Phase 1)
Usage: playq test [options]
  --grep   | -g   Playwright grep filter
  --tags   | -t   Cucumber tag expression
  --filter | -f   Universal filter (maps to grep/tags by runner)
  --runner | -r   playwright | cucumber (default playwright)
  --project| -p   Playwright project name
  --env    | -e   Environment name (mapped to PLAYQ_ENV)
  --key    | -k   Secret key for crypto (sets PLAYQ_SECRET_KEY)

  --help   | -h   Show help
  --version| -v   Show PlayQ CLI version  

Examples:
  npx playq test --filter "Registration001"
  npx playq test --filter "@smoke" --runner cucumber
  npx playq test --grep "Registration001"
  npx playq test --tags "@smoke" --runner cucumber
  npx playq test --key "mysecret" --grep "Registration001"
`);
    process.exit(0);
  }

  const runnerJs = path.join(__dirname, '../dist/exec/runner.js');
  require(runnerJs);
}

// Top-level help for all commands
if (process.argv[2] === 'help' || process.argv[2] === '--help' || process.argv[2] === '-h' || !process.argv[2]) {
  console.log(`PlayQ CLI (Phase 1)

Usage: playq <command> [options]
  --help   | -h   Show help
  --version| -v   Show PlayQ CLI version

Commands:
  test                 Run PlayQ tests (Playwright or Cucumber)
  util                 Run the PlayQ utility
  generate --stepgroup | -sg   Generate step group cache and step defs

For test options, run: npx playq test --help
For util options, run: npx playq util --help
For version, run: npx playq --version or npx playq -v

Examples:
  npx playq test --filter "Registration001"
  npx playq test --filter "@smoke" --runner cucumber
  npx playq test --grep "Registration001"
  npx playq test --tags "@smoke" --runner cucumber
  npx playq util
  npx playq util --help
  npx playq generate --stepgroup
  npx playq generate -sg
`);
  process.exit(0);
}