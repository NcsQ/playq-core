/**
 * PowerShell Template Variable Resolver
 * Resolves variables with priority: CLI > Static JSON > Environment Vars
 * Supports faker expressions: #{faker.custom.person.fullName()}
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
   */
  resolveVariable(varName: string, cliOverrides: Record<string, string> = {}): string | null {
    // Priority 1: CLI overrides
    if (cliOverrides[varName]) {
      return cliOverrides[varName];
    }

    // Priority 2: Static variables
    if (this.staticVars[varName]) {
      return this.staticVars[varName];
    }

    // Priority 3: Environment variables
    if (process.env[varName]) {
      return process.env[varName];
    }

    return null;
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
   * Supports nested variables like MESSAGE="HELLO {{NAME}}" with NAME="KiSHOR"
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

        const newValue = value.replace(/\{\{(\w+)\}\}/g, (_, varName: string) => {
          const resolvedVal = this.resolveVariable(varName, cliOverrides);
          if (resolvedVal !== null && resolvedVal !== value) {
            changed = true;
            return resolvedVal;
          }
          return `{{${varName}}}`;
        });

        if (newValue !== value) {
          resolved[key] = newValue;
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
