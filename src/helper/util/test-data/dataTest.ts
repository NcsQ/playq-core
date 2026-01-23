// dataTest.ts
import { test } from '@playwright/test';
import { getTestData } from './dataLoader';
import * as vars from '../../bundle/vars';
import { faker as coreFaker } from '../../faker/customFaker';

type DataSource<T> = T[] | {
  file: string;
  filter?: string;
  sheet?: string;
  testType?: string;
  suffix?: string; // Optional suffix for test name
};

export function dataTest<T extends Record<string, any>>(
  label: string,
  dataSource: T[] | { file: string; filter?: string; sheet?: string ; testType?: string; suffix?: string },
  callback: (args: { row: T; page?: any }) => Promise<void>
) {
  let dataset: T[] = [];
  const { testType = "UI", suffix = ""} = typeof dataSource === "object" && !Array.isArray(dataSource) ? dataSource : {};

  if (Array.isArray(dataSource)) {
    dataset = applyRowReplacements(dataSource as any);
  } else {
    let { file, filter, sheet } = dataSource;
    file = vars.replaceVariables(file);
    sheet = (sheet) ? vars.replaceVariables(sheet) : undefined;
    filter = vars.replaceVariables(filter);
    const raw = getTestData(file, sheet);
    // Expand faker/variable placeholders within each row before filtering/scheduling tests
    const preprocessed = applyRowReplacements(raw as any);
    dataset = filter
      ? (preprocessed as T[]).filter(row => {
          try {
            // Create a scoped function where row keys are destructured
            const fn = new Function("row", `
              const { ${Object.keys(row).join(", ")} } = row;
              return ${filter};
            `);
            return fn(row);
          } catch (err) {
            console.warn(`⚠️ Filter failed: ${filter}`, err);
            return false;
          }
        })
      : (preprocessed as T[]);
  }
  
  test.describe(label, () => {
    dataset.forEach((row, index) => {
      vars.setValue('playq.iteration.count',`${index + 1}`);
      const name = `${label} ${vars.replaceVariables(replaceIterationDataVars(suffix,row))} [-${index + 1}-]`;
      if (testType.toUpperCase() === "API") {
        test(name, async () => {
          test.info().annotations.push({ type: "tag", description: label });
          await callback({ row });
        });
      } else {
        test(name, async ({ page }) => {
          test.info().annotations.push({ type: "tag", description: label });
          await callback({ row, page });
        });
      }
    });
  });
}

// ----------------- helpers -----------------
function applyRowReplacements<T extends Record<string, any>>(rows: T[]): T[] {
  return rows.map((row) => {
    const out: Record<string, any> = { ...row };
    for (const k of Object.keys(out)) {
      const v = out[k];
      if (typeof v === 'string') {
        // First, evaluate any faker placeholders
        const withFaker = replaceFakerPlaceholders(v);
        // Then, apply generic variable replacements
        out[k] = typeof withFaker === 'string' ? vars.replaceVariables(withFaker) : withFaker;
      }
    }
    return out as T;
  });
}

function replaceFakerPlaceholders(input: string): any {
  const trimmed = input.trim();
  // Entire value is wrapped: #{faker....}
  const wrapped = trimmed.match(/^#\{(faker(?:\.[a-zA-Z0-9_]+)+\((.*)\))\}$/);
  if (wrapped) {
    return evalFakerCall(wrapped[1]);
  }
  // Entire value is a faker call: faker....
  const full = trimmed.match(/^faker((?:\.[a-zA-Z0-9_]+)+)\((.*)\)$/);
  if (full) {
    return evalFakerFromParts(full[1], full[2]);
  }
  // Embedded placeholders inside a larger string
  return input.replace(/#\{faker((?:\.[a-zA-Z0-9_]+)+)\((.*?)\)\}/g, (_m, pathPart, argsRaw) => {
    try {
      const val = evalFakerFromParts(pathPart, argsRaw);
      return String(val);
    } catch (e) {
      console.warn(`⚠️ Failed to evaluate faker placeholder: #{faker${pathPart}(${argsRaw})}`, e);
      return _m;
    }
  });
}

function evalFakerCall(expr: string): any {
  // expr like: faker.xxx.yyy(args)
  const m = expr.match(/^faker((?:\.[a-zA-Z0-9_]+)+)\((.*)\)$/);
  if (!m) throw new Error(`Invalid faker expression: ${expr}`);
  return evalFakerFromParts(m[1], m[2]);
}

function evalFakerFromParts(pathPart: string, argsRaw: string): any {
  const path = pathPart.replace(/^\./, '');
  const parts = path.split('.');
  // Prefer global faker set up by core; fall back to imported one
  let ctx: any = (globalThis as any).faker || coreFaker;
  let fn: any = ctx;
  for (const p of parts) {
    fn = fn?.[p];
  }
  if (typeof fn !== 'function') throw new Error(`Resolved faker path is not a function: faker.${path}`);
  const args = parseFakerArgs(argsRaw);
  return fn(...args);
}

function parseFakerArgs(argsRaw: string): any[] {
  const trimmed = (argsRaw || '').trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('{')) {
    // Object literal; normalize to JSON
    const normalized = trimmed
      .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
      .replace(/'/g, '"');
    try {
      return [JSON.parse(normalized)];
    } catch (e) {
      throw new Error(`Failed to parse faker argument object: ${argsRaw}`);
    }
  }
  // Simple comma-separated values (strip surrounding quotes)
  return splitArgs(trimmed).map(a => a.trim().replace(/^(["'])(.*)\1$/, '$2'));
}

function splitArgs(s: string): string[] {
  const out: string[] = [];
  let buf = '';
  let depth = 0;
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quote) {
      if (ch === quote && s[i - 1] !== '\\') {
        quote = null;
      }
      buf += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch as any;
      buf += ch;
      continue;
    }
    if (ch === '{' || ch === '[' || ch === '(') depth++;
    if (ch === '}' || ch === ']' || ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(buf);
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf) out.push(buf);
  return out;
}

/**
 * Replaces all #{playq.iteration.data.KEY} in the input string with the value from the row object.
 * @param input The string containing placeholders.
 * @param row The row object with data.
 * @returns The string with placeholders replaced.
 */
 function replaceIterationDataVars(input: string, row: Record<string, any>): string {
  return input.replace(/#\{playq\.iteration\.data\.([a-zA-Z0-9_]+)\}/g, (_, key) => {
    return row[key] !== undefined ? String(row[key]) : '';
  });
}