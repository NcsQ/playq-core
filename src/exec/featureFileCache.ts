import fs from 'fs';
import path from 'path';
import * as vars from '../helper/bundle/vars';
const config: any = {};

const FEATURE_META_PATH = path.resolve('_Temp/.cache/featureMeta.json');

/**
 * Returns the path to the cached feature file inside _Temp/execution/
 */
export function getCachedFeatureFilePath(originalPath: string): string {
  const filename = path.basename(originalPath);
  return path.resolve('_Temp/execution', filename);
}

/**
 * Determines if the cached feature should be used.
 * Checks:
 *  - config.cucumber.featureFileCache is enabled
 *  - cached file and metadata exist
 *  - cached timestamp is newer than original file
 */
export function shouldUseCachedFeature(originalPath: string, cachedPath: string): boolean {
  // Logging for cache check
  console.log(`🔍 Cache check started for: ${originalPath}`);
  if (!config?.cucumber?.featureFileCache || vars.getConfigValue('cucumber.featureFileCache')) return false;
  if (!fs.existsSync(cachedPath)) return false;
  if (!fs.existsSync(FEATURE_META_PATH)) return false;
  try {
    const meta = JSON.parse(fs.readFileSync(FEATURE_META_PATH, 'utf-8'));
    const originalStats = fs.statSync(originalPath);
    const cachedMeta = meta[originalPath];
    console.log(`📄 Cached Meta:`, cachedMeta);
    if (!cachedMeta) return false;
    const originalTime = originalStats.mtimeMs;
    const metaTime = new Date(cachedMeta.updatedAt).getTime();
    console.log(`📆 Original mtime: ${originalTime} | Cached updatedAt: ${metaTime}`);
    console.log(`✅ Should use cache: ${metaTime >= originalTime}`);
    return metaTime >= originalTime;
  } catch (err) {
    console.warn(`⚠️ Cache check failed. Proceeding without cache.`, err);
    return false;
  }
}

/**
 * Updates the feature cache metadata file.
 * Ensures _Temp/.cache/featureMeta.json exists, and writes { filePath, updatedAt }.
 */
export function updateFeatureCacheMeta(originalPath: string, cachedPath: string): void {
  const dir = path.dirname(FEATURE_META_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  let meta: Record<string, any> = {};
  if (fs.existsSync(FEATURE_META_PATH)) {
    try {
      meta = JSON.parse(fs.readFileSync(FEATURE_META_PATH, 'utf-8'));
    } catch {
      console.warn('⚠️ Failed to parse featureMeta.json. Overwriting.');
    }
  }
  meta[originalPath] = {
    filePath: cachedPath,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(FEATURE_META_PATH, JSON.stringify(meta, null, 2), 'utf-8');
  console.log(`💾 Feature cache metadata updated for: ${originalPath}`);
}

/**
 * Writes feature content to cache if valid.
 */
export function writeFeatureToCache(cachedPath: string, content: string): void {
  if (!content.trim().startsWith('Feature')) {
    console.warn(`❌ Skipping cache write: Content does not start with "Feature". Content preview:\n${content.substring(0, 100)}`);
    return;
  }
  fs.writeFileSync(cachedPath, content, 'utf8');
}