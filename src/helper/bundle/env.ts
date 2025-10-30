import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

export const loadEnv = (env?: string) => {
    // Setting PlayQ Project Root
    if (!process.env['PLAYQ_PROJECT_ROOT']) {
        process.env['PLAYQ_PROJECT_ROOT'] = findProjectRoot();
    }
    // Setting PlayQ Core Root
    process.env['PLAYQ_CORE_ROOT'] = path.resolve(process.env['PLAYQ_PROJECT_ROOT'], 'src');
    // Setting PlayQ Defaults
    if(!process.env.PLAYQ_REPORT_OPEN) process.env.PLAYQ_REPORT_OPEN = 'true';

    // Setting PlayQ Runner
    if (process.env.PLAYQ_RUNNER && ['bdd', 'cuke', 'cucumber'].includes(process.env.PLAYQ_RUNNER.trim())) {
        process.env.PLAYQ_RUNNER = 'cucumber';
    } else {
        process.env.PLAYQ_RUNNER = 'playwright';
    }

    let envPath;
    let playqEnvMem = undefined
    let playqRunnerMem = process.env['PLAYQ_RUNNER']
    if (process.env['PLAYQ_ENV']) playqEnvMem = process.env['PLAYQ_ENV']

    if (env) {
        envPath = path.resolve(process.env.PLAYQ_PROJECT_ROOT, 'environments', `${env}.env`);
        dotenv.config({
            override: true,
            path: envPath
        })
    } else {
        if (process.env.PLAYQ_ENV) {
            process.env.PLAYQ_ENV = process.env.PLAYQ_ENV.trim();
            envPath = path.resolve(process.env.PLAYQ_PROJECT_ROOT, 'environments', `${process.env.PLAYQ_ENV}.env`);
            dotenv.config({
                override: true,
                path: envPath
            })
        } else {
            console.warn("NO ENVIRONMENTS PASSED or PLAYQ_ENV is undefined!")
        }
    }
    process.env['PLAYQ_RUNNER'] = playqRunnerMem; // Override any environment config for PLAYQ_RUNNER.
    if (playqEnvMem) process.env['PLAYQ_ENV'] = playqEnvMem;

    // Loading variables from vars.ts - use dynamic import to avoid circular dependency
    try {
        const { initVars } = require('./vars');
        if (typeof initVars === 'function') {
            initVars();
        }
    } catch (error) {
        console.warn('Warning: Could not initialize vars:', error.message);
    }
}

function findProjectRoot(): string {
    // Method 1: Check for environment variable
    if (process.env.PLAYQ_PROJECT_ROOT) {
        return process.env.PLAYQ_PROJECT_ROOT;
    }

    // Method 2: Walk up from cwd to find package.json
    let currentDir = process.cwd();
    while (currentDir !== path.dirname(currentDir)) {
        if (fs.existsSync(path.join(currentDir, 'package.json'))) {
            return currentDir;
        }
        currentDir = path.dirname(currentDir);
    }

    // Method 3: Fallback to cwd
    return process.cwd();
}