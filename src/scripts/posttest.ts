import minimist from 'minimist';
import { loadEnv } from '../helper/bundle/env';
import path from 'path';
import { rmSync } from 'fs';
const { execSync } = require('child_process');
import { vars } from '../global'


export function executePostTest() {

  loadEnv();

  if (process.env.PLAYQ_RUNNER === 'cucumber') {
    // CUCUMBER RUNNER
    } else {
    // PLAYWRIGHT RUNNER
    let allureSingleFile = (vars.getConfigValue('report.allure.singleFile') == 'true') ? '--single-file' : '';
    execSync(`npx allure generate ${allureSingleFile} ./test-results/allure-results --output ./test-results/allure-report`, { stdio: 'inherit', cwd: path.resolve(__dirname, '../../') });
    if ((process.env.PLAYQ_REPORT_OPEN || 'true').toLowerCase() !== 'false' && vars.getConfigValue('testExecution.autoReportOpen') !== 'false') {
      console.log('- [INFO] Opening Allure report...');
      execSync('npx allure open ./test-results/allure-report', { stdio: 'inherit', cwd: path.resolve(__dirname, '../../') });
    } else {
      console.log('- [INFO] Report open disabled using PLAYQ_REPORT_OPEN or config');
    }
   

  }

}

// If called directly (not imported)
if (require.main === module) {
  executePostTest();
}