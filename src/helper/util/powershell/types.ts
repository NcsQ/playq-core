/**
 * Type definitions for PowerShell template processing
 */

export interface PsTemplateOptions {
  source: string;
  dest: string;
  overrides: Record<string, string>;
  run: boolean;
  dryRun: boolean;
}

export interface TemplateVars {
  [key: string]: string | null;
}

export interface ProcessingResult {
  templateName: string;
  sourceDir: string;
  destDir: string;
  outputPath?: string;
  foundVars: string[];
  resolvedVars: TemplateVars;
  processedContent?: string;
  success: boolean;
  error?: string;
}
