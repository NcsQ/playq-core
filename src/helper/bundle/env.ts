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
            // No explicit env passed. Try to load 'default.env' if it exists.
            // Try several candidate roots to locate default.env. In some cases
            // PLAYQ_PROJECT_ROOT or process.cwd() may differ depending on how
            // Playwright/VSCode started the process, so check a few locations.
            const candidateRoots = [process.env.PLAYQ_PROJECT_ROOT, process.cwd(), findProjectRoot()];
            let loadedDefault = false;
            for (const root of candidateRoots) {
                if (!root) continue;
                const candidatePath = path.resolve(root, 'environments', 'default.env');
                if (fs.existsSync(candidatePath)) {
                    dotenv.config({ override: true, path: candidatePath });
                    process.env.PLAYQ_ENV = 'default';
                    console.log(`ℹ️ Loaded default environment from ${candidatePath}`);
                    loadedDefault = true;
                    break;
                }
            }
            if (!loadedDefault) {
                // As a last attempt, try walking up from this file's directory to find an 'environments' folder
                let cur = __dirname;
                for (let i = 0; i < 6 && !loadedDefault; i++) {
                    const candidatePath = path.resolve(cur, '..'.repeat(i), 'environments', 'default.env');
                    if (fs.existsSync(candidatePath)) {
                        dotenv.config({ override: true, path: candidatePath });
                        process.env.PLAYQ_ENV = 'default';
                        console.log(`ℹ️ Loaded default environment from ${candidatePath}`);
                        loadedDefault = true;
                        break;
                    }
                }
            }
            if (!loadedDefault) {
                console.warn("NO ENVIRONMENTS PASSED : default.env not present or --env is undefined!");
            }
        }
    }
    process.env['PLAYQ_RUNNER'] = playqRunnerMem; // Override any environment config for PLAYQ_RUNNER.
    if (playqEnvMem) process.env['PLAYQ_ENV'] = playqEnvMem;

    // Load variables only when not explicitly disabled and TS loader is present (parent process may not have ts-node)
    try {
        if (process.env.PLAYQ_NO_INIT_VARS === '1') {
            // Parent runner explicitly disables var init; child will handle it.
        } else {
            const canRequireTs = !!require.extensions['.ts'];
            if (!canRequireTs) {
                // Defer var loading to the test subprocess (Playwright/Cucumber), which preloads ts-node.
            } else {
            const { initVars } = require('./vars');
            if (typeof initVars === 'function') {
                initVars();
            }
            }
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