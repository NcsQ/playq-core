// src/utils/cryptoUtil.ts
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();
const algorithm = 'aes-256-gcm';
const secretKey = crypto.scryptSync(process.env.PLAYQ_SECRET_KEY || '_DEFAULT_SECRET_32_CHARACTERS_!_', 'salt', 32);
const ivLength = 12; // Recommended IV size for GCM

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function decrypt(data: string): string {
  const combined = Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const iv = combined.subarray(0, ivLength);
  const authTag = combined.subarray(ivLength, ivLength + 16);
  const encrypted = combined.subarray(ivLength + 16);
  const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

// const algorithm = 'aes-256-cbc';
// const secretKey = process.env.CRYPTO_SECRET_KEY || '_DEFAULT_SECRET_32_CHARACTERS_!_';
// const ivLength = 16; // AES block size

// // --- Encrypt ---
// export function encrypt(text: string): string {
//   const iv = crypto.randomBytes(ivLength);
//   const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey, 'utf-8'), iv);
//   let encrypted = cipher.update(text, 'utf8', 'hex');
//   encrypted += cipher.final('hex');
//   return iv.toString('hex') + ':' + encrypted;
// }

// // --- Decrypt ---
// export function decrypt(encryptedText: string): string {
//   const [ivHex, encrypted] = encryptedText.split(':');
//   if (!ivHex || !encrypted) throw new Error('Invalid encrypted text format.');

//   const iv = Buffer.from(ivHex, 'hex');
//   const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey, 'utf-8'), iv);
//   let decrypted = decipher.update(encrypted, 'hex', 'utf8');
//   decrypted += decipher.final('utf8');
//   return decrypted;
// }