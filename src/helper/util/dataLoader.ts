
import fs from 'fs';
import path from 'path';
import * as XLSX from '@e965/xlsx';

type DataFormat = 'json' | 'excel' | 'csv';

/**
 * Reads test data from .json, .xlsx, or .csv
 *
 * @param file - Filename (without extension), e.g., "login"
 * @param format - File format: "json" | "excel" | "csv"
 * @param sheetName - (optional) Sheet name for Excel files
 */
export function getTestData(file: string, format: DataFormat = 'json', sheetName?: string): any[] {
  const basePath = path.resolve(`resources/test-data`);

  switch (format) {
    case 'json': {
      const jsonPath = path.join(basePath, `${file}.json`);
      const raw = fs.readFileSync(jsonPath, 'utf-8');
      return JSON.parse(raw);
    }

    case 'excel': {
      const xlsxPath = path.join(basePath, `${file}.xlsx`);
      const workbook = XLSX.readFile(xlsxPath);
      const sheet = workbook.Sheets[sheetName || workbook.SheetNames[0]];
      return XLSX.utils.sheet_to_json(sheet);
    }

    case 'csv': {
      const csvPath = path.join(basePath, `${file}.csv`);
      const fileData = fs.readFileSync(csvPath, 'utf-8');
      const worksheet = XLSX.read(fileData, { type: 'string' }).Sheets['Sheet1'];
      return XLSX.utils.sheet_to_json(worksheet);
    }

    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}