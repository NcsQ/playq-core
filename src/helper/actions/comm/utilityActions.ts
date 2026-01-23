import * as fs from 'fs';
import * as path from 'path';
import * as allure from 'allure-js-commons';
import { vars, comm } from '../../../global';
import * as crypto from '../../util/utilities/cryptoUtil';
import { TOTPHelper } from '../../util/totp/totpHelper';

function isPlaywrightRunner() { return process.env.TEST_RUNNER === 'playwright'; }
const __allureAny_comm: any = allure as any;
if (typeof __allureAny_comm.step !== 'function') {
  __allureAny_comm.step = async (_name: string, fn: any) => await fn();
}

/**
 * Comm: Encrypt-Password -text: {param} -options: {param}
 * 
 * Encrypts the given text as a password and returns it with a "pwd." prefix.
 *
 * @param encryptText - The text to encrypt.
 * @param options - Optional string or object of additional options (parsed if string).
 * @returns A string prefixed with "pwd." followed by the encrypted value.
 *
 * @throws Error if `encryptText` is not a non-empty string.
 *
 */
export async function encryptPassword(encryptText: string, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : (options || {});
  if (typeof encryptText !== 'string' || encryptText.length === 0) {
    throw new Error('❌ encryptPassword: encryptText must be a non-empty string.');
  }
  const doEncrypt = async () => {
    const encryptedText = crypto.encrypt(encryptText);
    console.log('🔐 Encrypted Password:', 'pwd.' + encryptedText);
    return 'pwd.' + encryptedText;
  };
  if (isPlaywrightRunner()) {
    return await __allureAny_comm.step(
      `Comm: Encrypt-Password -text: [redacted] -options: ${JSON.stringify(options_json)}`,
      async () => await doEncrypt()
    );
  }
  return await doEncrypt();
}

/**
 * Comm: Encrypt-Text -text: {param} -options: {param}
 * 
 * Encrypts the given text and returns it with an "enc." prefix.
 *
 * @param encryptText - The text to encrypt.
 * @param options - Optional string or object of additional options (parsed if string).
 * @returns A string prefixed with "enc." followed by the encrypted value.
 *
 * @throws Error if `encryptText` is not a non-empty string.
 *
 */
export async function encryptText(encryptText: string, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : (options || {});
  if (typeof encryptText !== 'string' || encryptText.length === 0) {
    throw new Error('❌ encryptText: encryptText must be a non-empty string.');
  }
  const doEncrypt = async () => {
    const encryptedText = crypto.encrypt(encryptText);
    console.log('🔐 Encrypted Text:', 'enc.' + encryptedText);
    return 'enc.' + encryptedText;
  };
  if (isPlaywrightRunner()) {
    return await __allureAny_comm.step(
      `Comm: Encrypt-Text -text: [redacted] -options: ${JSON.stringify(options_json)}`,
      async () => await doEncrypt()
    );
  }
  return await doEncrypt();
}

/**
 * Comm: Encrypt-Password -text: {param} and store in -variable: {param} -options: {param}
 * 
 * Encrypts the given password, prefixes it with "pwd.", and stores it in a variable.
 *
 * @param encryptText - The plain text password to encrypt.
 * @param varNameToStore - The name of the variable to store the encrypted password.
 * @param options - Optional string or object of additional options (parsed if string).
 *
 * @throws Error if `encryptText` or `varNameToStore` are not non-empty strings.
 *
 */
export async function encryptPasswordAndStore(encryptText: string, varNameToStore: string, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : (options || {});
  if (typeof encryptText !== 'string' || encryptText.length === 0) {
    throw new Error('❌ encryptPasswordAndStore: encryptText must be a non-empty string.');
  }
  if (typeof varNameToStore !== 'string' || varNameToStore.trim().length === 0) {
    throw new Error('❌ encryptPasswordAndStore: varNameToStore must be a non-empty string.');
  }
  const doEncryptAndStore = async () => {
    const encryptedText = crypto.encrypt(encryptText);
    console.log('🔐 Encrypted Text:', 'pwd.' + encryptedText);
    vars.setValue(varNameToStore, 'pwd.' + encryptedText);
    await comm.attachLog(`✅ Encrypted password stored in "${varNameToStore}"`, 'text/plain');
  };
  if (isPlaywrightRunner()) {
    await __allureAny_comm.step(
      `Comm: Encrypt-Password and store -variable: ${varNameToStore} -options: ${JSON.stringify(options_json)}`,
      async () => await doEncryptAndStore()
    );
  } else {
    await doEncryptAndStore();
  }
}

/**
 * Comm: Encrypt -text: {param} and store in -variable: {param} -options: {param}
 * 
 * Encrypts the given text, prefixes it with "enc.", and stores it in a variable.
 *
 * @param encryptText - The text to encrypt.
 * @param varNameToStore - The variable name to store the encrypted text.
 * @param options - Optional string or object of additional options (parsed if string).
 *
 * @throws Error if `encryptText` or `varNameToStore` are not non-empty strings.
 *
 */
export async function encryptTextAndStore(encryptText: string, varNameToStore: string, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : (options || {});
  if (typeof encryptText !== 'string' || encryptText.length === 0) {
    throw new Error('❌ encryptTextAndStore: encryptText must be a non-empty string.');
  }
  if (typeof varNameToStore !== 'string' || varNameToStore.trim().length === 0) {
    throw new Error('❌ encryptTextAndStore: varNameToStore must be a non-empty string.');
  }
  const doEncryptAndStore = async () => {
    const encryptedText = crypto.encrypt(encryptText);
    console.log('🔐 Encrypted Text:', 'enc.' + encryptedText);
    vars.setValue(varNameToStore, 'enc.' + encryptedText);
    await comm.attachLog(`✅ Encrypted text stored in "${varNameToStore}"`, 'text/plain');
  };
  if (isPlaywrightRunner()) {
    await __allureAny_comm.step(
      `Comm: Encrypt-Text and store -variable: ${varNameToStore} -options: ${JSON.stringify(options_json)}`,
      async () => await doEncryptAndStore()
    );
  } else {
    await doEncryptAndStore();
  }
}

/**
 * Comm: Decrypt -text: {param} and store in -variable: {param} -options: {param}
 * 
 * Decrypts the given encrypted text and stores the result in a variable.
 *
 * @param encryptedText - The encrypted value to decrypt.
 * @param varName - The variable name to store the decrypted result.
 * @param options - Optional string or object of additional options (parsed if string).
 *
 * @throws Error if `encryptedText` or `varName` are not non-empty strings.
 *
 */
export async function decrypt(encryptedText: string, varName: string, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? vars.parseLooseJson(options) : (options || {});
  if (typeof encryptedText !== 'string' || encryptedText.length === 0) {
    throw new Error('❌ decrypt: encryptedText must be a non-empty string.');
  }
  if (typeof varName !== 'string' || varName.trim().length === 0) {
    throw new Error('❌ decrypt: varName must be a non-empty string.');
  }
  const doDecryptAndStore = async () => {
    const decryptedText = crypto.decrypt(encryptedText);
    vars.setValue(varName, decryptedText);
    await comm.attachLog(`✅ Decrypted value stored in "${varName}"`, 'text/plain');
  };
  if (isPlaywrightRunner()) {
    await __allureAny_comm.step(
      `Comm: Decrypt -text: [redacted] and store in -variable: ${varName} -options: ${JSON.stringify(options_json)}`,
      async () => await doDecryptAndStore()
    );
  } else {
    await doDecryptAndStore();
  }
}

/**
 * Comm: Get-Random-From-List -arrayList: {param}
 * 
 * Selects and returns a random item from a given non-empty array.
 *
 * @template T
 * @param list - The array to select a random item from.
 * @returns A randomly selected item from the array.
 *
 * @throws Error if the list is not a non-empty array.
 *
 */
export async function getRandomFromList<T>(list: T[]): Promise<T> {
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("⚠️ getRandomFromList: list must be a non-empty array.");
  }
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

/**
 * Comm: Remove-Leading-Zero-From-Date -text: {param}
 * 
 * Removes leading zeros from both the day and month in a date string of format DD/MM/YYYY.
 * Example: '03/07/2025' => '3/7/2025'
 * @param dateStr - The date string in DD/MM/YYYY format
 * @returns The date string with leading zeros removed from day and month
 *
 * @throws Error if `dateStr` is not a non-empty string.
 */
export async function removeLeadingZeroFromMonthAndDate(dateStr: string): Promise<string> {
  if (typeof dateStr !== 'string' || dateStr.length === 0) {
    throw new Error('❌ removeLeadingZeroFromMonthAndDate: dateStr must be a non-empty string.');
  }
  return dateStr.replace(/\b0(\d)/g, "$1");
}

interface WriteJsonOptions {
  override?: boolean;
  append?: boolean;
  toArray?: boolean;
}

/**
 * Comm: Write-JSON-To-File -filePath: {param} -data: {param} -options: {param}
 * 
 * Writes JSON data to a file with options to override, append, or wrap in array.
 * 
 * @param filePath - The destination file path.
 * @param data - The JSON data to write (object or array).
 * @param options - { override, append, toArray }
 *
 * @throws Error if `filePath` is empty, if append mode file content is not a JSON array, or if both `override` and `append` are false.
 */
export async function writeJsonToFile(
  filePath: string,
  data: any,
  options: WriteJsonOptions = { override: true, append: false, toArray: false }
): Promise<void> {
  const defaultOptions = { override: true, append: false, toArray: false };
  const opts = { ...defaultOptions, ...options };
  if (typeof filePath !== 'string' || filePath.trim().length === 0) {
    throw new Error('❌ writeJsonToFile: filePath must be a non-empty string.');
  }
  const absPath = path.resolve(filePath);

  if (opts.append) {
    // Only works if file contains an array
    let arr: any[] = [];
    if (fs.existsSync(absPath)) {
      const fileContent = fs.readFileSync(absPath, 'utf-8');
      try {
        arr = JSON.parse(fileContent);
        if (!Array.isArray(arr)) throw new Error('File does not contain a JSON array.');
      } catch {
        throw new Error('File is not a valid JSON array.');
      }
    }
    arr.push(data);
    fs.writeFileSync(absPath, JSON.stringify(arr, null, 2), 'utf-8');
    await comm.attachLog(`✅ JSON appended to file: ${absPath}`, 'text/plain');
  } else if (opts.override) {
    // Overwrite or create new file
    let out = data;
    if (opts.toArray) {
      out = Array.isArray(data) ? data : [data];
    }
    fs.writeFileSync(absPath, JSON.stringify(out, null, 2), 'utf-8');
    await comm.attachLog(`✅ JSON written to file: ${absPath}`, 'text/plain');
  } else {
    throw new Error('Either override or append must be true.');
  }
}

/**
 * Ensures the value is formatted as a currency string: $<amount>.00
 * @param value - The input value (number or string)
 * @returns {string} - Formatted as $<amount>.00
 */
export function toDollarAmount(value: string | number): string {
  // Remove any non-numeric except dot
  let num = typeof value === 'number'
    ? value
    : parseFloat(String(value).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) num = 0;
  return `$${num.toFixed(2)}`;
}

/**
 * Comm: Generate TOTP Token to variable -varName: {param} -options: {param}
 *
 * Generates a TOTP (Time-based One-Time Password) token using the provided secret and stores it in a variable.
 *
 * @param varName - The name of the variable to store the generated TOTP token.
 * @param options - Optional string or object containing:
 *   - secret: [string] The TOTP secret key (default: process.env.PLAYQ_TOTP_SECRET_KEY).
 *
 * @example
 * Comm: Generate TOTP Token to variable -varName: "var.otp" -options: '{"secret":"MYSECRET"}'
 */
export async function generateTotpTokenToVariable(
  varName: string,
  options?: string | Record<string, any>
) {
  const options_json = typeof options === "string" ? vars.parseLooseJson(options) : options || {};
  const { secret, step = 30, digits = 6, algorithm = "SHA-1" } = options_json;

  if (isPlaywrightRunner()) {
    await __allureAny_comm.step(
      `Comm: Generate TOTP Token to variable -varName: ${varName} -options: ${JSON.stringify(options_json)}`,
      async () => {
        await doGenerateTotpTokenToVariable();
      }
    );
  } else {
    await doGenerateTotpTokenToVariable();
  }

  async function doGenerateTotpTokenToVariable() {
    let secretKey = process.env.PLAYQ_TOTP_SECRET_KEY || secret;

    if (!secretKey) {
      throw new Error('❌ PLAYQ_TOTP_SECRET_KEY not found in environment variables or in options');
    }

    if (secretKey.startsWith("enc.")) {
      secretKey = vars.replaceVariables(`#{${secretKey}}`);
    }
    const totpHelper = new TOTPHelper(secretKey);
    // Generate and return token
    const token = totpHelper.generateToken();
    vars.setValue(varName, token);
  }
}

/**
 * Alias: wait
 * Wrapper to maintain compatibility for step names mapping.
 */
export async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
