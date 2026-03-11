/**
 * PowerShell Template Variable Resolver
 * Resolves variables with priority: CLI > Static JSON > Environment Vars
 * Supports Faker expression evaluation (#{faker...})
 */

import * as fs from 'fs';
import * as path from 'path';
import { TemplateVars } from './types';

export class PsVariableResolver {
  private staticVars: Record<string, string> = {};

  constructor(configFilePath?: string) {
    this.loadStaticVars(configFilePath);
  }

  /**
   * Evaluate Faker expressions (#{faker...}) in a string
   * Supports: #{faker.path.to.method(args)} and embedded expressions
   */
  private evaluateFakerExpressions(input: string): string {
    if (!input || typeof input !== 'string') return input;

    const trimmed = input.trim();

    // Case 1: Entire value is wrapped: #{faker...}
    const wrapped = trimmed.match(/^#\{(faker(?:\.[a-zA-Z0-9_]+)+\((.*)\))\}$/);
    if (wrapped) {
      try {
        return String(this.evalFakerCall(wrapped[1]));
      } catch (e) {
        console.warn(`⚠️ Failed to evaluate faker expression: #{${wrapped[1]}}`, e);
        return trimmed;
      }
    }

    // Case 2: Embedded placeholders inside a larger string
    return input.replace(/#\{faker((?:\.[a-zA-Z0-9_]+)+)\((.*?)\)\}/g, (_m, pathPart, argsRaw) => {
      try {
        const val = this.evalFakerFromParts(pathPart, argsRaw);
        return String(val);
      } catch (e) {
        console.warn(`⚠️ Failed to evaluate faker placeholder: #{faker${pathPart}(${argsRaw})}`, e);
        return _m;
      }
    });
  }

  /**
   * Evaluate a complete faker call expression
   */
  private evalFakerCall(expr: string): any {
    // expr like: faker.xxx.yyy(args)
    const m = expr.match(/^faker((?:\.[a-zA-Z0-9_]+)+)\((.*)\)$/);
    if (!m) throw new Error(`Invalid faker expression: ${expr}`);
    return this.evalFakerFromParts(m[1], m[2]);
  }

  /**
   * Evaluate faker expression from path and arguments
   */
  private evalFakerFromParts(pathPart: string, argsRaw: string): any {
    const path = pathPart.replace(/^\./, '');
    const parts = path.split('.');
    // Use global faker if available; this will be set by PlayQ core global initialization
    let ctx: any = (globalThis as any).faker;
    if (!ctx) {
      // Fallback: attempt to require faker from node_modules
      try {
        ctx = require('@faker-js/faker').faker;
      } catch {
        throw new Error('Faker library not available; cannot evaluate faker expressions');
      }
    }
    let fn: any = ctx;
    for (const p of parts) {
      fn = fn?.[p];
    }
    if (typeof fn !== 'function') throw new Error(`Resolved faker path is not a function: faker.${path}`);
    const args = this.parseFakerArgs(argsRaw);
    return fn(...args);
  }

  /**
   * Parse faker function arguments
   */
  private parseFakerArgs(argsRaw: string): any[] {
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
    // Simple comma-separated values
    return this.splitArgs(trimmed).map(a => a.trim().replace(/^(["'])(.*)\1$/, '$2'));
  }

  /**
   * Split comma-separated arguments respecting nesting and quotes
   */
  private splitArgs(s: string): string[] {
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
   * Load static variables from var.static.json
   */
  private loadStaticVars(configFilePath?: string): void {
    try {
      const configPath = configFilePath || path.resolve(process.env.PLAYQ_PROJECT_ROOT || process.cwd(), 'resources/var.static.json');
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(content);
        this.staticVars = parsed || {};
      }
    } catch (error) {
      console.warn('Warning: Could not load static variables:', error);
    }
  }

  /**
   * Resolve a single variable with priority: CLI > Static > Environment
   * Uses explicit presence checks to allow empty string values
   * Evaluates Faker expressions in variable values
   */
  resolveVariable(varName: string, cliOverrides: Record<string, string> = {}): string | null {
    let value: string | null = null;

    // Priority 1: CLI overrides
    if (Object.prototype.hasOwnProperty.call(cliOverrides, varName)) {
      value = cliOverrides[varName];
    }
    // Priority 2: Static variables
    else if (Object.prototype.hasOwnProperty.call(this.staticVars, varName)) {
      value = this.staticVars[varName];
    }
    // Priority 3: Environment variables
    else if (Object.prototype.hasOwnProperty.call(process.env, varName)) {
      value = process.env[varName] ?? null;
    }

    // Evaluate Faker expressions if value contains them
    if (value && typeof value === 'string') {
      value = this.evaluateFakerExpressions(value);
    }

    return value;
  }

  /**
   * Resolve all variables for a template
   */
  resolveAllVariables(templateVars: string[], cliOverrides: Record<string, string> = {}): TemplateVars {
    const resolved: TemplateVars = {};
    for (const varName of templateVars) {
      resolved[varName] = this.resolveVariable(varName, cliOverrides);
    }
    return resolved;
  }

  /**
   * Handle nested variable resolution
   * Supports nested variables like MESSAGE="HELLO {{NAME}}" with NAME="JOHN"
   * Also evaluates any Faker expressions that appear in resolved values
   * Priority: CLI overrides > static vars > environment vars
   */
  resolveNestedVariables(initialVars: TemplateVars, cliOverrides: Record<string, string> = {}): TemplateVars {
    let resolved = { ...initialVars };
    let changed = true;
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      for (const [key, value] of Object.entries(resolved)) {
        if (value === null) continue;

        // First, resolve {{VARIABLE}} references
        const newValue = value.replace(/\{\{(\w+)\}\}/g, (_, varName: string) => {
          const resolvedVal = this.resolveVariable(varName, cliOverrides);
          if (resolvedVal !== null && resolvedVal !== value) {
            changed = true;
            return resolvedVal;
          }
          return `{{${varName}}}`;
        });

        // Then, evaluate any Faker expressions that may have been introduced
        const withFaker = this.evaluateFakerExpressions(newValue);
        
        if (withFaker !== value) {
          resolved[key] = withFaker;
          if (newValue === value) changed = true; // Mark changed only if we made actual progress
        }
      }
    }

    return resolved;
  }

  /**
   * Extract all {{VARIABLE}} placeholders from content
   */
  extractVariables(content: string): string[] {
    const matches = content.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
  }
}
