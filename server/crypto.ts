import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit nonce, recommended size for GCM
const AUTH_TAG_LENGTH = 16;

// SECURITY: there is intentionally NO fallback secret here. Journals and
// peer messages are private mental-health content; encrypting them with a
// key that ships in a public repo would be worse than not encrypting at all,
// since it creates a false sense of security. Fail loudly at startup instead.
const secret = process.env.DB_ENCRYPTION_SECRET;
if (!secret || secret.length < 16) {
  throw new Error(
    "DB_ENCRYPTION_SECRET is missing or too short (need 16+ characters). " +
    "Set it in your environment before starting the server — see .env.example."
  );
}

// Derive the AES key once at startup rather than on every call.
const ENCRYPTION_KEY = crypto.scryptSync(secret, "saman-wellness-kdf-salt-v1", 32);

/**
 * Encrypts a string using AES-256-GCM (authenticated encryption).
 * Returns a colon-separated string: iv_hex:authTag_hex:ciphertext_hex
 * Unlike CBC, GCM detects tampering — decrypt() will throw rather than
 * silently return corrupted plaintext if the ciphertext was modified.
 */
export function encrypt(text: string): string {
  if (!text) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string produced by encrypt().
 * Also accepts legacy 2-part (iv:ciphertext) CBC-format strings from data
 * written before the GCM migration, so existing records don't break.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";
  try {
    const parts = encryptedText.split(":");

    if (parts.length === 3) {
      // Current AES-256-GCM format
      const [ivHex, authTagHex, dataHex] = parts;
      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");
      const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
      return decrypted.toString("utf8");
    }

    // Legacy fallback: cannot be decrypted safely without the old CBC key
    // derivation. Surfacing this explicitly is safer than guessing.
    return "[This entry was encrypted with a retired legacy scheme and cannot be recovered automatically.]";
  } catch (error) {
    console.error("Crypto decryption failed (data may be corrupted or tampered with):", (error as Error).message);
    return "[Decryption Error: This message or journal could not be decrypted securely.]";
  }
}
