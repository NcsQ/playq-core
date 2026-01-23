import * as fs from 'fs';
import * as path from 'path';

/**
 * Dynamically builds the `loc` namespace from the consumer project.
 * - Scans PLAYQ_PROJECT_ROOT/resources/locators for *.loc.ts or *.ts files
 * - Imports each module (requires ts-node registration in the child process)
 * - Collects named exports and default object keys into a single namespace
 */
export function getLocNamespace(): Record<string, any> {
  const base = safeProjectRoot();
  const dir = path.resolve(base, 'resources/locators');
  const out: Record<string, any> = {};

  if (!fs.existsSync(dir)) {
    // Not an error—project may not provide locators
    return out;
  }

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.ts') || f.endsWith('.js'))
    .map(f => path.join(dir, f));

  for (const file of files) {
    try {
      // Clear module cache to reflect changes between runs
      delete require.cache[require.resolve(file)];
      const mod = require(file);

      // Prefer named exports: export const lambdatest = {...}
      for (const key of Object.keys(mod)) {
        if (key === 'default') continue;
        out[key] = mod[key];
      }

      // If default export is an object (e.g., { lambdatest: {...} }), merge keys
      const def = mod.default;
      if (def && typeof def === 'object') {
        for (const [k, v] of Object.entries(def)) {
          // Do not overwrite explicitly named exports
          if (!(k in out)) out[k] = v;
        }
      }
    } catch (e: any) {
      console.warn(`⚠️ Failed to load loc module ${file}:`, e?.message || e);
    }
  }

  return out;
}

function safeProjectRoot(): string {
  if (process.env.PLAYQ_PROJECT_ROOT) return process.env.PLAYQ_PROJECT_ROOT;
  // Walk up to find a package.json as fallback
  let current = process.cwd();
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'package.json'))) return current;
    current = path.dirname(current);
  }
  return process.cwd();
}
