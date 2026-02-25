import fs from 'fs';
import path from 'path';
import { sync } from 'glob';
import * as vars from '../helper/bundle/vars';
const config: any = {};

import { generateStepGroupsIfNeeded } from './sgGenerator';
import {
  getCachedFeatureFilePath,
  shouldUseCachedFeature,
  updateFeatureCacheMeta
} from './featureFileCache';
import { preprocessFeatureFile } from './featureFilePreProcess';

const featureFileCache = config?.cucumber?.featureFileCache || (vars.getConfigValue('cucumber.featureFileCache')|| false);
const isForce = process.argv.includes('--force');

console.log('🚀 Running preProcessEntry.ts...');
console.log(`⚙️ featureFileCache enabled: ${featureFileCache}`);
console.log(`⚙️ Force flag: ${isForce}`);

generateStepGroupsIfNeeded(isForce);

// RERUN MODE: Only preprocess features mentioned in @rerun.txt
let featureFiles: string[] = [];
const isRerun = process.env.PLAYQ_IS_RERUN === 'true';

if (isRerun) {
  console.log('ℹ️  RERUN MODE: Only preprocessing features from @rerun.txt');
  const rerunFile = path.join(process.env.PLAYQ_PROJECT_ROOT || process.cwd(), '@rerun.txt');
  
  if (fs.existsSync(rerunFile)) {
    const rerunContent = fs.readFileSync(rerunFile, 'utf-8');
    const scenarioPaths = rerunContent.split('\n').map(l => l.trim()).filter(Boolean);
    
    // Extract unique feature file paths from scenario paths (e.g., "_Temp/execution/forms.feature:8" -> "test/features/forms.feature")
    const uniqueFeatures = new Set<string>();
    scenarioPaths.forEach(scenarioPath => {
      // Remove line number: "_Temp/execution/forms.feature:8" -> "_Temp/execution/forms.feature"
      const featurePath = scenarioPath.split(':')[0];
      // Convert from _Temp/execution back to test/features
      const originalPath = featurePath.replace('_Temp/execution/', 'test/features/');
      uniqueFeatures.add(originalPath);
    });
    
    featureFiles = Array.from(uniqueFeatures);
    console.log(`📋 Found ${featureFiles.length} feature(s) to preprocess: ${featureFiles.join(', ')}`);
  } else {
    console.warn('⚠️  @rerun.txt not found, preprocessing all features');
    featureFiles = sync('test/features/**/*.feature');
  }
} else {
  // FRESH RUN: Process all features
  featureFiles = sync('test/features/**/*.feature');
}

if (!featureFiles.length) {
  console.warn('⚠️ No feature files found to preprocess');
}

// Clean up execution folder before generating new feature files
const executionDir = path.join('_Temp', 'execution');
if (fs.existsSync(executionDir)) {
  fs.rmSync(executionDir, { recursive: true, force: true });
  console.log(`🧹 Cleaned up execution folder: ${executionDir}`);
}

for (const originalPath of featureFiles) {
  console.log(`🔧 Processing: ${originalPath}`);
  const cachedPath = getCachedFeatureFilePath(originalPath);
  console.log(`📄 Cached path: ${cachedPath}`);

  if (featureFileCache && !isForce && shouldUseCachedFeature(originalPath, cachedPath)) {
    console.log(`✅ Using cached feature file: ${cachedPath}`);
    continue;
  }

  const updatedContent = preprocessFeatureFile(originalPath);
  if (!updatedContent || !updatedContent.trim().startsWith('Feature')) {
    console.warn(`❌ Skipping cache write for ${originalPath}: Invalid content. Preview:\n${(updatedContent || '').substring(0, 100)}`);
    continue;
  }

  fs.mkdirSync(path.dirname(cachedPath), { recursive: true });
  fs.writeFileSync(cachedPath, updatedContent, 'utf-8');
  console.log(`📥 Updated cached feature file: ${cachedPath}`);

  if (featureFileCache) {
    updateFeatureCacheMeta(originalPath, cachedPath);
  }
}