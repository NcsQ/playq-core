import * as fs from "fs";
import * as path from "path";

let importedVars: Record<string, string> = {};
const varFilePath = path.resolve(process.cwd(), "resources/variable.ts");

const patternDirs = [
  path.resolve(process.cwd(), "resources/locators/pattern"),
  path.resolve(process.cwd(), "extend/addons/pattern"),
];

const storedVars: Record<string, string> = {};
const loggedMissingKeys = new Set<string>();

function getValue(key: string, ifEmpty?: boolean): string {
  if (!key) {
    console.warn("⚠️ Empty key provided to getValue");
    return ifEmpty ? "" : key;
  }
  key = key.trim();
  
  if (key.startsWith("env.")) {
    const envKey = key.slice(4);
    const envValue = process.env[envKey];
    if (!envValue) {
      return ifEmpty ? "" : key;
    }
    return envValue;
  }

  if (key in storedVars) return (ifEmpty && storedVars[key] === key) ? "" : storedVars[key];

  if (!loggedMissingKeys.has(key)) {
    console.warn(`⚠️ Variable not found for key: "${key}"`);
    loggedMissingKeys.add(key);
  }

  return ifEmpty ? "" : key;
}

function getConfigValue(key: string, ifEmpty?: boolean): string {
  key = "config." + key.trim();
  if (key in storedVars) return storedVars[key];

  if (!loggedMissingKeys.has(key)) {
    // console.warn(`⚠️ Config Variable not found for key: "${key}"`);
    loggedMissingKeys.add(key);
    if (ifEmpty) return "";
  }
  return key;
}

function setValue(key: string, value: string): void {
  storedVars[key] = value;
  if (key.startsWith("var.static.")) {
    updateVarStaticJson(key.slice(11), value);
  }
}

function updateVarStaticJson(key: string, value: string): void {
  const jsonFilePath = path.resolve(process.cwd(), "resources/var.static.json");
  
  let data: Record<string, string> = {};
  
  // Read existing file if it exists
  if (fs.existsSync(jsonFilePath)) {
    try {
      const fileContent = fs.readFileSync(jsonFilePath, "utf-8");
      data = JSON.parse(fileContent);
      console.log(`📖 Existing data:`, data); // Debug log
    } catch (error) {
      console.warn(`Warning: Could not parse existing var.static.json:`, error.message);
      data = {};
    }
  } else {
    console.log(`📝 Creating new var.static.json file`);
  }
  
  // Store old value for comparison
  const oldValue = data[key];
  
  // Update or add the key-value pair
  data[key] = value;
  
  console.log(`🔄 Updating key "${key}": "${oldValue}" → "${value}"`); // Debug log
  console.log(`📦 Final data:`, data); // Debug log
  
  // Ensure the directory exists
  const dir = path.dirname(jsonFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write the updated data back to the file
  try {
    fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2), "utf-8");
    
    if (oldValue !== undefined) {
      console.log(`✅ Updated var.static.json: ${key} = ${value} (was: ${oldValue})`);
    } else {
      console.log(`✅ Added to var.static.json: ${key} = ${value}`);
    }
  } catch (error) {
    console.error(`❌ Failed to write to var.static.json:`, error.message);
    throw error;
  }
}

function replaceVariables(input: any): string {
  if (typeof input !== "string") input = input.toString();
  return input.replace(/\#\{([^}]+)\}/g, (_, varName) => {
    if (varName.startsWith("pwd.")) {
      const encryptedValue = varName.replace(/^pwd\./, "");
      try {
        const crypto = require("../util/utilities/cryptoUtil");
        return crypto.decrypt(encryptedValue);
      } catch (error) {
        console.warn('Warning: Could not decrypt pwd value:', error.message);
        return varName;
      }
    } else if (varName.startsWith("enc.")) {
      const encryptedValue = varName.replace(/^enc\./, "");
      try {
        const crypto = require("../util/utilities/cryptoUtil");
        return crypto.decrypt(encryptedValue);
      } catch (error) {
        console.warn('Warning: Could not decrypt enc value:', error.message);
        return varName;
      }
    }
    
    if (varName.endsWith(".(toNumber)")) {
      const baseVar = varName.replace(".(toNumber)", "");
      const value = getValue(baseVar);
      return value !== undefined && value !== null && value !== ""
        ? Number(value)
        : "";
    }
    return getValue(varName);
  });
}

function debugVars() {
  console.log("📦 Static Vars:", storedVars);
}

function flattenConfig(obj: any, prefix = "config"): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const key in obj) {
    const fullKey = `${prefix}.${key}`;
    if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(entries, flattenConfig(obj[key], fullKey));
    } else if (Array.isArray(obj[key])) {
      entries[fullKey] = obj[key].join(";");
    } else {
      entries[fullKey] = String(obj[key]);
    }
  }
  return entries;
}

function loadPatternEntries() {
  const files: string[] = [];
  for (const dir of patternDirs) {
    if (fs.existsSync(dir)) {
      try {
        const dirFiles = fs
          .readdirSync(dir)
          .filter((file) => {
            const isTS = file.endsWith(".pattern.ts");
            const isAddonDir = dir.includes("extend/addons/pattern");
            if (!isTS) return false;
            if (isAddonDir) return file.startsWith("_");
            return !file.startsWith("_");
          })
          .map((file) => path.join(dir, file));
        files.push(...dirFiles);
      } catch (error) {
        console.warn(`Warning: Could not read pattern directory ${dir}:`, error.message);
      }
    }
  }

  for (const file of files) {
    try {
      const fileName = path.basename(file, ".pattern.ts");
      if (!/^[a-zA-Z0-9_]+$/.test(fileName)) {
        console.warn(`❌ Invalid pattern file name "${fileName}". Only alphanumeric characters and underscores are allowed.`);
        continue;
      }
      
      delete require.cache[require.resolve(file)];
      const patternModule = require(file);
      const exported = patternModule[fileName] || patternModule.default?.[fileName];
      
      if (!exported) {
        console.warn(`❌ Exported const '${fileName}' not found in: ${file}`);
        continue;
      }
      
      const flattened = flattenConfig(exported, `pattern.${fileName}`);
      Object.assign(storedVars, flattened);
    } catch (error) {
      console.warn(`Warning: Could not load pattern file ${file}:`, error.message);
    }
  }
}

function loadFileEntries(file: string, constName: string, prefix?: string) {
  console.log(`🔍 Loading file: ${file} with constName: ${constName} and prefix: ${prefix}`);
  
  const absPath = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
  
  if (!fs.existsSync(absPath)) {
    throw new Error(`❌ Load file not found: ${absPath}`);
  }
  
  const ext = path.extname(absPath);
  let data: any;

  if (ext === ".ts" || ext === ".js") {
    delete require.cache[require.resolve(absPath)];
    const module = require(absPath);
    data = module[constName] || (module.default && module.default[constName]) || module.default || module;
    
    if (!data) {
      throw new Error(`❌ Exported const '${constName}' not found in: ${file}`);
    }
  } else if (ext === ".json") {
    data = JSON.parse(fs.readFileSync(absPath, "utf-8"));
  } else {
    throw new Error(`❌ Unsupported file extension: ${ext}`);
  }

  const flat = flattenConfig(data, prefix || "");
  Object.assign(storedVars, flat);
}

function parseLooseJson(str: string): Record<string, any> {
  if (!str || str.trim() === "" || str.trim() === '""') return {};

  const needsBraces = !str.trim().startsWith("{") || !str.trim().endsWith("}");
  let wrappedStr = needsBraces ? `{${str}}` : str;

  try {
    const locatorRegex = /(["']?locator["']?\s*:\s*)(xpath=[^,\}\n\r]+|css=[^,\}\n\r]+|chain=[^,\}\n\r]+)/g;
    const locatorPlaceholders: string[] = [];
    
    let maskedStr = wrappedStr.replace(locatorRegex, (match, p1, p2) => {
      locatorPlaceholders.push(`"${p2.trim()}"`);
      return `${p1}__LOCATOR_PLACEHOLDER_${locatorPlaceholders.length - 1}__`;
    });

    maskedStr = maskedStr.replace(/:\s*'((?:[^']|\\')*)'/g, (match, p1) => {
      return `: "${p1}"`;
    });

    let normalized = maskedStr
      .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
      .replace(/:\s*True\b/g, ": true")
      .replace(/:\s*False\b/g, ": false")
      .replace(/:\s*None\b/g, ": null")
      .replace(/,(\s*[}\]])/g, "$1");

    locatorPlaceholders.forEach((value, index) => {
      normalized = normalized.replace(`__LOCATOR_PLACEHOLDER_${index}__`, value);
    });

    return JSON.parse(normalized);
  } catch (err) {
    throw new Error(`❌ Failed to parse options string: "${str}". Error: ${err.message}`);
  }
}

function loadDefaults() {
  try {
    const defaultEntriesPath = path.resolve(process.env.PLAYQ_CORE_ROOT, 'helper/bundle/defaultEntries');
    const { default: defaultEntries } = require(defaultEntriesPath);
    
    if (Array.isArray(defaultEntries)) {
      defaultEntries.forEach((item) => {
        let value = getValue('env.' + item.name, true) ? getValue('env.' + item.name) : (getValue(item.name, true) ? getValue(item.name) : item.value);
        setValue(item.name, value);
      });
    }
  } catch (error) {
    console.warn('Warning: Could not load default entries:', error.message);
  }
}

function initVars(vars?: Record<string, string>) {
  try {
    // Load config with error handling
    let configEntries = {};
    try {
      const importConfigPath = path.resolve(process.env.PLAYQ_PROJECT_ROOT, 'resources/config');
      const configModule = require(importConfigPath);
      configEntries = configModule.config || configModule.default || {};
    } catch (error) {
      console.warn('Warning: Could not load config file, using empty config');
    }

    // Load variables with error handling
    let variablesEntries = {};
    try {
      const importVariablePath = path.resolve(process.env.PLAYQ_PROJECT_ROOT, 'resources/variable');
      const variableModule = require(importVariablePath);
      variablesEntries = variableModule.var_static || variableModule.default || {};
    } catch (error) {
      console.warn('Warning: Could not load variable file, using empty variables');
    }

    if (vars) {
      Object.assign(storedVars, vars);
    }
    
    Object.assign(storedVars, flattenConfig(variablesEntries, "var.static"));
    Object.assign(storedVars, flattenConfig(configEntries, "config"));
    loadPatternEntries();
    loadDefaults();
  } catch (error) {
    console.error('Error initializing vars:', error.message);
  }
}

export {
  getValue,
  getConfigValue,
  setValue,
  replaceVariables,
  debugVars,
  parseLooseJson,
  loadFileEntries,
  initVars
};



