#!/usr/bin/env node
/**
 * PlayQ PowerShell Template CLI Handler
 * Processes PowerShell script templates with variable substitution
 *
 * Usage:
 *   npx playq ps-template <template-name> [options]
 *
 * Examples:
 *   npx playq ps-template db_run_script
 *   npx playq ps-template db_run_script --set DB_HOST=localhost --run
 *   npx playq ps-template db_run_script --dry-run
 */

import { PsTemplateProcessor } from '../helper/util/powershell/psTemplateProcessor';
import { PsTemplateOptions, ProcessingResult } from '../helper/util/powershell/types';
import minimist from 'minimist';

const DEFAULT_SOURCE_DIR = 'resources/powershell';
const DEFAULT_DEST_DIR = './test-data';


/**
 * Parse command-line arguments
 */
function parseArgs(): { templateName: string; options: PsTemplateOptions } {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const templateName = args[0];
  
  // Validate template name to prevent path traversal and injection
  if (!templateName || typeof templateName !== 'string' || templateName.trim() === '') {
    console.error('❌ Template name is required and cannot be empty');
    process.exit(1);
  }
  
  // Reject path traversal attempts
  if (templateName.includes('..') || templateName.includes('/') || templateName.includes('\\')) {
    console.error('❌ Invalid template name: path traversal characters (.. / \\) not allowed');
    process.exit(1);
  }
  
  // Only allow safe characters: alphanumeric, underscore, hyphen
  if (!/^[a-zA-Z0-9_-]+$/.test(templateName)) {
    console.error('❌ Invalid template name: only alphanumeric characters, underscore (_), and hyphen (-) are allowed');
    process.exit(1);
  }
  
  const parsedArgs = minimist(args.slice(1), {
    string: ['set'],
    boolean: ['run', 'dry-run', 'help'],
    alias: { h: 'help' },
  });

  const options: PsTemplateOptions = {
    source: DEFAULT_SOURCE_DIR,
    dest: DEFAULT_DEST_DIR,
    overrides: {},
    run: parsedArgs.run || false,
    dryRun: parsedArgs['dry-run'] || false,
  };

  // Parse and validate --set VAR=VALUE arguments
  if (parsedArgs.set) {
    const setValues = Array.isArray(parsedArgs.set) ? parsedArgs.set : [parsedArgs.set];
    setValues.forEach((setVal, idx) => {
      // Validate format: must contain '='
      if (!setVal || typeof setVal !== 'string') {
        console.error(`❌ Invalid --set argument #${idx + 1}: value must be a string`);
        process.exit(1);
      }
      
      if (!setVal.includes('=')) {
        console.error(`❌ Invalid --set argument #${idx + 1}: "${setVal}" (expected format: KEY=VALUE)`);
        process.exit(1);
      }
      
      const [rawKey, ...valueParts] = setVal.split('=');
      const key = rawKey.trim();
      const value = valueParts.join('=');  // Allow '=' in values
      
      // Validate key is not empty or whitespace-only
      if (!key) {
        console.error(`❌ Invalid --set argument #${idx + 1}: empty key in "${setVal}"`);
        process.exit(1);
      }
      
      // Validate key format: alphanumeric, underscore, starts with letter or underscore
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        console.error(`❌ Invalid --set argument #${idx + 1}: invalid key "${key}" (must start with letter or underscore, contain only alphanumeric and underscore)`);
        process.exit(1);
      }
      
      // Accept empty values - some templates may want empty strings
      options.overrides[key] = value;
    });
  }

  return { templateName, options: options as PsTemplateOptions };
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`PlayQ - PowerShell Template Processor

Usage: npx playq ps-template <template-name> [options]

Description:
  Processes PowerShell script templates by replacing variables.
  Variables are resolved from: CLI (highest) > var.static.json > Environment variables (lowest)

Options:
  --set VAR=VALUE    Override a variable (repeat for multiple variables)
  --run              Execute the script after processing
  --dry-run          Show what would be done without writing or executing
  --help, -h         Show this help message

Examples:
  npx playq ps-template db_run_script
  npx playq ps-template db_run_script --run
  npx playq ps-template db_run_script --set DB_HOST=localhost
  npx playq ps-template db_run_script --set DB_HOST=localhost --set DB_PORT=5432 --run
  npx playq ps-template backup_script --dry-run

Output:
  Generated scripts are saved to: ${DEFAULT_DEST_DIR}/
  Example: ${DEFAULT_DEST_DIR}/db_run_script_processed.ps1
`);
}

/**
 * Main execution function
 */
async function main() {
  try {
    const { templateName, options } = parseArgs();

    console.log(`\n🚀 Processing PowerShell template: ${templateName}`);

    const processor = new PsTemplateProcessor(options);
    
    // Add timeout protection to prevent infinite hangs
    const TIMEOUT_MS = 30000;  // 30 seconds
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Template processing timed out after ${TIMEOUT_MS / 1000} seconds`)),
        TIMEOUT_MS
      )
    );
    
    const result = await Promise.race([
      processor.process(templateName),
      timeoutPromise
    ]) as ProcessingResult;

    // Validate result object
    if (!result || typeof result !== 'object') {
      console.error('❌ Invalid response from template processor: expected object');
      process.exit(1);
    }

    if (!result.success) {
      const errorMsg = typeof result.error === 'string' 
        ? result.error 
        : 'Template processing failed without details';
      console.error(`\n❌ Failed to process template: ${errorMsg}`);
      process.exit(1);
    }

    // Validate / derive output path
    let outputPath: string;

    if (!options.dryRun) {
      // In non-dry-run mode we require a concrete output path from the processor
      if (!result.outputPath || typeof result.outputPath !== 'string') {
        console.error('❌ Template processor did not return a valid output path');
        process.exit(1);
      }
      outputPath = result.outputPath;
    } else {
      // In dry-run mode the processor may compute the output path; derive a reasonable fallback
      if (typeof result.outputPath === 'string' && result.outputPath) {
        outputPath = result.outputPath;
      } else {
        outputPath = `${DEFAULT_DEST_DIR}/${templateName}_processed.ps1`;
      }
    }

    if (options.dryRun) {
      console.log(`\n🔍 DRY-RUN: Would create file at: ${outputPath}`);
      if (options.run) {
        console.log(`🔍 DRY-RUN: Would execute script`);
      }
    } else {
      console.log(`\n✅ Script generated: ${outputPath}`);

      if (options.run) {
        console.log(`✅ Script executed successfully`);
      } else {
        console.log(`\n💡 To run the script, use:`);
        console.log(`   npx playq ps-template ${templateName} --set ... --run`);
        console.log(`   Or: powershell -NoProfile -File "${outputPath}"`);
      }
    }

    if (result.processedContent && typeof result.processedContent === 'string') {
      const maxChars = 500;
      const fullContent = result.processedContent;
      const isTruncated = fullContent.length > maxChars;
      
      // Cut at last newline to avoid mid-line truncation
      const truncatedAt = maxChars;
      const content = fullContent.substring(0, truncatedAt);
      const lastNewline = content.lastIndexOf('\n');
      const preview = lastNewline > 0 ? content.substring(0, lastNewline) : content;
      
      console.log(`\n📋 Script Preview:\n${preview}`);
      
      if (isTruncated) {
        const remainingChars = fullContent.length - preview.length;
        console.log(`\n... (${remainingChars} more characters. Use --dry-run to see full preview)`);
      }
    }

    process.exit(0);
  } catch (error) {
    // Safely extract error message from various error types
    let errorMessage = 'Unknown error occurred';
    let errorCode = undefined;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      if ('code' in error) {
        errorCode = (error as any).code;
      }
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = (error as any).message || JSON.stringify(error);
      if ('code' in error) {
        errorCode = (error as any).code;
      }
    }
    
    // Provide helpful error messages for common issues
    if (errorCode === 'EACCES' || errorCode === 'EPERM') {
      console.error(`\n❌ Permission denied: ${errorMessage}`);
      console.error('    Check file permissions or run with appropriate privileges');
    } else if (errorCode === 'ENOENT') {
      console.error(`\n❌ File not found: ${errorMessage}`);
    } else if (errorCode === 'ETIMEDOUT') {
      console.error(`\n❌ Operation timed out: ${errorMessage}`);
    } else {
      console.error(`\n❌ Error: ${errorMessage}`);
    }
    
    // Show stack trace if DEBUG environment variable is set
    if (process.env.DEBUG && error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Run main
main();
