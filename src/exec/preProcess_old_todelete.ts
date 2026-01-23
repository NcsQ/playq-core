import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
// import xlsx from 'xlsx';
import xlsx from '@e965/xlsx';
import crypto from 'crypto';
import { generateStepGroups } from './sgGenerator';
const config: any = {};

function loadStepGroupCache(): Record<string, { description: string; steps: string[] }> {
  const cachePath = path.resolve('_Temp/.cache/stepGroup_cache.json');
  if (!fs.existsSync(cachePath)) {
    console.error(`❌ Step group JSON cache not found. Please run sgGenerator.ts first.`);
    return {};
  }

  return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
}
const args = process.argv.slice(2);
const isForced = args.includes('--force');

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

const featureCachePath = path.resolve('_Temp/.cache/featureMeta.json');
const featureCache: Record<string, string> = fs.existsSync(featureCachePath)
  ? JSON.parse(fs.readFileSync(featureCachePath, 'utf8'))
  : {};

const sourceDir = path.resolve('test/features');
const outputDir = path.resolve('_Temp/execution');
const dataDir = path.resolve('test-data');

function findFeatureFiles(dir: string): string[] {
  let results: string[] = [];
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(findFeatureFiles(fullPath));
    } else if (file.endsWith('.feature')) {
      results.push(fullPath);
    }
  });
  return results;
}

function ensureOutputPath(featurePath: string): string {
  const relativePath = path.relative(sourceDir, featurePath);
  const targetPath = path.join(outputDir, relativePath);
  const dir = path.dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true });
  return targetPath;
}

function isNumeric(val: any): boolean {
  return typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val));
}

function validateIdentifiers(filter: string, inputPath: string): boolean {
  const invalidIdentifiers = Array.from(filter.matchAll(/_([A-Z0-9_\-\.]+)/gi))
    .map(match => match[1])
    .filter(id => !/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(`_${id}`));

  if (invalidIdentifiers.length > 0) {
    console.error(`❌ Invalid identifiers in filter: ${invalidIdentifiers.map(i => `"_${i}"`).join(', ')}`);
    console.error(`   👉 Use only letters, numbers, and underscores (e.g., _SUB_STATUS)`);
    console.error(`   ✋ Please fix this in feature file: ${inputPath}`);
    return false;
  }
  return true;
}

function substituteFilter(filter: string, row: Record<string, any>): string {
  const allKeys = Object.keys(row);
  const pattern = /\b[_a-zA-Z][_a-zA-Z0-9]*\b/g;
  return filter.replace(pattern, (key) => {
    const raw = row[key] ?? row[`_${key}`];
    if (raw === undefined) return key; // leave as-is if not found
    return isNumeric(raw) ? raw.trim() : JSON.stringify(raw);
  });
}

function preprocessFeatureFile(
  inputPath: string,
  outputPath: string,
  stepGroupCache: Record<string, { description: string; steps: string[] }>,
  stepGroupCacheHash: string
) {
  const relativePath = path.relative(sourceDir, inputPath);
  let featureHashInput = fs.readFileSync(inputPath, 'utf-8') + stepGroupCacheHash;
  const featureText = fs.readFileSync(inputPath, 'utf-8');
  const lines = featureText.split('\n');

  let dataFile = '';
  let filter = '';
  let sheetName = '';
  let exampleLineIndex = -1;

  lines.forEach((line, index) => {
    const exampleMatch = line.trim().startsWith('Examples:') && line.includes('{');
    if (exampleMatch) {
      exampleLineIndex = index;
      const jsonStr = line.replace(/^Examples:\s*/, '').trim();
      try {
        const parsed = JSON.parse(jsonStr.replace(/'/g, '"'));
        dataFile = parsed.dataFile;
        filter = parsed.filter;
        sheetName = parsed.sheetName;

        if (!validateIdentifiers(filter, inputPath)) {
          return;
        }
        // Add to hash input: options for Examples
        featureHashInput += JSON.stringify({ filter, sheetName, dataFile });
      } catch (err) {
        console.error(`❌ Failed to parse Examples JSON in ${inputPath}:\n`, err);
        return;
      }
    }
  });

  // If there is a data file, append its content to the hash input (if it exists)
  let fullPath = '';
  if (dataFile) {
    const ext = path.extname(dataFile).toLowerCase();
    fullPath = path.join(dataDir, path.basename(dataFile));
    if (fs.existsSync(fullPath)) {
      // For CSV, read as utf-8; for XLSX, hash the file buffer.
      if (ext === '.csv') {
        featureHashInput += fs.readFileSync(fullPath, 'utf-8');
      } else if (ext === '.xlsx') {
        featureHashInput += fs.readFileSync(fullPath).toString('base64');
      }
    }
  }

  // Compute current hash
  const currentHash = sha256(featureHashInput);
  if (!isForced && featureCache[relativePath] && featureCache[relativePath] === currentHash) {
    console.log(`⏩ Skipped (unchanged): ${relativePath}`);
    return;
  }

  if (!dataFile || !filter || exampleLineIndex === -1) {
    // No Examples, just expand step groups and write output
    console.log("📣 No Examples detected. Proceeding with step group expansion only...");
    const expandedLines = expandStepGroups(lines, inputPath, stepGroupCache);
    const outputContent = expandedLines.join('\n');
    fs.writeFileSync(outputPath, outputContent, 'utf-8');
    featureCache[relativePath] = currentHash;
    console.log(`📄 Preprocessed (no Examples): ${outputPath}`);
    return;
  }

  // Has Examples with data
  console.log("✔ Should generate examples (this line will NOT show if the block above returns)");

  const ext = path.extname(dataFile).toLowerCase();
  const rows: Record<string, any>[] = [];

  const buildExamplesFile = () => {
    if (rows.length === 0) {
      console.log(`❌ No matching rows found in ${dataFile}`);
      fs.writeFileSync(outputPath, featureText, 'utf-8');
      featureCache[relativePath] = currentHash;
      return;
    }

    const headers = Object.keys(rows[0]); // Include all headers including _ENV, _STATUS etc.
    const examples = ['Examples:', `  | ${headers.join(' | ')} |`]
      .concat(rows.map(r => {
        const rowData = headers.map(h => r[h] || '');
        return `  | ${rowData.join(' | ')} |`;
      }));

    const outputLines = [
      ...lines.slice(0, exampleLineIndex),
      ...examples,
      ...lines.slice(exampleLineIndex + 1),
    ];

    // Expand Step Groups before processing Examples
    const expandedLines = expandStepGroups(outputLines, inputPath, stepGroupCache);

    // Rebuild Examples only after step groups are expanded
    const finalLines = expandedLines.join('\n');

    fs.writeFileSync(outputPath, finalLines, 'utf-8');
    featureCache[relativePath] = currentHash;
    console.log(`✅ Processed: ${outputPath}`);
  };

  if (ext === '.csv') {
    fs.createReadStream(fullPath)
      .pipe(csv())
      .on('data', (row) => {
        try {
          if (eval(substituteFilter(filter, row))) {
            rows.push(row);
          }
        } catch (e) {
          console.warn(`⚠️ Skipping row due to filter error: ${e.message}`);
        }
      })
      .on('end', buildExamplesFile);
  } else if (ext === '.xlsx') {
    const workbook = xlsx.readFile(fullPath);
    const sheet = sheetName || workbook.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheet]);
    sheetData.forEach((row: any) => {
      try {
        if (eval(substituteFilter(filter, row))) {
          rows.push(row);
        }
      } catch (e) {
        console.warn(`⚠️ Skipping row due to filter error: ${e.message}`);
      }
    });
    buildExamplesFile();
  } else {
    console.error(`❌ Unsupported file type: ${ext}`);
    fs.writeFileSync(outputPath, featureText, 'utf-8');
    featureCache[relativePath] = currentHash;
  }
}

function run() {
  console.log("🔄 Generating step group definitions from sgGenerator...");
  generateStepGroups({ force: isForced }); // Regenerate stepGroup_steps.ts before preprocessing

  // if (fs.existsSync(outputDir)) {
  //   fs.rmSync(outputDir, { recursive: true, force: true });
  // }
  fs.mkdirSync(outputDir, { recursive: true });

  // Load step group cache once
  const stepGroupCache = loadStepGroupCache();
  const stepGroupCacheHash = sha256(JSON.stringify(stepGroupCache));

  const features = findFeatureFiles(sourceDir);
  if (!features.length) {
    console.log('No feature files found.');
    return;
  }

  features.forEach(featurePath => {
    // Skip the step group directory
    if (featurePath.includes('_step_group') || featurePath.includes('step_group')) {
      console.log(`🛑 Skipping step group directory: ${featurePath}`);
      return;
    }

    const outPath = ensureOutputPath(featurePath);
    preprocessFeatureFile(featurePath, outPath, stepGroupCache, stepGroupCacheHash);
  });

  // Save the feature cache at the end
  fs.mkdirSync(path.dirname(featureCachePath), { recursive: true });
  fs.writeFileSync(featureCachePath, JSON.stringify(featureCache, null, 2), 'utf8');
}

function expandStepGroups(
  lines: string[],
  inputPath: string,
  stepGroupCache: Record<string, { description: string; steps: string[] }>
): string[] {
  return lines.flatMap(line => {
    // const match = line.trim().match(/^\* Step Group: -([a-zA-Z0-9_.]+)-/);
    const match = line.trim().match(/^(?:\*|Given|When|Then|And|But) Step Group: -([a-zA-Z0-9_.]+)-/);
    if (match) {
      const groupName = match[1];
      const group = stepGroupCache[groupName];
      if (!group) {
        console.error(`❌ Step Group not found: ${groupName} (in ${inputPath})`);
        process.exit(1);
      }
      return [
        `* - Step Group - START: "${groupName}" Desc: "${group.description}"`,
        ...group.steps.map(step => `  ${step}`),
        `* - Step Group - END: "${groupName}"`
      ];
    }
    return [line];
  });
}

run();