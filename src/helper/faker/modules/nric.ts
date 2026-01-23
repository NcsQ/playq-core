import { faker } from '@faker-js/faker';
/**
 * Generate a valid Singapore NRIC or FIN number according to official NRIC/FIN checksum rules.
 *
 * Rules:
 *  - The prefix is 'S' or 'T' for Singaporeans/PRs, 'F' or 'G' for foreigners.
 *  - 'S' and 'F' are for those registered before 2000, 'T' and 'G' for 2000 and after.
 *  - The 7 digits: first two are year of birth/registration, next five are random.
 *  - The checksum character is calculated using weights [2,7,6,5,4,3,2] and a modulo-11 algorithm.
 *  - For 'T' and 'G', add 4 to the sum before modulo.
 *  - The checksum character set differs for citizen/PR ('S','T') and foreigner ('F','G') prefixes.
 * See: https://en.wikipedia.org/wiki/National_Registration_Identity_Card#Structure
 */
/**
 * Options for NRIC generation.
 */
export interface NRICOptions {
  prefix?: string;
  yearOfBirth?: number;
}
const ST_CHECKSUM_CHARS = ["J", "Z", "I", "H", "G", "F", "E", "D", "C", "B", "A"];
const FG_CHECKSUM_CHARS = ["X", "W", "U", "T", "R", "Q", "P", "N", "M", "L", "K"];

function calculateNRICChecksum(prefix: string, digits: string): string {
  const WEIGHTS = [2, 7, 6, 5, 4, 3, 2];
  const digitArr = digits.split('').map(Number);
  let sum = digitArr.reduce((acc, digit, idx) => acc + digit * WEIGHTS[idx], 0);
  if (prefix === 'T' || prefix === 'G') {
    sum += 4;
  }
  const remainder = sum % 11;
  if (prefix === 'S' || prefix === 'T') {
    return ST_CHECKSUM_CHARS[remainder];
  } else {
    return FG_CHECKSUM_CHARS[remainder];
  }
}

/**
 * Generate a valid Singapore NRIC or FIN number according to official NRIC/FIN checksum rules.
 * @param options - Options for NRIC generation.
 * @returns A valid NRIC string.
 */
export function generateNRIC(options: NRICOptions = {}): string {
  let { prefix, yearOfBirth } = options;
    yearOfBirth = yearOfBirth ? Number(yearOfBirth) : undefined;

  if (typeof yearOfBirth === 'number' && yearOfBirth > new Date().getFullYear()) {
    throw new Error(`❌ yearOfBirth ${yearOfBirth} is in the future.`);
  }

  let resolvedPrefix: string;

  if (prefix) {
    resolvedPrefix = prefix;
  } else if (typeof yearOfBirth === 'number') {
    resolvedPrefix = yearOfBirth >= 2000 ? 'T' : 'S';
  } else {
    resolvedPrefix = faker.helpers.arrayElement(['S', 'T', 'F', 'G']);
  }

  if (!['S', 'T', 'F', 'G'].includes(resolvedPrefix)) {
    console.warn(`⚠️ Invalid prefix "${resolvedPrefix}" — choosing random valid prefix.`);
    resolvedPrefix = faker.helpers.arrayElement(['S', 'T', 'F', 'G']);
  }

    let digits: string;
    if (typeof yearOfBirth === 'number') {
    const yearDigits = String(yearOfBirth).slice(-2);
    const randomDigits = faker.string.numeric({ length: 5, allowLeadingZeros: true });
    digits = `${yearDigits}${randomDigits}`;
    } else {
    digits = faker.string.numeric({ length: 7, allowLeadingZeros: true });
    }  const checksum = calculateNRICChecksum(resolvedPrefix, digits);

  return `${resolvedPrefix}${digits}${checksum}`;
}

/**
    Function to extract the year from an NRIC number
    @param nric - The NRIC number as a string
    @returns The year of birth as a number, or null if the NRIC is invalid
 */
function getYearFromNRIC(nric: string): number | null {
  if (!/^[STFG]\d{7}[A-Z]$/.test(nric)) {
    console.warn(`❌ Invalid NRIC format: ${nric}`);
    return null;
  }

  const prefix = nric.charAt(0).toUpperCase();
  const yearDigits = parseInt(nric.slice(1, 3), 10);

  if (isNaN(yearDigits)) return null;

  switch (prefix) {
    case "S": // Born before 2000 (Singaporean)
    case "F": // Foreigner before 2000
      return 1900 + yearDigits;

    case "T": // Born in or after 2000 (Singaporean)
    case "G": // Foreigner in or after 2000
      return 2000 + yearDigits;

    default:
      return null;
  }
}

export {  getYearFromNRIC };