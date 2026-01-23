/**
 * @file testDataActions.ts
 *
 * Test data helpers for PlayQ web actions.
 * Supports JSON and CSV loading plus sample data generation via faker.
 *
 * Authors: PlayQ Team
 * Version: v1.0.0
 */
import * as fs from 'fs';
import * as path from 'path';
import { faker } from "../../../global";

/**
 * Web: Load Test Data JSON -file: {param}
 *
 * Loads and parses JSON test data from a file.
 *
 * @param filePath - Path to JSON file
 * @returns Parsed JSON content
 * @throws Error if file does not exist or JSON parsing fails
 */
export async function loadFromJson(filePath: string) {
  if (!filePath) throw new Error("testData.loadFromJson: 'filePath' is required");
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) throw new Error(`testData.loadFromJson: File not found at '${abs}'`);
  const content = fs.readFileSync(abs, 'utf-8');
  try {
    return JSON.parse(content);
  } catch (err: any) {
    throw new Error(`testData.loadFromJson: Failed to parse JSON - ${err?.message || err}`);
  }
}

/**
 * Web: Load Test Data CSV -file: {param}
 *
 * Loads CSV test data from a file and returns an array of objects.
 *
 * @param filePath - Path to CSV file
 * @returns Array of row objects keyed by header names
 * @throws Error if file does not exist or CSV is empty/invalid
 */
export async function loadFromCsv(filePath: string) {
  if (!filePath) throw new Error("testData.loadFromCsv: 'filePath' is required");
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) throw new Error(`testData.loadFromCsv: File not found at '${abs}'`);
  const content = (fs.readFileSync(abs, 'utf-8') || '').trim();
  if (!content) throw new Error("testData.loadFromCsv: CSV file is empty");
  const [headerLine, ...rows] = content.split(/\r?\n/);
  if (!headerLine) throw new Error("testData.loadFromCsv: Missing header line");
  const headers = headerLine.split(',').map(h => h.trim());
  return rows.filter(r => r && r.trim().length > 0).map(r => {
    const cols = r.split(',');
    const obj: any = {};
    headers.forEach((h, i) => obj[h] = (cols[i] ?? '').trim());
    return obj;
  });
}

/**
 * Web: Generate Sample Data -schema: {param}
 *
 * Generates sample test data, optionally merged with a provided schema.
 *
 * @param schema - Optional object to override default generated fields
 * @returns Object containing generated sample fields
 */
function generateValueByDescriptor(descriptor: string): any {
  const d = (descriptor || '').toString().toLowerCase().trim();
  switch (d) {
    case 'string':
      return faker?.lorem?.word?.() || 'sample';
    case 'number':
    case 'int':
    case 'integer':
      return (faker as any)?.number?.int?.({ min: 0, max: 9999 }) ?? 0;
    case 'float':
    case 'decimal':
      return (faker as any)?.number?.float?.({ min: 0, max: 9999, precision: 0.01 }) ?? 0.0;
    case 'boolean':
      return Math.random() < 0.5;
    case 'email':
      return faker?.internet?.email?.() || 'user@example.com';
    case 'phone':
    case 'phonenumber':
      return faker?.phone?.number?.() || '1234567890';
    case 'firstname':
      return faker?.person?.firstName?.() || 'John';
    case 'lastname':
      return faker?.person?.lastName?.() || 'Doe';
    case 'fullname':
    case 'name':
      return `${faker?.person?.firstName?.() || 'John'} ${faker?.person?.lastName?.() || 'Doe'}`;
    case 'uuid':
      return (faker as any)?.string?.uuid?.() || '00000000-0000-0000-0000-000000000000';
    case 'date':
      return new Date().toISOString().slice(0, 10);
    case 'datetime':
    case 'isodatetime':
      return new Date().toISOString();
    case 'timestamp':
      return Date.now();
    case 'url':
      return faker?.internet?.url?.() || 'https://example.com';
    case 'ip':
    case 'ipv4':
      return (faker as any)?.internet?.ip?.() || '127.0.0.1';
    case 'city':
      return (faker as any)?.location?.city?.() || 'Metropolis';
    case 'country':
      return (faker as any)?.location?.country?.() || 'Wonderland';
    case 'company':
      return (faker as any)?.company?.name?.() || 'ACME Inc.';
    default:
      // Unknown descriptor → return as-is to avoid surprises
      return descriptor;
  }
}

function generateFromSchema(schema: any): any {
  if (schema == null) return schema;
  if (Array.isArray(schema)) {
    // If array has a single descriptor like ['string'], generate a small array of values
    if (schema.length === 1 && typeof schema[0] === 'string') {
      return [generateValueByDescriptor(schema[0] as string), generateValueByDescriptor(schema[0] as string)];
    }
    // Otherwise, map values
    return schema.map((v) => (typeof v === 'string' ? generateValueByDescriptor(v) : generateFromSchema(v)));
  }
  if (typeof schema === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(schema)) {
      if (typeof v === 'string') {
        out[k] = generateValueByDescriptor(v);
      } else if (typeof v === 'number' || typeof v === 'boolean') {
        out[k] = v;
      } else if (Array.isArray(v)) {
        out[k] = generateFromSchema(v);
      } else if (typeof v === 'object' && v !== null) {
        out[k] = generateFromSchema(v);
      } else {
        out[k] = v;
      }
    }
    return out;
  }
  if (typeof schema === 'string') return generateValueByDescriptor(schema);
  return schema;
}

export async function generateSampleData(schema?: Record<string, any>) {
  const sample = {
    firstName: faker?.person?.firstName?.() || 'John',
    lastName: faker?.person?.lastName?.() || 'Doe',
    email: faker?.internet?.email?.() || 'john.doe@example.com',
    phone: faker?.phone?.number?.() || '1234567890'
  } as any;
  if (!schema) return sample;
  const interpreted = generateFromSchema(schema);
  return { ...sample, ...interpreted };
}
