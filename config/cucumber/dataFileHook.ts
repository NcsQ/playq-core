import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Before } from '@cucumber/cucumber';
import type { ITestCaseHookParameter, IWorld } from '@cucumber/cucumber';

// Track row index per scenario
const scenarioRowIndexMap: Map<string, number> = new Map();

Before(async function (this: IWorld, scenario: ITestCaseHookParameter) {
  const tags = scenario.pickle.tags.map(t => t.name);
  if (!tags.some(t => t.includes('TD:FILE'))) return;

  const tagMap: Record<string, string> = {};
  tags.forEach(tag => {
    const [key, value] = tag.replace('@', '').split('=');
    tagMap[key.trim()] = value?.trim();
  });

  const type = tagMap['TD:TYPE'];
  const file = tagMap['TD:FILE'];
  const filter = tagMap['TD:FILTER'];

  if (!type || !file || !filter) return;

  const filePath = path.resolve('test-data', file);
  const dataRows: any[] = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const safeFilter = filter.replace(/_([A-Z]+)/g, (_, key) => JSON.stringify(row[`_${key}`] || row[key]));
        try {
          if (eval(safeFilter)) {
            dataRows.push(row);
          }
        } catch (e) {
          console.warn(`Skipping row due to filter error: ${e.message}`);
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });

  const scenarioName = scenario.pickle.name;
  const currentIndex = scenarioRowIndexMap.get(scenarioName) ?? 0;

  if (currentIndex >= dataRows.length) {
    this.skip?.(); // Skip if no more data rows
    return;
  }

  const row = dataRows[currentIndex];
  scenarioRowIndexMap.set(scenarioName, currentIndex + 1);

  if (row) {
    this.testData = row;
    console.log(`[CSV Hook] Using row for scenario "${scenarioName}":`, row);
  }
});