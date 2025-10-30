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
  const basePath = path.resolve(`test-data`);
  const filePath = path.join(basePath, file);
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