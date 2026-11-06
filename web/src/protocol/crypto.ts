/**
 * Shellvyn Zero-Knowledge End-to-End Encryption (E2EE)
 *
 * Implements ChaCha20-Poly1305 AEAD and HKDF-SHA256 session key derivation
 * matching the Rust `shellvyn-core::crypto` implementation.
 */

import { chacha20poly1305 } from '@noble/ciphers/chacha.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';

const HKDF_INFO = new TextEncoder().encode('Shellvyn-E2EE-v2');
export const NONCE_LENGTH = 12;
export const TAG_LENGTH = 16;

/**
 * Derives a 32-byte symmetric AEAD key from a pairing code and session salt.
 */
export function deriveSessionKey(secret: string, salt: Uint8Array): Uint8Array {
  const ikm = new TextEncoder().encode(secret);
  return hkdf(sha256, ikm, salt, HKDF_INFO, 32);
}

/**
 * Encrypts a plaintext frame payload using ChaCha20-Poly1305.
 * Output format: `[12-byte Nonce] + [Ciphertext + 16-byte Poly1305 Tag]`.
 */
export function encryptFrame(key: Uint8Array, plaintext: Uint8Array): Uint8Array {
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));
  const cipher = chacha20poly1305(key, nonce);
  const ciphertext = cipher.encrypt(plaintext);

  const output = new Uint8Array(NONCE_LENGTH + ciphertext.length);
  output.set(nonce, 0);
  output.set(ciphertext, NONCE_LENGTH);
  return output;
}

/**
 * Decrypts an encrypted frame payload using ChaCha20-Poly1305.
 * Input format: `[12-byte Nonce] + [Ciphertext + 16-byte Poly1305 Tag]`.
 */
export function decryptFrame(key: Uint8Array, payload: Uint8Array): Uint8Array {
  if (payload.length < NONCE_LENGTH + TAG_LENGTH) {
    throw new Error(
      `Payload too short for decryption: expected at least ${NONCE_LENGTH + TAG_LENGTH} bytes, got ${payload.length}`
    );
  }

  const nonce = payload.subarray(0, NONCE_LENGTH);
  const ciphertext = payload.subarray(NONCE_LENGTH);
  const cipher = chacha20poly1305(key, nonce);

  return cipher.decrypt(ciphertext);
}

/**
 * Encrypts plaintext and returns a standard Base64 string for relay transmission.
 */
export function encryptToBase64(key: Uint8Array, plaintext: Uint8Array): string {
  const encrypted = encryptFrame(key, plaintext);
  let binary = '';
  for (let i = 0; i < encrypted.length; i++) {
    binary += String.fromCharCode(encrypted[i]);
  }
  return btoa(binary);
}

/**
 * Decodes a Base64 string and decrypts it with ChaCha20-Poly1305.
 */
export function decryptFromBase64(key: Uint8Array, b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return decryptFrame(key, bytes);
}
