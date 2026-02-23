/**
 * Rerun Extractor - Identify failed tests from reports and prepare for rerun
 */

import fs from 'fs';
import path from 'path';

export interface FailedTest {
  name: string;
  type: 'playwright' | 'cucumber';
  identifier: string; // grep pattern for playwright, tag for cucumber
}

/**
 * Extract failed tests from Blob report (Playwright)
 */
export function extractFailedPlaywrightTests(blobReportDir: string): FailedTest[] {
  const failed: FailedTest[] = [];

  try {
    const reportFile = path.join(blobReportDir, 'report.jsonl');
    if (!fs.existsSync(reportFile)) {
      return failed;
    }

    const content = fs.readFileSync(reportFile, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    lines.forEach(line => {
      try {
        const json = JSON.parse(line);
        // Check for failed tests
        if (json.status === 'failed' || !json.ok) {
          failed.push({
            name: json.title || 'Unknown',
            type: 'playwright',
            identifier: json.title || json.name || ''
          });
        }
      } catch (e) {
        // Skip invalid JSON
      }
    });

    if (failed.length > 0) {
      console.log(`🔍 Found ${failed.length} failed Playwright test(s):`);
      failed.forEach((t, i) => {
        console.log(`   ${i + 1}. ${t.name}`);
      });
    }
  } catch (err) {
    console.warn('⚠️ Error extracting failed Playwright tests:', err);
  }

  return failed;
}

/**
 * Extract failed tests from junit XML results file (fallback when blob reports don't exist)
 */
export function extractFailedTestsFromJunit(junitFile: string): FailedTest[] {
  const failed: FailedTest[] = [];

  try {
    const content = fs.readFileSync(junitFile, 'utf-8');
    
    console.log(`  📄 Reading junit file: ${junitFile}`);
    console.log(`  📊 File size: ${content.length} bytes`);
    
    // Parse failure elements: <failure message="fill.spec.ts:15:13 Fill alias: fill" type="FAILURE">
    const failureMatch = content.match(/<failure\s+message="([^"]+)"/g);
    
    console.log(`  🔎 Regex match result: ${failureMatch ? failureMatch.length + ' matches' : 'no matches'}`);
    
    if (failureMatch && failureMatch.length > 0) {
      console.log(`  ✅ Found ${failureMatch.length} failure element(s)`);
      failureMatch.forEach((match, idx) => {
        console.log(`     [${idx + 1}] Raw match: "${match}"`);
        // Extract message like "fill.spec.ts:15:13 Fill alias: fill"
        const messageMatch = match.match(/message="([^"]+)"/);
        if (messageMatch) {
          const fullMessage = messageMatch[1];
          console.log(`     [${idx + 1}] Message: "${fullMessage}"`);
          // Extract test name from message (part after the last space)
          const parts = fullMessage.split(/\s+/);
          console.log(`     [${idx + 1}] Parts: ${JSON.stringify(parts)}`);
          if (parts.length > 1) {
            const testName = parts.slice(1).join(' ');
            console.log(`     [${idx + 1}] Test name: "${testName}"`);
            failed.push({
              name: testName,
              type: 'playwright',
              identifier: testName
            });
          }
        }
      });
    } else {
      console.log(`  ❌ No <failure> elements found in junit`);
    }
  } catch (err) {
    console.warn('⚠️ Error extracting failed tests from junit:', err);
  }

  console.log(`  📋 Junit extraction result: ${failed.length} failed test(s)`);
  return failed;
}

/**
 * Extract failed tests from Cucumber report
 */
export function extractFailedCucumberTests(cucumberReportFile: string): FailedTest[] {
  const failed: FailedTest[] = [];

  try {
    if (!fs.existsSync(cucumberReportFile)) {
      return failed;
    }

    const content = fs.readFileSync(cucumberReportFile, 'utf-8');
    const json = JSON.parse(content);
    const features = Array.isArray(json) ? json : [json];

    features.forEach(feature => {
      if (feature.elements) {
        feature.elements.forEach((scenario: any) => {
          // Check if scenario failed
          const hasFailed = scenario.steps?.some((step: any) => step.result?.status === 'failed');
          if (hasFailed || scenario.status === 'failed') {
            // Extract tags for identification
            const tags = scenario.tags?.map((t: any) => t.name).join('||') || '';
            failed.push({
              name: `${feature.name}::${scenario.name}`,
              type: 'cucumber',
              identifier: tags || scenario.name // Use tags if available, else scenario name
            });
          }
        });
      }
    });
  } catch (err) {
    console.warn('⚠️ Error extracting failed Cucumber tests:', err);
  }

  return failed;
}

/**
 * Extract failed tests from Allure results
 */
export function extractFailedAllureTests(allureResultsDir: string): FailedTest[] {
  const failed: FailedTest[] = [];

  try {
    if (!fs.existsSync(allureResultsDir)) {
      return failed;
    }

    const files = fs.readdirSync(allureResultsDir).filter(f => f.endsWith('-result.json'));

    files.forEach(file => {
      try {
        const filePath = path.join(allureResultsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);

        if (json.status === 'failed') {
          failed.push({
            name: json.name || 'Unknown',
            type: 'playwright', // Allure typically used with Playwright
            identifier: json.name || ''
          });
        }
      } catch (e) {
        // Skip invalid files
      }
    });
  } catch (err) {
    console.warn('⚠️ Error extracting failed Allure tests:', err);
  }

  return failed;
}

/**
 * Extract all failed tests from report directory
 */
export function extractFailedTests(reportDir: string, runner: 'playwright' | 'cucumber' | 'both' = 'both'): FailedTest[] {
  const allFailed: FailedTest[] = [];
  const uniqueTests = new Map<string, FailedTest>();

  console.log(`🔍 Extracting failed tests from ${reportDir}...`);

  // **PRIMARY SOURCE**: Extract from junit results (most reliable, shows actual failures)
  if (runner === 'playwright' || runner === 'both') {
    const junitFile = path.join(reportDir, 'e2e-junit-results.xml');
    if (fs.existsSync(junitFile)) {
      console.log('  Extracting from junit results...');
      const failed = extractFailedTestsFromJunit(junitFile);
      failed.forEach(t => {
        if (t.type === 'playwright') uniqueTests.set(t.identifier, t);
      });
    }
  }

  // SECONDARY: Extract from Playwright blob reports (if available and no junit)
  if (runner === 'playwright' || runner === 'both') {
    const blobDir = path.join(reportDir, 'blob-report');
    if (fs.existsSync(blobDir)) {
      console.log('  Extracting from blob reports...');
      const failed = extractFailedPlaywrightTests(blobDir);
      failed.forEach(t => uniqueTests.set(t.identifier, t));
    }
  }

  // Note: Skip Allure extraction because it marks retried tests as 'passed' even if they failed initially
  // Junit is more reliable for detecting actual failures with retries

  // Extract from Cucumber reports
  if (runner === 'cucumber' || runner === 'both') {
    const cucumberFile = path.join(reportDir, 'cucumber-report.json');
    if (fs.existsSync(cucumberFile)) {
      const failed = extractFailedCucumberTests(cucumberFile);
      failed.forEach(t => uniqueTests.set(t.name, t));
    }
  }

  const result = Array.from(uniqueTests.values());
  console.log(`📋 Found ${result.length} failed tests to rerun`);

  return result;
}

/**
 * Create @rerun.txt file for Cucumber rerun
 */
export function createCucumberRerunFile(failedTests: FailedTest[], outputPath: string): void {
  try {
    const cucumberFailed = failedTests.filter(t => t.type === 'cucumber');
    const tags = cucumberFailed
      .filter(t => t.identifier.includes('@'))
      .map(t => t.identifier)
      .filter((v, i, a) => a.indexOf(v) === i); // Deduplicate

    if (tags.length === 0) {
      console.log('⚠️ No Cucumber tags found for rerun');
      return;
    }

    // Create rerun file with tags
    const content = tags.join('\n');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, content, 'utf-8');

    console.log(`✅ Cucumber rerun file created: ${outputPath}`);
  } catch (err) {
    console.error('❌ Error creating Cucumber rerun file:', err);
  }
}

/**
 * Create @rerun.txt file for Playwright rerun (using grep patterns)
 */
export function createPlaywrightRerunFile(failedTests: FailedTest[], outputPath: string): void {
  try {
    const playwrightFailed = failedTests.filter(t => t.type === 'playwright');
    const patterns = playwrightFailed
      .map(t => t.identifier)
      .filter((v, i, a) => a.indexOf(v) === i); // Deduplicate

    if (patterns.length === 0) {
      console.log('⚠️ No Playwright patterns found for rerun');
      return;
    }

    // Create rerun file with grep patterns (one per line)
    const content = patterns.join('\n');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, content, 'utf-8');

    console.log(`✅ Playwright rerun file created with ${patterns.length} test pattern(s):`);
    patterns.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.substring(0, 70)}${p.length > 70 ? '...' : ''}`);
    });
  } catch (err) {
    console.error('❌ Error creating Playwright rerun file:', err);
  }
}
