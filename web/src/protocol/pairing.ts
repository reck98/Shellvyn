/**
 * Shellvyn Pairing Code Utilities
 *
 * Implements 8-character Crockford Base32 formatting, normalization, and validation.
 */

export const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const CODE_LENGTH = 8;

/**
 * Normalizes user input into standard Crockford Base32 format (XXXX-XXXX).
 * Handles visual lookalikes: 'o' -> '0', 'i'/'l' -> '1', and strips whitespace/hyphens.
 */
export function normalizePairingCode(input: string): string {
  let cleaned = '';

  for (const ch of input) {
    if (ch === '-' || ch === ' ' || ch === '_') {
      continue;
    }
    if (ch === 'o' || ch === 'O') {
      cleaned += '0';
    } else if (ch === 'i' || ch === 'I' || ch === 'l' || ch === 'L') {
      cleaned += '1';
    } else {
      const upper = ch.toUpperCase();
      if (CROCKFORD_ALPHABET.includes(upper)) {
        cleaned += upper;
      }
    }
  }

  if (cleaned.length <= 4) {
    return cleaned;
  }
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
}

/**
 * Validates whether the formatted code meets the 8-character requirement.
 */
export function isValidPairingCode(code: string): boolean {
  const stripped = code.replace(/[- _]/g, '');
  if (stripped.length !== CODE_LENGTH) {
    return false;
  }
  for (const ch of stripped) {
    if (!CROCKFORD_ALPHABET.includes(ch)) {
      return false;
    }
  }
  return true;
}
