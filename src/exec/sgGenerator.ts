import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
function sha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

const stepGroupDir = path.resolve('tests/bdd/step_group');
const outputFilePath = path.resolve('tests/bdd/steps/_step_group/stepGroup_steps.ts');

// ---- Step Group Caching ----
const cacheFilePath = path.resolve('_Temp/.cache/stepGroupMeta.json');

function loadCache(): Record<string, number> {
  if (!fs.existsSync(cacheFilePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
  } catch {
    return {};
  }
}

function saveCache(data: Record<string, number>) {
  fs.mkdirSync(path.dirname(cacheFilePath), { recursive: true });
  fs.writeFileSync(cacheFilePath, JSON.stringify(data, null, 2), 'utf8');
}

function getStepGroupFiles(): { file: string; fullPath: string; mtimeMs: number }[] {
  if (!fs.existsSync(stepGroupDir)) return [];
  return fs.readdirSync(stepGroupDir)
    .filter(f => f.endsWith('.feature'))
    .map(file => {
      const fullPath = path.join(stepGroupDir, file);
      const stat = fs.statSync(fullPath);
      return { file, fullPath, mtimeMs: stat.mtimeMs };
    });
}

// Regex for valid StepGroup tag
const stepGroupTagRegex = /^@StepGroup:([a-zA-Z0-9_]+)\.sg$/;
const scenarioRegex = /^Scenario:\s*(.*)$/;
const invalidScenarioRegex = /^Scenario Outline:/;

type StepGroup = {
  name: string;
  description: string;
  steps: string[];
};

export function extractStepGroups(fileContent: string, filename: string): StepGroup[] {
  const lines = fileContent.split(/\r?\n/);
  // Ensure @StepGroup tag appears before Feature declaration
  let hasStepGroupTag = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '@StepGroup') {
      hasStepGroupTag = true;
      break;
    }
    if (line.startsWith('Feature:')) break; // Stop if Feature is encountered first
  }
  if (!hasStepGroupTag) {
    console.warn(`⚠️ Skipping file "${filename}" — missing @StepGroup tag before Feature declaration.`);
    return [];
  }

  const stepGroups: StepGroup[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('@StepGroup:') && !stepGroupTagRegex.test(line)) {
      throw new Error(
        `❌ Invalid @StepGroup tag format in file ${filename}.\n` +
        `   → Offending line: ${line}\n` +
        `   → Only alphanumeric and underscores are allowed in group names (e.g., @StepGroup:valid_name.sg)`
      );
    }

    const tagMatch = line.match(stepGroupTagRegex);
    if (tagMatch) {
      const rawName = tagMatch[1];
      const groupName = `${rawName}.sg`;

      // Validate group name: only alphanumeric and underscores allowed
      if (!/^[a-zA-Z0-9_]+$/.test(rawName)) {
        throw new Error(
          `❌ Invalid step group name "${rawName}" in file ${filename}.\n` +
          `   → Step group names must be alphanumeric with underscores only (no spaces, dashes, or special characters).`
        );
      }

      // Skip empty lines to find Scenario
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++;

      if (j < lines.length) {
        const descLine = lines[j].trim();

        if (invalidScenarioRegex.test(descLine)) {
          throw new Error(
            `❌ Scenario Outline is not allowed in Step Group files.\n` +
            `   → File: ${filename}\n` +
            `   → Offending Line: ${j + 1}: ${descLine}`
          );
        }

        const descMatch = descLine.match(scenarioRegex);
        if (descMatch) {
          const description = descMatch[1].trim();
          // Collect steps until next @ tag or EOF
          const steps: string[] = [];
          let k = j + 1;
          while (k < lines.length && !lines[k].trim().startsWith('@')) {
            const rawLine = lines[k];
            const stepKeywords = ['*', 'Given', 'When', 'Then', 'And', 'But'];
            if (stepKeywords.some(keyword => rawLine.trim().startsWith(keyword))) {
              steps.push(rawLine);
            }
            k++;
          }
          console.log(`🧪 Captured ${steps.length} steps for group: ${groupName}`);
          stepGroups.push({ name: groupName, description, steps });
          i = k - 1; // continue after last processed line
        }
      }
    }
  }

  return stepGroups;
}

function generateStepDef(group: StepGroup): string {
  const { name, description, steps } = group;

  const commentBlock = steps.length
    ? [
        `    /*StepGroup:${name}`,
        ...steps.map(s => `    ${s.trimEnd()}`),
        '    */'
      ].join('\n')
    : '    // No steps defined';

  return `Given('Step Group: -${name}- -${description}-', async function () {
${commentBlock}
});`;
}

function run(options: { force?: boolean } = {}) {
  const cachedTimes = loadCache();
  const filesMeta = getStepGroupFiles();
  const defStat = fs.existsSync(outputFilePath) ? fs.statSync(outputFilePath) : null;
  const cachedDefMtime = cachedTimes["__stepGroupDef"];
  const stepGroupJsonCachePath = path.resolve('_Temp/.cache/stepGroup_cache.json');
  const cacheStat = fs.existsSync(stepGroupJsonCachePath) ? fs.statSync(stepGroupJsonCachePath) : null;
  const cachedJsonDefMtime = cachedTimes["__stepGroupCache"];

  if (
    !options.force &&
    defStat &&
    defStat.mtimeMs === cachedDefMtime &&
    cacheStat &&
    cacheStat.mtimeMs === cachedJsonDefMtime &&
    filesMeta.every(f => cachedTimes[f.file] === f.mtimeMs)
  ) {
    // All step group files, generated output, and cache are up-to-date
    console.log('⏩ Step group definitions are up-to-date. Skipping regeneration.');
    return;
  }

  const shouldReprocessAll =
    options.force ||
    (defStat && defStat.mtimeMs !== cachedDefMtime) ||
    (cacheStat && cacheStat.mtimeMs !== cachedJsonDefMtime);

  const changedFiles = shouldReprocessAll
    ? filesMeta
    : filesMeta.filter(f => cachedTimes[f.file] !== f.mtimeMs);
  const allGroups: StepGroup[] = [];

  changedFiles.forEach(({ file, fullPath }) => {
    const content = fs.readFileSync(fullPath, 'utf8');
    const groups = extractStepGroups(content, file);
    allGroups.push(...groups);
  });

  const groupListBlock = `/*@StepGroupList\n${JSON.stringify({ groups: allGroups.map(g => g.name) }, null, 2)}\n*/\n\n`;

  const header = `// ************************** IMPORTANT **************************
// This file is auto-generated by PlayQ for Step Group.
// Do not edit it manually. File is auto-generated.
// Any changes done directly will be lost on the next generation.
// ***************************************************************

import { Given } from '@cucumber/cucumber';

`;

  const output = groupListBlock + header + allGroups.map(generateStepDef).join('\n\n') + '\n';
  const stepGroupJsonCache: Record<string, { description: string; steps: string[] }> = {};
  allGroups.forEach(group => {
    stepGroupJsonCache[group.name] = {
      description: group.description,
      steps: group.steps
    };
  });

  // --- Validate existing cache before regeneration ---
  const stepGroupCacheStr = JSON.stringify(stepGroupJsonCache, null, 2);
  if (fs.existsSync(stepGroupJsonCachePath)) {
    const currentCache = fs.readFileSync(stepGroupJsonCachePath, 'utf8');
    const currentHash = sha256(currentCache);
    const newHash = sha256(stepGroupCacheStr);
    if (currentHash !== newHash) {
      console.warn('⚠️ Detected changes in stepGroup_cache.json — file appears to have been modified. It will be regenerated.');
    }
  }

  fs.mkdirSync(path.dirname(stepGroupJsonCachePath), { recursive: true });
  fs.writeFileSync(stepGroupJsonCachePath, stepGroupCacheStr, 'utf8');
  
  const existingOutput = fs.existsSync(outputFilePath)
    ? fs.readFileSync(outputFilePath, 'utf8')
    : '';

  if (sha256(existingOutput) === sha256(output)) {
    console.log('⏩ No changes in generated output. Skipping file write.');
  } else {
    fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
    fs.writeFileSync(outputFilePath, output, 'utf8');
    console.log(`✅ Generated ${allGroups.length} Step Group definitions to ${outputFilePath}`);
  }

  const updatedCache = loadCache(); // Load existing cache

  // Update feature file mtimes
  filesMeta.forEach(f => {
    updatedCache[f.file] = f.mtimeMs;
  });

  // Add or update stepGroup_steps.ts mtime
  const finalDefStat = fs.statSync(outputFilePath);
  updatedCache["__stepGroupDef"] = finalDefStat.mtimeMs;

  // Add or update stepGroup_cache.json mtime (after writing to ensure freshness)
  const finalJsonCacheStat = fs.statSync(stepGroupJsonCachePath);
  updatedCache["__stepGroupCache"] = finalJsonCacheStat.mtimeMs;

  saveCache(updatedCache);
}

if (require.main === module) {
  run(); // Only run if this file is the entry point (e.g., called via CLI)
}


function generateStepGroups(options: { force?: boolean } = {}) {
  run(options);
}

export { generateStepGroups };

// Exported utility to run step group generation, with optional force
export function generateStepGroupsIfNeeded(force: boolean = false) {
  generateStepGroups({ force });
}


// import fs from 'fs';
// import path from 'path';

// const stepGroupDir = path.resolve('test/_step_group');
// const outputFilePath = path.resolve('test/steps/_step_group/stepGroup_steps.ts');

// function extractStepGroups(): {
//   groupName: string;
//   description: string;
//   steps: string[];
// }[] {
//   const groupPattern = /^@<([\w\-\.]+)\/>$/;
//   const endGroupPattern = /^@<\/([\w\-\.]+)>$/;

//   const stepGroupFiles = fs.readdirSync(stepGroupDir)
//     .filter(file => /\.(steps\.feature|step\.feature|sg\.feature|steps\.sg\.feature)$/i.test(file));

//   const stepGroups: {
//     groupName: string;
//     description: string;
//     steps: string[];
//   }[] = [];

//   stepGroupFiles.forEach(file => {
//     const fullPath = path.join(stepGroupDir, file);
//     const fileContent = fs.readFileSync(fullPath, 'utf-8').trim().split('\n');
//     let currentGroup = "";
//     let groupDesc = "";
//     const groupLines: string[] = [];

//     fileContent.forEach(line => {
//       const trimmedLine = line.trim();
//       const startMatch = trimmedLine.match(groupPattern);
//       const endMatch = trimmedLine.match(endGroupPattern);

//       if (startMatch) {
//         currentGroup = startMatch[1];
//         groupDesc = "";
//         return;
//       }

//       if (trimmedLine.startsWith('@desc:') && currentGroup) {
//         groupDesc = trimmedLine.replace('@desc:', '').trim();
//         return;
//       }

//       if (endMatch && endMatch[1] === currentGroup) {
//         stepGroups.push({
//           groupName: currentGroup,
//           description: groupDesc,
//           steps: [...groupLines]
//         });
//         currentGroup = "";
//         groupDesc = "";
//         groupLines.length = 0;
//         return;
//       }

//       if (currentGroup && trimmedLine !== '') {
//         groupLines.push(trimmedLine);
//       }
//     });
//   });

//   return stepGroups;
// }

// function generateStepDefinitions(stepGroups: {
//   groupName: string;
//   description: string;
//   steps: string[];
// }[]) {
//   const lines: string[] = [];

//   lines.push('// ************************** IMPORTANT **************************');
//   lines.push('// This file is auto-generated by PlayQ for Step Group.');
//   lines.push('// Do not edit it manually. File is auto-generated.');
//   lines.push('// Any changes done directly will be lost on the next generation.');
//   lines.push('// ***************************************************************');
//   lines.push('');
//   lines.push("import { Given } from '@cucumber/cucumber';");
//   lines.push('');

//   stepGroups.forEach(group => {
//     lines.push(`Given('Step Group: -${group.groupName}- -${group.description}-', async function () {`);
//     lines.push(`  console.log("Step Group: -${group.groupName}- <${group.description}>");`);
//     lines.push('});');
//     lines.push('');
//   });

//   fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
//   fs.writeFileSync(outputFilePath, lines.join('\n'), 'utf-8');
//   console.log(`✅ Step definitions generated: ${outputFilePath}`);
// }

// function run() {
//   const stepGroups = extractStepGroups();
//   if (stepGroups.length === 0) {
//     console.warn('⚠️  No step groups found to generate.');
//     return;
//   }

//   generateStepDefinitions(stepGroups);
// }

// run();