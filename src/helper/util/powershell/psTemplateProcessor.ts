/**
 * PowerShell Template Processor
 * Processes PowerShell script templates with variable substitution
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { PsTemplateOptions, ProcessingResult, TemplateVars } from './types';
import { PsVariableResolver } from './psVariableResolver';

export class PsTemplateProcessor {
  private resolver: PsVariableResolver;
  private options: PsTemplateOptions;

  constructor(options: PsTemplateOptions) {
    this.options = options;
    this.resolver = new PsVariableResolver();
  }

  /**
   * Process a PowerShell script template
   */
  async process(templateName: string): Promise<ProcessingResult> {
    try {
      // Step 1: Read template
      const templatePath = this.readTemplate(templateName);
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template file not found: ${templatePath}`);
      }

      const rawContent = fs.readFileSync(templatePath, 'utf-8');

      // Step 2: Extract and resolve variables
      const foundVars = this.resolver.extractVariables(rawContent);
      const resolvedVars = this.resolver.resolveAllVariables(foundVars, this.options.overrides);
      const nestedVars = this.resolver.resolveNestedVariables(resolvedVars, this.options.overrides);

      // Step 3: Process template
      const processedContent = this.processTemplate(rawContent, nestedVars);

      // Step 4-6: Handle dry-run vs actual execution
      if (this.options.dryRun) {
        // Dry run: do not write or execute, just preview
        this.printDryRunPreview(templateName, processedContent);
        const computedOutputPath = this.computeOutputPath(templateName);

        return {
          templateName,
          sourceDir: this.options.source,
          destDir: this.options.dest,
          outputPath: computedOutputPath,
          foundVars,
          resolvedVars: nestedVars,
          processedContent,
          success: true,
        };
      } else {
        // Step 4: Write processed template
        const outputPath = this.writeProcessedTemplate(templateName, processedContent);

        // Step 5: Optionally execute
        if (this.options.run) {
          this.executeScript(outputPath);
        }

        // Step 6: Print summary
        this.printSummary(templateName, outputPath, foundVars, nestedVars);

        return {
          templateName,
          sourceDir: this.options.source,
          destDir: this.options.dest,
          outputPath,
          foundVars,
          resolvedVars: nestedVars,
          processedContent,
          success: true,
        };
      }
    } catch (error: any) {
      return {
        templateName,
        sourceDir: this.options.source,
        destDir: this.options.dest,
        foundVars: [],
        resolvedVars: {},
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate template name to prevent path traversal attacks
   */
  private validateTemplateName(templateName: string): void {
    if (!templateName || typeof templateName !== 'string') {
      throw new Error('Template name must be a non-empty string');
    }
    if (templateName.includes('..') || templateName.includes('/') || templateName.includes('\\')) {
      throw new Error('Template name contains invalid characters (.. / \\)');
    }
  }

  /**
   * Resolve a path safely within a base directory to prevent directory traversal
   */
  private resolveSafePath(baseDir: string, relativePath: string, kind: 'template' | 'output'): string {
    const resolvedBase = path.resolve(baseDir);
    const fullPath = path.resolve(resolvedBase, relativePath);

    // Ensure the resolved path stays within the base directory
    if (!fullPath.startsWith(resolvedBase + path.sep) && fullPath !== resolvedBase) {
      throw new Error(`Invalid ${kind} path: resolved outside of base directory`);
    }

    return fullPath;
  }

  /**
   * Read template file path from source directory (synchronous - no async operations needed)
   */
  private readTemplate(templateName: string): string {
    this.validateTemplateName(templateName);
    const projectRoot = process.env.PLAYQ_PROJECT_ROOT || process.cwd();
    const sourceBase = path.resolve(projectRoot, this.options.source);
    const templateRelative = `${templateName}.ps1`;
    return this.resolveSafePath(sourceBase, templateRelative, 'template');
  }

  /**
   * Compute the output path for a given template (without writing)
   */
  private computeOutputPath(templateName: string): string {
    this.validateTemplateName(templateName);
    const projectRoot = process.env.PLAYQ_PROJECT_ROOT || process.cwd();
    const destBase = path.resolve(projectRoot, this.options.dest);
    const outputRelative = `${templateName}_processed.ps1`;
    return this.resolveSafePath(destBase, outputRelative, 'output');
  }

  /**
   * Write processed template to destination
   */
  private writeProcessedTemplate(templateName: string, content: string): string {
    const projectRoot = process.env.PLAYQ_PROJECT_ROOT || process.cwd();
    const destBase = path.resolve(projectRoot, this.options.dest);

    // Ensure destination directory exists
    if (!fs.existsSync(destBase)) {
      fs.mkdirSync(destBase, { recursive: true });
    }

    const outputPath = this.computeOutputPath(templateName);
    fs.writeFileSync(outputPath, content, 'utf-8');

    return outputPath;
  }

  /**
   * Process template by replacing variables (purely synchronous string replacement)
   */
  private processTemplate(content: string, vars: TemplateVars): string {
    let processed = content;

    for (const [varName, varValue] of Object.entries(vars)) {
      if (varValue === null) continue;
      const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g');
      processed = processed.replace(regex, varValue || '');
    }

    return processed;
  }

  /**
   * Execute PowerShell script using spawnSync to avoid command injection (synchronous)
   */
  private executeScript(scriptPath: string): void {
    try {
      console.log(`\n🚀 Executing PowerShell script: ${scriptPath}`);
      const result = spawnSync('powershell', [
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', scriptPath
      ], {
        encoding: 'utf-8',
        stdio: 'inherit'
      });

      if (result.error) {
        throw result.error;
      }

      if (result.status !== 0) {
        throw new Error(`PowerShell script exited with code ${result.status}`);
      }
    } catch (error: any) {
      throw new Error(`PowerShell execution failed: ${error.message}`);
    }
  }

  /**
   * Print processing summary
   */
  private printSummary(templateName: string, outputPath: string, foundVars: string[], resolvedVars: TemplateVars): void {
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Template Processed: ${templateName}`);
    console.log('='.repeat(60));
    console.log(`📍 Output: ${outputPath}`);
    console.log(`📝 Variables Found: ${foundVars.length}`);

    if (foundVars.length > 0) {
      console.log('\n🔍 Variable Resolution:');
      foundVars.forEach((varName) => {
        const value = resolvedVars[varName];
        const status = value === null ? '❌ UNRESOLVED' : '✅ RESOLVED';
        console.log(`  ${status}: ${varName} = ${value || '<null>'}`);
      });
    }

    console.log('='.repeat(60) + '\n');
  }

  /**
   * Print dry-run preview
   */
  private printDryRunPreview(templateName: string, processedContent: string): void {
    console.log('\n' + '='.repeat(60));
    console.log(`🔍 DRY-RUN PREVIEW: ${templateName}`);
    console.log('='.repeat(60));
    console.log(processedContent);
    console.log('='.repeat(60) + '\n');
  }
}
