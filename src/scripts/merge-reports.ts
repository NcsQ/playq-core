import fs from 'fs';
import path from 'path';
import { spawnSync, execSync } from 'child_process';
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

function findBlobReportDirs(projectRoot: string, verbose: boolean = true): string[] {
  const dirs: string[] = [];
  // Only check for actual report directories under test-results/
  // blob-report_merge is TEMP (working dir), blob-report_rerun is OUTPUT (final merged state)
  // - blob-report: Latest run (original or rerun)
  // - blob-report_full: Original first run (preserved during rerun)
  // - blob-report_rerun: Combined final state after merge (created from blob-report_merge)
  const candidates = [
    'test-results/blob-report',
    'test-results/blob-report_full',
    'test-results/blob-report_rerun'
  ];
  
  if (verbose) {
    console.log(`🔍 Searching for blob report directories in ${projectRoot}...`);
  }
  for (const candidate of candidates) {
    const dirPath = path.join(projectRoot, candidate);
    const exists = fs.existsSync(dirPath);
    const isDir = exists && fs.statSync(dirPath).isDirectory();
    if (verbose) {
      console.log(`   ${candidate}: ${isDir ? '✓ FOUND' : '✗ not found'}`);
    }
    
    if (isDir) {
      dirs.push(dirPath);
    }
  }
  
  return dirs;
}

function generateCombinedCucumberHTML(projectRoot: string, originalJson: any[], rerunJson: any[]): string {
  const combinedHtmlPath = path.join(projectRoot, 'test-results/cucumber-report-combined.html');
  
  // Calculate statistics for both runs
  const getStats = (report: any[]) => {
    const scenarios = report.reduce((sum: number, f: any) => sum + (f.elements?.length || 0), 0);
    const steps = report.reduce((sum: number, f: any) => 
      sum + (f.elements?.reduce((s: number, e: any) => s + (e.steps?.length || 0), 0) || 0), 0);
    const passed = report.reduce((sum: number, f: any) => 
      sum + (f.elements?.filter((e: any) => e.steps?.every((s: any) => s.result?.status === 'passed')).length || 0), 0);
    const failed = scenarios - passed;
    return { scenarios, steps, passed, failed };
  };
  
  const originalStats = getStats(originalJson);
  const rerunStats = getStats(rerunJson);
  
  const generateReportCard = (title: string, badgeClass: string, report: any[]): string => {
    const stats = getStats(report);
    let scenariosHtml = '';
    
    report.forEach((feature: any) => {
      feature.elements?.forEach((scenario: any) => {
        const allPassed = scenario.steps?.every((s: any) => s.result?.status === 'passed');
        const status = allPassed ? 'passed' : 'failed';
        
        let stepsHtml = '';
        scenario.steps?.forEach((step: any) => {
          const stepStatus = step.result?.status || 'skipped';
          const errorMsg = step.result?.error_message || '';
          stepsHtml += '<div class="step ' + stepStatus + '">';
          stepsHtml += '<span class="step-keyword">' + step.keyword + '</span>' + step.name;
          if (errorMsg) {
            stepsHtml += '<div class="error-message">' + errorMsg.substring(0, 500) + '</div>';
          }
          stepsHtml += '</div>';
        });
        
        scenariosHtml += '<div class="scenario">';
        scenariosHtml += '<div class="scenario-header" onclick="toggleScenario(event)">';
        scenariosHtml += '<span class="scenario-title">' + scenario.name + '</span>';
        scenariosHtml += '<span class="scenario-status status-' + status + '">' + status.toUpperCase() + '</span>';
        scenariosHtml += '</div>';
        scenariosHtml += '<div class="scenario-steps">' + stepsHtml + '</div>';
        scenariosHtml += '</div>';
      });
    });
    
    return `
      <div class="report-card">
        <h2><span class="badge ${badgeClass}">${title}</span></h2>
        <div class="stats">
          <div class="stat">
            <div class="stat-value">${stats.scenarios}</div>
            <div class="stat-label">Scenarios</div>
          </div>
          <div class="stat">
            <div class="stat-value">${stats.steps}</div>
            <div class="stat-label">Steps</div>
          </div>
          <div class="stat">
            <div class="stat-value passed">${stats.passed}</div>
            <div class="stat-label">Passed</div>
          </div>
          <div class="stat">
            <div class="stat-value failed">${stats.failed}</div>
            <div class="stat-label">Failed</div>
          </div>
        </div>
        ${scenariosHtml}
      </div>
    `;
  };
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PlayQ Combined Test Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
    .header h1 { font-size: 32px; margin-bottom: 10px; }
    .header p { font-size: 16px; opacity: 0.9; }
    .container { max-width: 1400px; margin: 0 auto; }
    .reports-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .report-card { background: white; border-radius: 10px; padding: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .report-card h2 { font-size: 24px; margin-bottom: 20px; color: #333; display: flex; align-items: center; gap: 10px; }
    .report-card h2 .badge { font-size: 14px; padding: 4px 12px; border-radius: 20px; font-weight: normal; }
    .badge.original { background: #e3f2fd; color: #1976d2; }
    .badge.rerun { background: #fff3e0; color: #f57c00; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
    .stat { text-align: center; padding: 15px; background: #f9f9f9; border-radius: 8px; }
    .stat-value { font-size: 32px; font-weight: bold; margin-bottom: 5px; }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .stat-value.passed { color: #4caf50; }
    .stat-value.failed { color: #f44336; }
    .scenario { border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 15px; overflow: hidden; }
    .scenario-header {padding: 15px; background: #fafafa; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
    .scenario-header:hover { background: #f0f0f0; }
    .scenario-title { font-weight: 600; font-size: 16px; }
    .scenario-status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .status-passed { background: #e8f5e9; color: #2e7d32; }
    .status-failed { background: #ffebee; color: #c62828; }
    .scenario-steps { padding: 15px; background: white; display: none; }
    .scenario.expanded .scenario-steps { display: block; }
    .step { padding: 10px; margin-bottom: 8px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 13px; }
    .step.passed { background: #f1f8f4; border-left: 4px solid #4caf50; }
    .step.failed { background: #ffebee; border-left: 4px solid #f44336; }
    .step.skipped { background: #fff9e6; border-left: 4px solid #ff9800; opacity: 0.7; }
    .step-keyword { font-weight: bold; color: #666; }
    .error-message { background: #fff3f3; border: 1px solid #ffcdd2; border-radius: 6px; padding: 15px; margin-top: 10px; font-family: 'Courier New', monospace; font-size: 12px; color: #c62828; }
    .comparison { background: white; border-radius: 10px; padding: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-top: 20px; }
    .comparison h2 { font-size: 24px; margin-bottom: 20px; color: #333; }
    .comparison-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .comparison-item { text-align: center; padding: 20px; background: #f9f9f9; border-radius: 8px; }
    .comparison-label { font-size: 14px; color: #666; margin-bottom: 10px; }
    .comparison-values { display: flex; justify-content: center; align-items: center; gap: 15px; }
    .comparison-value { font-size: 28px; font-weight: bold; }
    .arrow { font-size: 20px; color: #999; }
    .improved { color: #4caf50; }
    .same { color: #ff9800; }
    .worse { color: #f44336; }
  </style>
  <script>
    function toggleScenario(event) {
      const scenario = event.currentTarget.closest('.scenario');
      scenario.classList.toggle('expanded');
    }
  </script>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎭 PlayQ Test Report - Comparison View</h1>
      <p>Original Run vs Rerun - Test Execution Results</p>
    </div>

    <div class="comparison">
      <h2>📊 Results Comparison</h2>
      <div class="comparison-grid">
        <div class="comparison-item">
          <div class="comparison-label">Scenarios</div>
          <div class="comparison-values">
            <span class="comparison-value">${originalStats.scenarios}</span>
            <span class="arrow">→</span>
            <span class="comparison-value ${rerunStats.scenarios === originalStats.scenarios ? 'same' : ''}">${rerunStats.scenarios}</span>
          </div>
        </div>
        <div class="comparison-item">
          <div class="comparison-label">Passed Tests</div>
          <div class="comparison-values">
            <span class="comparison-value">${originalStats.passed}</span>
            <span class="arrow">→</span>
            <span class="comparison-value ${rerunStats.passed > originalStats.passed ? 'improved' : rerunStats.passed < originalStats.passed ? 'worse' : 'same'}">${rerunStats.passed}</span>
          </div>
        </div>
        <div class="comparison-item">
          <div class="comparison-label">Failed Tests</div>
          <div class="comparison-values">
            <span class="comparison-value">${originalStats.failed}</span>
            <span class="arrow">→</span>
            <span class="comparison-value ${rerunStats.failed < originalStats.failed ? 'improved' : rerunStats.failed > originalStats.failed ? 'worse' : 'same'}">${rerunStats.failed}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="reports-grid">
      ${generateReportCard('Original Test Run', 'original', originalJson)}
      ${generateReportCard('Rerun Test Results', 'rerun', rerunJson)}
    </div>
  </div>
</body>
</html>`;
  
  fs.writeFileSync(combinedHtmlPath, html, 'utf-8');
  return combinedHtmlPath;
}

function mergeCucumberReports(projectRoot: string, shouldOpen: boolean = false): void {
  const cucumberJsonPath = path.join(projectRoot, 'test-results/cucumber-report.json');
  const cucumberRerunJsonPath = path.join(projectRoot, 'test-results/cucumber-report-rerun.json');
  const cucumberHtmlPath = path.join(projectRoot, 'test-results/cucumber-report.html');
  
  // Check if both original and rerun reports exist
  const hasOriginal = fs.existsSync(cucumberJsonPath);
  const hasRerun = fs.existsSync(cucumberRerunJsonPath);
  
  if (!hasOriginal && !hasRerun) {
    console.log('ℹ️  No Cucumber reports found');
    return;
  }
  
  try {
    let report: any[] = [];
    let reportDescription = '';
    let htmlToOpen = cucumberHtmlPath; // Default to original HTML
    
    if (hasOriginal && hasRerun) {
      // Merge both reports: original run + rerun results
      console.log(`\n📝 Merging Cucumber reports (original + rerun)...`);
      const originalReport = JSON.parse(fs.readFileSync(cucumberJsonPath, 'utf-8'));
      const rerunReport = JSON.parse(fs.readFileSync(cucumberRerunJsonPath, 'utf-8'));
      
      // Generate combined HTML showing both test runs side-by-side
      console.log(`\n🎨 Generating combined HTML report...`);
      const combinedHtmlPath = generateCombinedCucumberHTML(projectRoot, originalReport, rerunReport);
      console.log(`   ✅ Combined report: ${path.relative(projectRoot, combinedHtmlPath)}`);
      
      // Create a merged report showing what was retested
      // Group scenarios by feature name and merge rerun results
      const mergedMap = new Map<string, any>();
      
      // Start with original report
      originalReport.forEach((feature: any) => {
        mergedMap.set(feature.name, JSON.parse(JSON.stringify(feature)));
      });
      
      // Overlay rerun results (these are the retested scenarios)
      rerunReport.forEach((feature: any) => {
        const existingFeature = mergedMap.get(feature.name);
        if (existingFeature) {
          // Merge scenarios: keep original failures, update with rerun results
          const rerunElementMap = new Map<string, any>();
          feature.elements?.forEach((elem: any) => {
            rerunElementMap.set(elem.name, elem);
          });
          
          existingFeature.elements = existingFeature.elements?.map((elem: any) => {
            const rerunElem = rerunElementMap.get(elem.name);
            if (rerunElem) {
              // Use rerun result (it might be fixed now)
              return { ...elem, ...rerunElem, rerun: true };
            }
            return elem;
          }) || [];
        } else {
          // New scenarios only in rerun
          mergedMap.set(feature.name, { ...feature, rerun: true });
        }
      });
      
      report = Array.from(mergedMap.values());
      reportDescription = `(Original: ${originalReport.length} features, Rerun: ${rerunReport.length} features)`;
      
      // Set combined HTML as the one to open
      if (shouldOpen) {
        htmlToOpen = combinedHtmlPath;
      }
    } else if (hasRerun) {
      // Only rerun results
      report = JSON.parse(fs.readFileSync(cucumberRerunJsonPath, 'utf-8'));
      reportDescription = '(Rerun Results)';
    } else {
      // Only original results
      report = JSON.parse(fs.readFileSync(cucumberJsonPath, 'utf-8'));
      reportDescription = '(Original Results)';
    }
    
    const totalScenarios = report.reduce((sum: number, f: any) => sum + (f.elements?.length || 0), 0);
    const totalSteps = report.reduce((sum: number, f: any) => 
      sum + (f.elements?.reduce((s: number, e: any) => s + (e.steps?.length || 0), 0) || 0), 0);
    
    const passed = report.reduce((sum: number, f: any) => 
      sum + (f.elements?.filter((e: any) => e.steps?.every((s: any) => s.result.status === 'passed')).length || 0), 0);
    
    console.log(`\n✅ Cucumber Report Summary ${reportDescription}:`);
    console.log(`   Features: ${report.length}`);
    console.log(`   Scenarios: ${totalScenarios}`);
    console.log(`   Steps: ${totalSteps}`);
    console.log(`   Passed: ${passed} / ${totalScenarios}`);
    console.log(`   Location: ${path.relative(projectRoot, cucumberJsonPath)}`);
    
    // If combined HTML wasn't created (single run only), determine which HTML to open
    if (!hasOriginal || !hasRerun) {
      htmlToOpen = fs.existsSync(cucumberRerunJsonPath) 
        ? path.join(projectRoot, 'test-results/cucumber-report-rerun.html')
        : cucumberHtmlPath;
    }
    
    // Open Cucumber HTML report if available and requested
    if (shouldOpen && fs.existsSync(htmlToOpen)) {
      console.log(`\n🌐 Opening Cucumber report in browser...`);
      try {
        if (process.platform === 'win32') {
          // Windows: use execSync with proper shell command
          execSync(`start "" "${htmlToOpen}"`, { 
            stdio: 'inherit',
            shell: 'cmd.exe'
          });
        } else if (process.platform === 'darwin') {
          // Mac
          spawnSync('open', [htmlToOpen], { 
            stdio: 'inherit'
          });
        } else {
          // Linux
          spawnSync('xdg-open', [htmlToOpen], { 
            stdio: 'inherit'
          });
        }
      } catch (err) {
        console.warn(`⚠️  Could not open report:`, err);
      }
    } else if (shouldOpen && !fs.existsSync(htmlToOpen)) {
      console.log(`\n⚠️  Cucumber HTML report not found at: ${path.relative(projectRoot, htmlToOpen)}`);
      console.log(`   Make sure your cucumber.js config includes HTML formatter`);
    }
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
  
  // Track used filenames to prevent overwrites
  const usedNames = new Set<string>();
  
  for (const srcFile of blobFiles) {
    const fileName = path.basename(srcFile);
    const srcDir = path.basename(path.dirname(srcFile));  // e.g., "blob-report" or "blob-report_full"
    
    let destFileName = fileName;
    
    // If filename already used, prefix with source directory to make unique
    if (usedNames.has(fileName)) {
      // Extract report ID from filename (e.g., "report-327db57.zip" → "327db57")
      const match = fileName.match(/^report-(.+)(\.(jsonl|zip))$/);
      if (match) {
        const reportId = match[1];
        const ext = match[2];
        destFileName = `report-${srcDir}-${reportId}${ext}`;
      } else {
        // Fallback: just prefix with source directory
        destFileName = `${srcDir}_${fileName}`;
      }
      console.log(`   ⚠️  Renamed duplicate: ${fileName} → ${destFileName}`);
    }
    
    usedNames.add(fileName);
    const destFile = path.join(targetDir, destFileName);
    
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
    mergeCucumberReports(projectRoot, args.open);
  }
  
  // Merge Playwright blob reports if requested
  if (shouldMergePlaywright) {
    // Only show verbose output if explicitly requesting Playwright reports
    const verbose = args.runner === 'playwright';
    const blobDirs = findBlobReportDirs(projectRoot, verbose);
    
    if (blobDirs.length === 0) {
      // Only show error styling if Playwright was explicitly requested
      if (args.runner === 'playwright') {
        console.log('❌ No blob report directories found in test-results/');
        console.log('   Run tests first to generate blob reports.');
        process.exit(1);
      }
      // Silent skip when running 'all' mode and no Playwright reports exist
    } else {
      console.log('\n🔍 Scanning for Playwright blob report directories...');
      console.log(`📁 Found ${blobDirs.length} blob report director(ies):`);
      blobDirs.forEach(dir => console.log(`   - ${path.relative(projectRoot, dir)}`));
      
      console.log('\n📋 Collecting blob files...');
      const blobFiles = collectBlobFiles(blobDirs);
      
      if (blobFiles.length === 0) {
        console.log('❌ No blob report files found (report-*.jsonl or report-*.zip)');
        console.log('   Make sure your Playwright config includes the "blob" reporter.');
        if (args.runner === 'playwright') {
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
        
        // Preserve merged blob reports as blob-report_rerun for final archival
        // This represents the combined state of ALL test runs (original + reruns)
        const rerunDir = path.join(projectRoot, 'test-results/blob-report_rerun');
        try {
          if (fs.existsSync(rerunDir)) {
            fs.rmSync(rerunDir, { recursive: true, force: true });
          }
          fs.renameSync(mergeDir, rerunDir);
          console.log(`📦 Preserved merged blob reports: ${path.relative(projectRoot, rerunDir)}`);
        } catch (err) {
          console.warn(`⚠️  Could not preserve merged blob reports:`, (err as any)?.message);
        }
        
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
