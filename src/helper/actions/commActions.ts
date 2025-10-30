import { vars, webFixture, logFixture } from "@src/global";
import { warn } from "winston";
import * as crypto from '../util/utilities/cryptoUtil';
import { isCucumberRunner, isPlaywrightRunner } from "@config/runner";
import * as allure from "allure-js-commons";
import * as fs from 'fs';
import * as path from 'path';
import { parseLooseJson } from '../bundle/vars';
import { TOTPHelper } from '../util/totp/totpHelper';

/**
 * Comm: Wait-In-Milli-Seconds -seconds: {param}
 * 
 * Pauses execution for a given number of milliseconds.
 * Logs a message using the test logger if available.
 *
 * @param ms - The number of milliseconds to wait.
 *
 * @example
 * Comm: Wait-In-Milli-Seconds -seconds: "1000"
 */
export async function waitInMilliSeconds(ms: number) {
  const logger = logFixture.getLogger?.();
  logger?.info?.(`⏳ Waiting for ${ms} ms`);
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Comm: Comment -text: {param}
 * 
 * Logs a comment with variable substitution to the console.
 * Useful for adding contextual information to the test log.
 *
 * Variables inside the message string (e.g., ${var.username}) will be replaced using `vars.replaceVariables`.
 *
 * @param message - The comment or message to log.
 *
 * @example
 * Comm: Comment -text: "LAMBDA TEST COMPLETE"
 */
export async function comment(message: string) {
  let formattedMessage = vars.replaceVariables(message);
  console.log(`💬 Comment: ${formattedMessage}`);
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
 */
export async function encryptPassword(encryptText: string, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? parseLooseJson(options) : (options || {});
  let encryptedText = crypto.encrypt(encryptText);
  console.log('🔐 Encrypted Password:', 'pwd.'+encryptedText);
  return 'pwd.' + encryptedText;
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
 */
export async function encryptText(encryptText: string, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? parseLooseJson(options) : (options || {});
  let encryptedText = crypto.encrypt(encryptText);
  console.log('🔐 Encrypted Text:', 'enc.'+encryptedText);
  return 'enc.' + encryptedText;
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
 */
export async function encryptPasswordAndStore(encryptText: string, varNameToStore: string, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? parseLooseJson(options) : (options || {});
  let encryptedText = crypto.encrypt(encryptText);
  console.log('🔐 Encrypted Text:', 'pwd.'+encryptedText);
  vars.setValue(varNameToStore, 'pwd.'+encryptedText);
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
 */
export async function encryptTextAndStore(encryptText: string, varNameToStore: string, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? parseLooseJson(options) : (options || {});
  let encryptedText = crypto.encrypt(encryptText);
  console.log('🔐 Encrypted Text:', 'enc.'+encryptedText);
  vars.setValue(varNameToStore, 'enc.'+encryptedText);
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
 */
export async function decrypt(encryptedText: string, varName: string, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? parseLooseJson(options) : (options || {});
  let decryptedText = crypto.decrypt(encryptedText);
  vars.setValue(varName, decryptedText);
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
 */
export async function removeLeadingZeroFromMonthAndDate(dateStr: string): Promise<string> {
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
 */
export async function writeJsonToFile(
  filePath: string,
  data: any,
  options: WriteJsonOptions = { override: true, append: false, toArray: false }
): Promise<void> {
  const defaultOptions = { override: true, append: false, toArray: false };
  const opts = { ...defaultOptions, ...options };
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
  } else if (opts.override) {
    // Overwrite or create new file
    let out = data;
    if (opts.toArray) {
      out = Array.isArray(data) ? data : [data];
    }
    fs.writeFileSync(absPath, JSON.stringify(out, null, 2), 'utf-8');
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
 * Comm: Attach-Log -message: {param} -mimeType: {param} -msgType: {param}
 * 
 * Attach log or message to the test context (Cucumber or Playwright runner).
 * @param message The message or buffer to attach
 * @param mimeType The mime type (default: text/plain)
 */
export async function attachLog(
  message: string | Buffer,
  mimeType?: string,
  msgType?:string
  
) {
  if (!mimeType) mimeType = "text/plain"
  if (!msgType) msgType = ""


  if (isCucumberRunner()) {
    const world = webFixture.getWorld();
    if (world?.attach) {
      await world.attach(message, mimeType);
    } else {
      console.warn("⚠️ No World.attach() available in Cucumber context");
    }
  } else if (isPlaywrightRunner()) {
    allure.attachment(
      msgType,
      message,
      mimeType
    );
    // await playwrightTest
    //   .info()
    //   .attach("Log", { body: message, contentType: mimeType });
  } else {
    console.warn("⚠️ attachLog: Unknown runner type");
  }
}

/**
 * Comm: Store -value: {param} in -variable: {param} -options: {param}
 *
 * Stores a value (with optional variable substitution) into a runtime variable.
 *
 * Variables inside the value string (e.g., ${var.username}) will be resolved using `vars.replaceVariables`.
 *
 * @param value - The value to store (can include variable references).
 * @param varName - The name of the variable to store the resolved value into.
 * @param options - Optional string or object with additional parameters (parsed if string). Currently unused but reserved for future logic.
 *
 * @example
 * Store -value: "${faker.string.alphanumeric({length:4})}" in -variable: "var.centre.code" -options: ""
 */
export async function storeValue(value: string, varName: string, options?: string | Record<string, any>) {
  const options_json = typeof options === 'string' ? parseLooseJson(options) : (options || {});
  const resolvedValue = vars.replaceVariables(value);
  vars.setValue(varName, resolvedValue);
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
    await allure.step(
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
