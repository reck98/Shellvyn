use crate::error::{CoreError, Result};
use rand::rngs::OsRng;
use rand::RngCore;

/// Crockford's Base32 alphabet (32 characters, excludes I, L, O, U to prevent visual confusion).
pub const CROCKFORD_ALPHABET: &[u8; 32] = b"0123456789ABCDEFGHJKMNPQRSTVWXYZ";

pub const CODE_LENGTH: usize = 8;

/// Generates a cryptographically secure 8-character Crockford Base32 pairing code
/// formatted with a hyphen as `XXXX-XXXX`.
pub fn generate_pairing_code() -> String {
    let mut random_bytes = [0u8; CODE_LENGTH];
    OsRng.fill_bytes(&mut random_bytes);

    let mut raw = String::with_capacity(CODE_LENGTH);
    for b in random_bytes {
        let idx = (b % 32) as usize;
        raw.push(CROCKFORD_ALPHABET[idx] as char);
    }

    format!("{}-{}", &raw[0..4], &raw[4..8])
}

/// Normalizes and validates a pairing code.
/// Allows optional hyphens, spaces, and case-insensitivity.
/// Replaces common typos: 'O'/'o' -> '0', 'I'/'i'/'L'/'l' -> '1'.
pub fn normalize_and_validate_code(input: &str) -> Result<String> {
    let mut cleaned = String::with_capacity(CODE_LENGTH);

    for ch in input.chars() {
        match ch {
            '-' | ' ' | '_' => continue,
            'o' | 'O' => cleaned.push('0'),
            'i' | 'I' | 'l' | 'L' => cleaned.push('1'),
            c if c.is_ascii_alphanumeric() => {
                let upper = c.to_ascii_uppercase();
                if CROCKFORD_ALPHABET.contains(&(upper as u8)) {
                    cleaned.push(upper);
                } else {
                    return Err(CoreError::InvalidPairingCode(format!(
                        "Character '{}' is not in Crockford Base32 alphabet",
                        c
                    )));
                }
            }
            c => {
                return Err(CoreError::InvalidPairingCode(format!(
                    "Invalid character in code: '{}'",
                    c
                )));
            }
        }
    }

    if cleaned.len() != CODE_LENGTH {
        return Err(CoreError::InvalidPairingCode(format!(
            "Pairing code must contain exactly {} characters (found {})",
            CODE_LENGTH,
            cleaned.len()
        )));
    }

    Ok(format!("{}-{}", &cleaned[0..4], &cleaned[4..8]))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_pairing_code_format() {
        let code = generate_pairing_code();
        assert_eq!(code.len(), 9);
        assert_eq!(&code[4..5], "-");
        assert!(normalize_and_validate_code(&code).is_ok());
    }

    #[test]
    fn test_normalize_valid_codes() {
        let code = "kv7m-9x2p";
        let norm = normalize_and_validate_code(code).unwrap();
        assert_eq!(norm, "KV7M-9X2P");

        let code_no_hyphen = "KV7M9X2P";
        let norm = normalize_and_validate_code(code_no_hyphen).unwrap();
        assert_eq!(norm, "KV7M-9X2P");
    }

    #[test]
    fn test_normalize_visual_lookalikes() {
        // 'o' -> '0', 'l' -> '1', 'i' -> '1'
        let code = "koli-9xlp";
        let norm = normalize_and_validate_code(code).unwrap();
        assert_eq!(norm, "K011-9X1P");
    }

    #[test]
    fn test_reject_invalid_length() {
        assert!(normalize_and_validate_code("123").is_err());
        assert!(normalize_and_validate_code("123456789").is_err());
    }

    #[test]
    fn test_reject_invalid_characters() {
        // 'U' is excluded from Crockford Base32
        assert!(normalize_and_validate_code("KV7M-9X2U").is_err());
    }
}
