import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import minimist from 'minimist';

/**
 * Merge Playwright blob reports from multiple directories into a unified HTML report.
 * Cross-platform implementation for Mac, Windows, and Linux.
 * 
 * Usage:
 *   npx playq merge-reports [--open] [--config <path>]
 * 
 * Options:
 *   --open    Open the merged HTML report in browser after generation
 *   --config  Path to Playwright merge config (default: playq/config/playwright/merge.config.js)
 */

function findBlobReportDirs(projectRoot: string): string[] {
  const dirs: string[] = [];
  // Only check for actual report directories under test-results/
  // blob-report_merge is OUTPUT, not source
  const candidates = [
    'test-results/blob-report',
    'test-results/blob-report_full',
    'test-results/blob-report_combined'
  ];
  
  for (const candidate of candidates) {
    const dirPath = path.join(projectRoot, candidate);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      dirs.push(dirPath);
    }
  }
  
  return dirs;
}

function collectBlobFiles(dirs: string[]): string[] {
  const blobFiles: string[] = [];
  
  for (const dir of dirs) {
    try {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        // Playwright blob reports are typically named report-*.jsonl or report-*.zip
        if (entry.startsWith('report-') && (entry.endsWith('.jsonl') || entry.endsWith('.zip'))) {
          blobFiles.push(path.join(dir, entry));
        }
      }
    } catch (err) {
      console.warn(`⚠️  Warning: Could not read directory ${dir}:`, err);
    }
  }
  
  return blobFiles;
}

function copyBlobFiles(blobFiles: string[], targetDir: string): void {
  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  for (const srcFile of blobFiles) {
    const fileName = path.basename(srcFile);
    const destFile = path.join(targetDir, fileName);
    
    try {
      fs.copyFileSync(srcFile, destFile);
    } catch (err) {
      console.warn(`⚠️  Warning: Could not copy ${srcFile}:`, err);
    }
  }
}

function main() {
  const args = minimist(process.argv.slice(2), {
    boolean: ['open', 'help'],
    string: ['config'],
    alias: { h: 'help' },
    default: {
      config: 'playq/config/playwright/merge.config.js'
    }
  });
  
  if (args.help) {
    console.log(`
PlayQ Merge Reports - Combine Playwright blob reports into unified HTML

Usage:
  npx playq merge-reports [options]

Options:
  --open           Open the merged HTML report in browser after generation
  --config <path>  Path to Playwright merge config (default: playq/config/playwright/merge.config.js)
  --help, -h       Show this help message

Examples:
  npx playq merge-reports --open
  npx playq merge-reports --config custom-merge.config.js
`);
    process.exit(0);
  }
  
  const projectRoot = process.cwd();
  const mergeDir = path.join(projectRoot, 'test-results/blob-report_merge');
  const htmlReportDir = path.join(projectRoot, 'test-results/playwright-report');
  
  console.log('🔍 Scanning for blob report directories...');
  const blobDirs = findBlobReportDirs(projectRoot);
  
  if (blobDirs.length === 0) {
    console.log('❌ No blob report directories found in test-results/');
    console.log('   Run tests first to generate blob reports.');
    process.exit(1);
  }
  
  console.log(`📁 Found ${blobDirs.length} blob report director(ies):`);
  blobDirs.forEach(dir => console.log(`   - ${path.relative(projectRoot, dir)}`));
  
  console.log('\n📋 Collecting blob files...');
  const blobFiles = collectBlobFiles(blobDirs);
  
  if (blobFiles.length === 0) {
    console.log('❌ No blob report files found (report-*.jsonl or report-*.zip)');
    console.log('   Make sure your Playwright config includes the "blob" reporter.');
    process.exit(1);
  }
  
  console.log(`✅ Found ${blobFiles.length} blob file(s)`);
  
  // Clean merge directory if it exists
  if (fs.existsSync(mergeDir)) {
    console.log(`🧹 Cleaning existing merge directory: ${path.relative(projectRoot, mergeDir)}`);
    fs.rmSync(mergeDir, { recursive: true, force: true });
  }
  
  console.log(`📦 Copying blob files to: ${path.relative(projectRoot, mergeDir)}`);
  copyBlobFiles(blobFiles, mergeDir);
  
  // Check if merge config exists
  const configPath = path.isAbsolute(args.config) 
    ? args.config 
    : path.join(projectRoot, args.config);
  
  const configExists = fs.existsSync(configPath);
  const configArg = configExists ? ` -c "${args.config}"` : '';
  
  if (configExists) {
    console.log(`⚙️  Using merge config: ${args.config}`);
  } else {
    console.log('ℹ️  No merge config specified, using Playwright defaults');
  }
  
  // Build merge command
  const relMergeDir = path.relative(projectRoot, mergeDir).replace(/\\/g, '/');
  const mergeCmd = `npx playwright merge-reports${configArg} --reporter html "${relMergeDir}"`;
  
  console.log(`\n🔀 Merging reports into HTML...`);
  console.log(`   Running: ${mergeCmd}`);
  
  try {
    execSync(mergeCmd, { 
      cwd: projectRoot, 
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    console.log(`\n✅ Reports merged successfully!`);
    console.log(`📊 HTML report generated at: ${path.relative(projectRoot, htmlReportDir)}`);
    
    // Open report if requested
    if (args.open) {
      console.log(`\n🌐 Opening report in browser...`);
      const openCmd = 'npx playwright show-report';
      
      try {
        execSync(openCmd, { 
          cwd: projectRoot, 
          stdio: 'inherit',
          env: { ...process.env }
        });
      } catch (err: any) {
        // Exit code 130 is normal (user closed the viewer)
        if (err.status !== 130) {
          console.warn('⚠️  Could not open report viewer:', err.message);
        }
      }
    } else {
      console.log(`\n💡 To view the report, run: npx playwright show-report`);
    }
    
  } catch (err: any) {
    console.error('\n❌ Failed to merge reports:', err.message);
    process.exit(1);
  }
}

// Run the script
main();
