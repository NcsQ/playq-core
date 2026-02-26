import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import minimist from 'minimist';

/**
 * Merge test reports (Playwright blob reports + Cucumber JSON reports) into unified reports.
 * - Playwright: Merges blob reports into HTML report
 * - Cucumber: Displays aggregated JSON report summary
 * Cross-platform implementation for Mac, Windows, and Linux.
 * 
 * Usage:
 *   npx playq merge-reports [--open] [--config <path>] [--runner cucumber|playwright|all]
 * 
 * Options:
 *   --open    Open the merged HTML report in browser after generation
 *   --config  Path to Playwright merge config (default: playq/config/playwright/merge.config.js)
 *   --runner  Which reports to merge: cucumber | playwright | all (default: all)
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
  
  console.log(`🔍 Searching for blob report directories in ${projectRoot}...`);
  for (const candidate of candidates) {
    const dirPath = path.join(projectRoot, candidate);
    const exists = fs.existsSync(dirPath);
    const isDir = exists && fs.statSync(dirPath).isDirectory();
    console.log(`   ${candidate}: ${isDir ? '✓ FOUND' : '✗ not found'}`);
    
    if (isDir) {
      dirs.push(dirPath);
    }
  }
  
  return dirs;
}

function mergeCucumberReports(projectRoot: string): void {
  const cucumberPath = path.join(projectRoot, 'test-results/cucumber-report.json');
  
  if (!fs.existsSync(cucumberPath)) {
    console.log('ℹ️  No Cucumber reports found');
    return;
  }
  
  try {
    const report = JSON.parse(fs.readFileSync(cucumberPath, 'utf-8'));
    const totalScenarios = report.reduce((sum: number, f: any) => sum + (f.elements?.length || 0), 0);
    const totalSteps = report.reduce((sum: number, f: any) => 
      sum + (f.elements?.reduce((s: number, e: any) => s + (e.steps?.length || 0), 0) || 0), 0);
    
    const passed = report.reduce((sum: number, f: any) => 
      sum + (f.elements?.filter((e: any) => e.steps?.every((s: any) => s.result.status === 'passed')).length || 0), 0);
    
    console.log(`\n✅ Cucumber Report Summary:`);
    console.log(`   Features: ${report.length}`);
    console.log(`   Scenarios: ${totalScenarios}`);
    console.log(`   Steps: ${totalSteps}`);
    console.log(`   Passed: ${passed} / ${totalScenarios}`);
    console.log(`   Location: ${path.relative(projectRoot, cucumberPath)}`);
  } catch (err) {
    console.warn('⚠️  Could not parse Cucumber report:', err);
  }
}

function collectBlobFiles(dirs: string[]): string[] {
  const blobFiles: string[] = [];
  
  for (const dir of dirs) {
    try {
      const entries = fs.readdirSync(dir);
      console.log(`   Directory ${path.basename(dir)}: ${entries.length} entries`);
      
      for (const entry of entries) {
        // Playwright blob reports are typically named report-*.jsonl or report-*.zip
        if (entry.startsWith('report-') && (entry.endsWith('.jsonl') || entry.endsWith('.zip'))) {
          const filePath = path.join(dir, entry);
          blobFiles.push(filePath);
          console.log(`      ✓ ${entry}`);
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
    string: ['config', 'runner'],
    alias: { h: 'help' },
    default: {
      config: 'playq/config/playwright/merge.config.js',
      runner: 'all'
    }
  });
  
  if (args.help) {
    console.log(`
PlayQ Merge Reports - Combine test reports into unified results

Supports:
  - Playwright: Merges blob reports into HTML report
  - Cucumber: Displays aggregated JSON report summary

Usage:
  npx playq merge-reports [options]

Options:
  --open           Open the merged HTML report in browser after generation (Playwright only)
  --config <path>  Path to Playwright merge config (default: playq/config/playwright/merge.config.js)
  --runner <type>  Report type: cucumber | playwright | all (default: all)
  --help, -h       Show this help message

Examples:
  npx playq merge-reports --open
  npx playq merge-reports --runner playwright --open
  npx playq merge-reports --runner cucumber
  npx playq merge-reports --config custom-merge.config.js
`);
    process.exit(0);
  }
  
  // Validate runner argument
  const validRunners = ['cucumber', 'playwright', 'all'];
  if (!validRunners.includes(args.runner)) {
    console.error(`❌ Invalid --runner value: "${args.runner}"`);
    console.error(`   Valid options: ${validRunners.join(', ')}`);
    process.exit(1);
  }
  
  const projectRoot = process.cwd();
  const mergeDir = path.join(projectRoot, 'test-results/blob-report_merge');
  const htmlReportDir = path.join(projectRoot, 'test-results/playwright-report');
  
  const shouldMergeCucumber = args.runner === 'cucumber' || args.runner === 'all';
  const shouldMergePlaywright = args.runner === 'playwright' || args.runner === 'all';
  
  // Merge Cucumber reports if requested
  if (shouldMergeCucumber) {
    console.log('📊 Processing Cucumber reports...');
    mergeCucumberReports(projectRoot);
  }
  
  // Merge Playwright blob reports if requested
  if (shouldMergePlaywright) {
    console.log('\n🔍 Scanning for Playwright blob report directories...');
    const blobDirs = findBlobReportDirs(projectRoot);
    
    if (blobDirs.length === 0) {
      console.log('❌ No blob report directories found in test-results/');
      console.log('   Run tests first to generate blob reports.');
      if (shouldMergePlaywright && !shouldMergeCucumber) {
        process.exit(1);
      }
    } else {
      console.log(`📁 Found ${blobDirs.length} blob report director(ies):`);
      blobDirs.forEach(dir => console.log(`   - ${path.relative(projectRoot, dir)}`));
      
      console.log('\n📋 Collecting blob files...');
      const blobFiles = collectBlobFiles(blobDirs);
      
      if (blobFiles.length === 0) {
        console.log('❌ No blob report files found (report-*.jsonl or report-*.zip)');
        console.log('   Make sure your Playwright config includes the "blob" reporter.');
        if (shouldMergePlaywright && !shouldMergeCucumber) {
          process.exit(1);
        }
      } else {
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
        
        if (configExists) {
          console.log(`⚙️  Using merge config: ${args.config}`);
        } else {
          console.log('ℹ️  No merge config specified, using Playwright defaults');
        }
        
        // Normalize merge dir path to forward slashes for Playwright
        const relMergeDir = path.relative(projectRoot, mergeDir).replace(/\\/g, '/');
        
        // Build command array: npx playwright merge-reports [--config <path>] --reporter html <dir>
        const args_array = ['playwright', 'merge-reports'];
        if (configExists) {
          args_array.push('--config', args.config);
        }
        args_array.push('--reporter', 'html', relMergeDir);
        
        console.log(`\n🔀 Merging Playwright reports into HTML...`);
        console.log(`   Running: npx ${args_array.join(' ')}`);
        
        const result = spawnSync('npx', args_array, { 
          cwd: projectRoot, 
          stdio: 'inherit',
          env: { ...process.env },
          shell: true
        });
        
        if (result.error) {
          console.error('\n❌ Failed to launch merge command:', result.error.message);
          process.exit(1);
        }
        
        if (result.status !== 0) {
          console.error('\n❌ Failed to merge Playwright reports');
          process.exit(1);
        }
          
        console.log(`\n✅ Playwright reports merged successfully!`);
        const effectiveHtmlReportDir = configExists ? htmlReportDir : path.join(projectRoot, 'playwright-report');
        console.log(`📊 HTML report generated at: ${path.relative(projectRoot, effectiveHtmlReportDir)}`);
        
        // Open report if requested
        if (args.open) {
          console.log(`\n🌐 Opening Playwright report in browser...`);
          const openArgs = ['playwright', 'show-report'];
          if (configExists) {
            openArgs.push(path.relative(projectRoot, effectiveHtmlReportDir));
          }
          
          const openResult = spawnSync('npx', openArgs, { 
            cwd: projectRoot, 
            stdio: 'inherit',
            env: { ...process.env },
            shell: true
          });
          
          // Exit code 130 is normal (user closed the viewer)
          if (openResult.status !== 0 && openResult.status !== 130) {
            if (openResult.error) {
              console.warn('⚠️  Could not open report viewer:', openResult.error.message);
            } else {
              console.warn(`⚠️  Report viewer exited with code ${openResult.status}`);
            }
          }
        } else {
          console.log(`\n💡 To view the Playwright report, run: npx playwright show-report`);
        }
      }
    }
  }
  
  console.log(`\n✅ Report merge complete!`);
}

// Run the script
main();
