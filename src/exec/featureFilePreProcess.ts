// Replace legacy '@playq' alias with local global exports
import { config, vars } from "../global";
import fs from "fs";
import path from "path";
import xlsx from "@e965/xlsx";

/**
 * Preprocesses a feature file using all transformation steps:
 * - Variable replacement
 * - Step group expansion
 * - SmartIQ data injection
 * - Tag injection
 *
 * @param srcFeaturePath Path to the source .feature file
 * @returns Path to the preprocessed file (under _Temp/execution)
 */
export function preprocessFeatureFile(
  srcFeaturePath: string
): string | undefined {
  try {
    const rawContent = fs.readFileSync(srcFeaturePath, "utf-8");

    // Step 1: Replace variables like ${url}, ${user}
    let processedContent = replaceVariablesInString(rawContent);

    // Step 2: Replacing examples with data file and filter
    processedContent = processExamplesWithFilter(processedContent); // <-- Add this

    // Step 3: Expand Step Groups
    processedContent = expandStepGroups(processedContent);

    // Step 4: Inject SmartIQ data or resolve special steps
    processedContent = processSmartData(processedContent);

    // Step 5: Inject scenario-level tags if needed
    processedContent = injectScenarioTag(processedContent, srcFeaturePath);

    // Write processed file
    const outputDir = path.join("_Temp/execution");
    const relativePath = path.relative("tests/bdd/scenarios", srcFeaturePath);
    const outputPath = path.join(outputDir, relativePath);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, processedContent, "utf-8");
    if (config?.cucumber?.featureFileCache || vars.getConfigValue('cucumber.featureFileCache')) {
      const { updateFeatureCacheMeta } = require("./featureFileCache");
      updateFeatureCacheMeta(srcFeaturePath, outputPath);
    }
    return outputPath;
  } catch (err) {
    console.error(`❌ Error preprocessing feature file: ${err}`);
    return undefined;
  }
}

// 🔁 Placeholder replacement
function replaceVariablesInString(content: string): string {
  return content.replace(/Examples\s*:\s*({[^}]*})/g, (match, jsonPart) => {
    const replaced = jsonPart.replace(/\${env\.([\w]+)}/g, (_, key) => {
      const val = process.env[key] || "";
      console.log(`🔄 Replacing variable env.${key} -> ${val}`);
      return val;
    });
    return `Examples:${replaced}`;
  });
}

// 🔁 Expand Step Groups

export function expandStepGroups(featureText: string): string {
  const cachePath = path.join("_Temp", ".cache", "stepGroup_cache.json");
  if (!fs.existsSync(cachePath)) {
    console.warn(`⚠️ Step group cache not found at ${cachePath}`);
    return featureText;
  }

  const stepGroupCache = JSON.parse(fs.readFileSync(cachePath, "utf8"));

  const stepGroupRegex = /^\s*\*\s*Step\s*Group:\s*-(.+?)-\s*-(.+?)-\s*$/gm;

  const updatedText = featureText.replace(
    stepGroupRegex,
    (_match, groupIdRaw, groupDescRaw) => {
      const groupId = groupIdRaw.trim();
      const groupDesc = groupDescRaw.trim();

      const cachedGroup = stepGroupCache[groupId];

      if (!cachedGroup || !Array.isArray(cachedGroup.steps)) {
        console.warn(`❌ Step group "${groupId}" not found or steps invalid`);
        return _match;
      }

      const steps = cachedGroup.steps.join("\n");
      const replacement = [
        `\n* - Step Group - START: "${groupId}" Desc: "${groupDesc}"`,
        steps,
        `* - Step Group - END: "${groupId}"`,
      ].join("\n");
      return replacement;
    }
  );
  return updatedText;
}

// 🔁 Process Smart Data (e.g., inject data-driven values or SmartIQ rules)
function processSmartData(content: string): string {
  // Example: Replace [[SMART:...]] with resolved steps
  return content.replace(/\[\[SMART:(.*?)\]\]/g, (_, expr) => {
    console.log(`🧠 Processing SMART: ${expr}`);
    return `# Processed SMART step: ${expr}`;
  });
}

// 🔁 Inject scenario-level tags
function injectScenarioTag(content: string, filePath: string): string {
  const tag = `@file(${path.basename(filePath)})`;
  const lines = content.split("\n");

  const processedLines = lines.map((line, i) => {
    if (
      line.trim().startsWith("Scenario") &&
      (i === 0 || !lines[i - 1].trim().startsWith("@"))
    ) {
      return `${tag}\n${line}`;
    }
    return line;
  });

  return processedLines.join("\n");
}

function processExamplesWithFilter(
  content: string,
  dataDir = "test-data"
): string {
  return content.replace(
    /(^|\n)\s*Examples\s*:?\s*({[^}]*})/g,
    (match, prefix, jsonStr) => {
      console.log(`🔄 FOUND Examples block: [${jsonStr}]`);

      console.log(`🔄 Preprocessing feature == MATCH == file: ${match}`);
      console.log(`🔄 Preprocessing feature == MATCH END == file:`);
      console.log(`🔄 Preprocessing feature == PREFIX == file: ${prefix}`);
      console.log(`🔄 Preprocessing feature == jsonStr == file: ${jsonStr}`);

      const obj = JSON.parse(jsonStr.replace(/'/g, '"'));
      const normalized: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        normalized[k.toLowerCase()] = v;
      }
      const dataFile = normalized["datafile"];
      const filter = normalized["filter"];
      const sheetName = normalized["sheetname"];
      console.log(`🔄 Preprocessing feature == dataFile == file: ${dataFile}`);
      console.log(`🔄 Preprocessing feature == filter == file: ${filter}`);
      console.log(
        `🔄 Preprocessing feature == sheetName == file: ${sheetName}`
      );

      const fullPath = path.join(dataDir, path.basename(dataFile || ""));
      const ext = path.extname(fullPath).toLowerCase();
      console.log(`🔄 Preprocessing feature == FULL PATH == file: ${fullPath}`);
      console.log(`🔄 Preprocessing feature == EXT == file: ${ext}`);

      if (!fs.existsSync(fullPath)) return match;

      const isNumeric = (val: any) =>
        typeof val === "string" && val.trim() !== "" && !isNaN(Number(val));
      const substituteFilter = (filter: string, row: Record<string, any>) =>
        filter.replace(/\b[_a-zA-Z][_a-zA-Z0-9]*\b/g, (key) => {
          const raw = row[key] ?? row[`_${key}`];
          if (raw === undefined) return key;
          return isNumeric(raw) ? raw.trim() : JSON.stringify(raw);
        });

      let rows: Record<string, any>[] = [];
      console.log(`🔍 Checking file existence: fullPath='${fullPath}'`);
      if (!fs.existsSync(fullPath)) {
        console.error(`❌ File not found: ${fullPath}`);
        return match;
      }

      if (ext === ".xlsx") {
        console.log(`✔️ File found: ${fullPath}, now reading with xlsx`);
        const workbook = xlsx.readFile(fullPath);
        console.log(`📄 Workbook sheets: ${workbook.SheetNames.join(", ")}`);
        const sheet = sheetName || workbook.SheetNames[0];
        console.log(`📋 Using sheet: ${sheet}`);
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheet]);
        console.log(`🔢 Read ${sheetData.length} rows from sheet`);
        rows = sheetData.filter((row) => {
          try {
            console.log("🔍 Row raw:", row);
            return eval(substituteFilter(filter, row));
          } catch {
            console.warn("⚠️ Row filter error, skipping.");
            return false;
          }
        });
      } else if (ext === ".csv") {
        console.log(`📋 ENTER CSV:`);
        const csvData = fs.readFileSync(fullPath, "utf-8").split("\n");
        console.log(`📋 Using csvData: ${csvData}`);
        const headers = csvData[0].split(",").map((h) => h.trim());
        console.log(`📋 Using headers: ${headers}`);
        for (let i = 1; i < csvData.length; i++) {
          const values = csvData[i].split(",");
          if (values.length !== headers.length) continue;
          const row: Record<string, any> = {};
          headers.forEach((h, j) => {
            row[h] = values[j]?.trim();
          });
          try {
            if (eval(substituteFilter(filter, row))) rows.push(row);
          } catch {}
        }
      } else {
        return match; // unsupported file
      }
      console.log(`🔍 Filtered row count: ${rows.length}`);
      if (!rows.length) {
        console.error(
          `❌ No matching rows found. Returning fallback Examples block.`
        );
        throw new Error(
          `❌ No matching rows found. Returning fallback Examples block.`
        );
      }

      const headers = Object.keys(rows[0]);
      const lines = ["\n\nExamples:", `  | ${headers.join(" | ")} |`];
      for (const r of rows) {
        const rowLine = `  | ${headers.map((h) => r[h] || "").join(" | ")} |`;
        lines.push(rowLine);
      }
      return lines.join("\n");
    }
  );
}
