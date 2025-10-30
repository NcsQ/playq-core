import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

function getVersion(command: string): string {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (error) {
    return 'Not installed';
  }
}

function getPackageVersion(packageName: string): string {
  try {
    const packageJsonPath = path.join(process.cwd(), 'node_modules', packageName, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      return packageJson.version;
    }
    return 'Not found';
  } catch (error) {
    return 'Error reading version';
  }
}

function getInstalledVersion(packageName: string): string {
  try {
    const output = execSync(`npm list ${packageName} --depth=0`, { encoding: 'utf8' });
    const match = output.match(new RegExp(`${packageName}@([\\d\\.]+)`));
    return match ? match[1] : 'Not found';
  } catch (error) {
    return 'Not installed';
  }
}


function getPackageInfo() {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    }
    return { name: 'Unknown', version: 'Unknown' };
  } catch (error) {
    return { name: 'Error reading package.json', version: 'Error' };
  }
}

console.log('🔍 PlayQ Framework Version Information\n');

console.log('| Component | Version |');
console.log('|-----------|---------|');
console.log(`| Programming Language (TypeScript) | ${getVersion('npx tsc --version').replace('Version ', '')} |`);
console.log(`| Runtime Environment (Node.js) | ${getVersion('node --version').replace('v', '')} |`);
console.log(`| Automation Framework (Playwright) | ${getInstalledVersion('@playwright/test')} |`);
console.log(`| Test Runner (Playwright Test Runner) | ${getInstalledVersion('@playwright/test')} |`);
console.log(`| BDD Framework (Cucumber) | ${getInstalledVersion('@cucumber/cucumber')} |`);
console.log(`| Reporting (Allure Playwright) | ${getInstalledVersion('allure-playwright')} |`);
console.log(`| Data Generation Utility (Faker.js) | ${getInstalledVersion('@faker-js/faker')} |`);
console.log(`| Cross Platform (cross-env) | ${getInstalledVersion('cross-env')} |`);
console.log(`| File Operations (rimraf) | ${getInstalledVersion('rimraf')} |`);

console.log('\n📦 Package Manager Information:');
console.log(`| npm | ${getVersion('npm --version')} |`);

const packageInfo = getPackageInfo();
console.log(`| Package Name | ${packageInfo.name || 'play-ts-cucumber'} |`);
console.log(`| Package Version | ${packageInfo.version || '1.0.0'} |`);