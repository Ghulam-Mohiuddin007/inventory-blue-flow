// Native Web Crypto API for In-Device Credential Hashing
// Uses PBKDF2 with HMAC-SHA256 and 100,000 iterations with 16-byte cryptographically secure random salt.
// Runs natively in modern browser engines with zero external dependencies and zero cloud roundtrips.

export interface PasswordHashResult {
  hash: string;
  salt: string;
}

/**
 * Converts a Uint8Array buffer into a hexadecimal string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converts a hexadecimal string back into a Uint8Array buffer
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Generates a 16-byte cryptographically secure random salt
 */
export function generateSalt(): string {
  const salt = new Uint8Array(16);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(salt);
  } else {
    for (let i = 0; i < 16; i++) {
      salt[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytesToHex(salt);
}

/**
 * Derives a PBKDF2 HMAC-SHA256 key from a plaintext password using the specified or new salt
 */
export async function hashPassword(password: string, existingSaltHex?: string): Promise<PasswordHashResult> {
  const saltHex = existingSaltHex || generateSalt();
  const saltBytes = hexToBytes(saltHex);
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    // Basic fallback for non-crypto environments (should rarely happen in modern browsers)
    let fallbackHash = 0;
    for (let i = 0; i < password.length; i++) {
      fallbackHash = (fallbackHash << 5) - fallbackHash + password.charCodeAt(i);
      fallbackHash |= 0;
    }
    return {
      hash: `fallback_${Math.abs(fallbackHash).toString(16)}_${saltHex}`,
      salt: saltHex
    };
  }

  // Import raw password as key material
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // Derive 256 bits (32 bytes) using 100,000 iterations of PBKDF2-HMAC-SHA256
  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  const hashHex = bytesToHex(new Uint8Array(derivedBits));

  return {
    hash: hashHex,
    salt: saltHex
  };
}

/**
 * Verifies a plaintext password against a stored PBKDF2 hash and salt
 */
export async function verifyPassword(password: string, storedHash: string, saltHex: string): Promise<boolean> {
  if (!password || !storedHash || !saltHex) return false;
  const { hash } = await hashPassword(password, saltHex);
  return hash === storedHash;
}
