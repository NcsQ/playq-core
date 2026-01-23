import fs from 'fs';
import path from 'path';
import * as XLSX from '@e965/xlsx';

/**
 * Reads test data from .json, .xlsx, or .csv
 *
 * @param file - Filename WITH extension, e.g., "login.json", "login.xlsx", "login.csv"
 * @param sheetName - (optional) Sheet name for Excel files
 */
export function getTestData(file: string, sheetName?: string): any[] {
  // Attempt to locate the project's test-data directory robustly.
  // Strategy:
  // 1. Starting at process.cwd(), walk upward looking for a folder that
  //    contains a package.json (project root) and a test-data subfolder.
  // 2. If found, use <foundRoot>/test-data/<file>.
  // 3. Otherwise, fallback to process.cwd()/test-data/<file> and report a clear ENOENT.

  function findProjectRootWithTestData(startDir: string): string | null {
    let current = path.resolve(startDir);
    const root = path.parse(current).root;
    while (true) {
      const pkg = path.join(current, 'package.json');
      const td = path.join(current, 'test-data');
      if (fs.existsSync(pkg) && fs.existsSync(td) && fs.statSync(td).isDirectory()) {
        return td;
      }
      if (current === root) break;
      current = path.dirname(current);
    }
    return null;
  }

  const start = process.cwd();
  const projectTestData = findProjectRootWithTestData(start);

  // If not found by walking upward, also check immediate subdirectories of the
  // current directory. This handles the common developer workspace layout where
  // the workspace root contains multiple project folders (e.g. PlayQ_PROJECT).
  let basePath: string;
  if (projectTestData) {
    basePath = projectTestData;
  } else {
    // scan one-level children for a project that contains package.json and test-data
    const children = fs.readdirSync(start, { withFileTypes: true });
    let found: string | null = null;
    for (const child of children) {
      if (!child.isDirectory()) continue;
      const candidate = path.join(start, child.name);
      const pkg = path.join(candidate, 'package.json');
      const td = path.join(candidate, 'test-data');
      try {
        if (fs.existsSync(pkg) && fs.existsSync(td) && fs.statSync(td).isDirectory()) {
          found = td;
          break;
        }
      } catch (e) {
        // ignore permission or stat errors on non-readable dirs
      }
    }
    basePath = found || path.resolve(process.cwd(), 'test-data');
  }

  const filePath = path.join(basePath, file);

  if (!fs.existsSync(filePath)) {
    throw new Error(`ENOENT: test data file not found: ${filePath}. Searched from ${start}`);
  }
  const ext = path.extname(file).toLowerCase();

  switch (ext) {
    case '.json': {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
    case '.xlsx': {
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { raw: false });

        // Try to parse booleans/numbers
        return rows.map(row => {
          const parsedRow: Record<string, any> = {};
          for (const key in row) {
            const value = row[key];
            if (value === 'true' || value === 'false') {
              parsedRow[key] = value === 'true';
            } else if (!isNaN(value) && value.trim() !== '') {
              parsedRow[key] = Number(value);
            } else {
              parsedRow[key] = value;
            }
          }
          return parsedRow;
        });
      // const workbook = XLSX.readFile(filePath);
      // const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
      // return XLSX.utils.sheet_to_json(sheet);
    }
    case '.csv': {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      const worksheet = XLSX.read(fileData, { type: 'string' }).Sheets['Sheet1'];
      return XLSX.utils.sheet_to_json(worksheet);
    }
    default:
      throw new Error(`Unsupported file extension: ${ext}`);
  }
}