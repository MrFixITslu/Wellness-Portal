import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
// Standard 32-byte encryption key. We use a fallback key if not specified in process.env.
const ENCRYPTION_KEY = crypto.scryptSync(
  process.env.DB_ENCRYPTION_SECRET || "CaribbeanWellnessSecretKey2026",
  "salt_caribbean",
  32
);
const IV_LENGTH = 16;

/**
 * Encrypts a string of text using AES-256-CBC.
 * Returns a colon-separated string of hex-encoded IV and hex-encoded ciphertext.
 */
export function encrypt(text: string): string {
  if (!text) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts an AES-256-CBC encrypted string.
 * Expects format 'iv_hex:ciphertext_hex'.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";
  try {
    const textParts = encryptedText.split(":");
    if (textParts.length < 2) return encryptedText; // Fallback if not encrypted
    const iv = Buffer.from(textParts.shift() || "", "hex");
    const encryptedStr = textParts.join(":");
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedStr, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Crypto Decryption Error:", error);
    return "[Decryption Error: This message or journal could not be decrypted securely.]";
  }
}
