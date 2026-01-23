import { faker } from '@faker-js/faker';


interface CurrentDateTimeOptions {
  format?: string;
}

export function generateCurrentDateTime(options: CurrentDateTimeOptions = {}): string {
  const { format = 'DD-MM-YYYY HH:mm:ss' } = options;
  const date = new Date();

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const yy = String(yyyy).slice(-2);
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');

  // Replace tokens in format string
  let result = format;
  result = result.replace(/DD/g, dd)
                 .replace(/MM/g, mm)
                 .replace(/YYYY/g, String(yyyy))
                 .replace(/YY/g, yy)
                 .replace(/HH/g, hh)
                 .replace(/mm/g, min)
                 .replace(/ss/g, ss);
  return result;
}

interface AddMonthsOptions {
  inputFormat?:
    | 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD'
    | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY/MM/DD'
    | 'DD-MM-YY'   | 'MM-DD-YY'   | 'YY-MM-DD'
    | 'DD/MM/YY'   | 'MM/DD/YY'   | 'YY/MM/DD';
  outputFormat?:
    | 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD'
    | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY/MM/DD'
    | 'DD-MM-YY'   | 'MM-DD-YY'   | 'YY-MM-DD'
    | 'DD/MM/YY'   | 'MM/DD/YY'   | 'YY/MM/DD';
  clampToLastDayOfMonth?: boolean;
}

function parseDate(dateStr: string, format: string): Date {
  const sep = format.includes('/') ? '/' : '-';
  const parts = dateStr.split(sep);
  let day = 1, month = 0, year = 1970;
  switch (format) {
    case 'DD-MM-YYYY': case 'DD/MM/YYYY':
      [day, month, year] = [parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])]; break;
    case 'MM-DD-YYYY': case 'MM/DD/YYYY':
      [month, day, year] = [parseInt(parts[0]) - 1, parseInt(parts[1]), parseInt(parts[2])]; break;
    case 'YYYY-MM-DD': case 'YYYY/MM/DD':
      [year, month, day] = [parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])]; break;
    case 'DD-MM-YY': case 'DD/MM/YY':
      [day, month, year] = [parseInt(parts[0]), parseInt(parts[1]) - 1, 2000 + parseInt(parts[2])]; break;
    case 'MM-DD-YY': case 'MM/DD/YY':
      [month, day, year] = [parseInt(parts[0]) - 1, parseInt(parts[1]), 2000 + parseInt(parts[2])]; break;
    case 'YY-MM-DD': case 'YY/MM/DD':
      [year, month, day] = [2000 + parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])]; break;
    default:
      throw new Error('Unsupported input format');
  }
  return new Date(year, month, day);
}

function formatDate(date: Date, format: string): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const yy = String(yyyy).slice(-2);
  switch (format) {
    case 'YYYY-MM-DD': return `${yyyy}-${mm}-${dd}`;
    case 'YYYY/MM/DD': return `${yyyy}/${mm}/${dd}`;
    case 'MM-DD-YYYY': return `${mm}-${dd}-${yyyy}`;
    case 'MM/DD/YYYY': return `${mm}/${dd}/${yyyy}`;
    case 'DD/MM/YYYY': return `${dd}/${mm}/${yyyy}`;
    case 'DD-MM-YYYY': return `${dd}-${mm}-${yyyy}`;
    case 'DD-MM-YY':   return `${dd}-${mm}-${yy}`;
    case 'MM-DD-YY':   return `${mm}-${dd}-${yy}`;
    case 'YY-MM-DD':   return `${yy}-${mm}-${dd}`;
    case 'DD/MM/YY':   return `${dd}/${mm}/${yy}`;
    case 'MM/DD/YY':   return `${mm}/${dd}/${yy}`;
    case 'YY/MM/DD':   return `${yy}/${mm}/${dd}`;
    default:           return `${dd}/${mm}/${yy}`;
  }
}

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function addMonthsToDate(
  dateStr: string,
  months: number | string,
  options: AddMonthsOptions = {}
): string {
  const inputFormat = options.inputFormat || 'DD-MM-YY';
  const outputFormat = options.outputFormat || 'DD-MM-YY';
  const clamp = options.clampToLastDayOfMonth || false;
  const date = parseDate(dateStr, inputFormat);
  const originalDay = date.getDate();
  const monthsNum = typeof months === 'string' ? parseInt(months, 10) : months;
  date.setMonth(date.getMonth() + monthsNum);
  if (clamp && date.getDate() !== originalDay) {
    date.setDate(0);
  }
  return formatDate(date, outputFormat);
}

/**
 * Removes leading zeros from both the day and month in a date string of format DD/MM/YYYY.
 * Example: '03/07/2025' => '3/7/2025'
 * @param dateStr - The date string in DD/MM/YYYY format
 * @returns The date string with leading zeros removed from day and month
 */
export function removeLeadingZeroFromMonthAndDate(dateStr: string): string {
  return dateStr.replace(/\b0(\d)/g, "$1");
}
