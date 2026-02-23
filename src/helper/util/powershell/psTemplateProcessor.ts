/**
 * PowerShell Template Processor
 * Processes PowerShell script templates with variable substitution
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
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
      const templatePath = await this.readTemplate(templateName);
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template file not found: ${templatePath}`);
      }

      const rawContent = fs.readFileSync(templatePath, 'utf-8');

      // Step 2: Extract and resolve variables
      const foundVars = this.resolver.extractVariables(rawContent);
      const resolvedVars = this.resolver.resolveAllVariables(foundVars, this.options.overrides);
      const nestedVars = this.resolver.resolveNestedVariables(resolvedVars, this.options.overrides);

      // Step 3: Process template
      const processedContent = await this.processTemplate(rawContent, nestedVars);

      // Step 4: Write processed template
      const outputPath = await this.writeProcessedTemplate(templateName, processedContent);

      // Step 5: Optionally execute
      if (this.options.run && !this.options.dryRun) {
        await this.executeScript(outputPath);
      }

      // Step 6: Print summary/preview
      if (this.options.dryRun) {
        this.printDryRunPreview(templateName, processedContent);
      } else {
        this.printSummary(templateName, outputPath, foundVars, nestedVars);
      }

      return {
        templateName,
        sourceDir: this.options.source,
        destDir: this.options.dest,
        outputPath: this.options.dryRun ? undefined : outputPath,
        foundVars,
        resolvedVars: nestedVars,
        processedContent,
        success: true,
      };
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
   * Read template file from source directory
   */
  private async readTemplate(templateName: string): Promise<string> {
    return path.join(
      process.env.PLAYQ_PROJECT_ROOT || process.cwd(),
      this.options.source,
      `${templateName}.ps1`
    );
  }

  /**
   * Write processed template to destination
   */
  private async writeProcessedTemplate(templateName: string, content: string): Promise<string> {
    const destDir = path.join(
      process.env.PLAYQ_PROJECT_ROOT || process.cwd(),
      this.options.dest
    );

    // Ensure destination directory exists
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const outputPath = path.join(destDir, `${templateName}_processed.ps1`);
    fs.writeFileSync(outputPath, content, 'utf-8');

    return outputPath;
  }

  /**
   * Process template by replacing variables
   */
  private async processTemplate(content: string, vars: TemplateVars): Promise<string> {
    let processed = content;

    for (const [varName, varValue] of Object.entries(vars)) {
      if (varValue === null) continue;
      const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g');
      processed = processed.replace(regex, varValue || '');
    }

    return processed;
  }

  /**
   * Execute PowerShell script
   */
  private async executeScript(scriptPath: string): Promise<void> {
    try {
      console.log(`\n🚀 Executing PowerShell script: ${scriptPath}`);
      const command = `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`;
      const result = execSync(command, { encoding: 'utf-8' });
      console.log(result);
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
