use crate::error::{CoreError, Result};
use base64::prelude::*;
use chacha20poly1305::aead::{Aead, KeyInit};
use chacha20poly1305::{ChaCha20Poly1305, Nonce};
use hkdf::Hkdf;
use rand::rngs::OsRng;
use rand::RngCore;
use sha2::Sha256;

const HKDF_INFO: &[u8] = b"Shellvyn-E2EE-v2";
pub const NONCE_LENGTH: usize = 12;
pub const TAG_LENGTH: usize = 16;

/// Derives a 32-byte symmetric key for ChaCha20-Poly1305 from a pairing secret and salt.
pub fn derive_session_key(secret: &str, salt: &[u8]) -> Result<[u8; 32]> {
    let hk = Hkdf::<Sha256>::new(Some(salt), secret.as_bytes());
    let mut okm = [0u8; 32];
    hk.expand(HKDF_INFO, &mut okm)
        .map_err(|e| CoreError::Crypto(format!("HKDF key derivation failed: {:?}", e)))?;
    Ok(okm)
}

/// Encrypts plaintext bytes using ChaCha20-Poly1305.
/// Output format: `[12-byte Nonce] + [Ciphertext + 16-byte Tag]`.
pub fn encrypt_frame(key: &[u8; 32], plaintext: &[u8]) -> Result<Vec<u8>> {
    let cipher = ChaCha20Poly1305::new(key.into());

    let mut nonce_bytes = [0u8; NONCE_LENGTH];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| CoreError::Crypto(format!("Encryption failed: {:?}", e)))?;

    let mut output = Vec::with_capacity(NONCE_LENGTH + ciphertext.len());
    output.extend_from_slice(&nonce_bytes);
    output.extend_from_slice(&ciphertext);
    Ok(output)
}

/// Decrypts an encrypted frame payload using ChaCha20-Poly1305.
/// Input format must be: `[12-byte Nonce] + [Ciphertext + 16-byte Tag]`.
pub fn decrypt_frame(key: &[u8; 32], payload: &[u8]) -> Result<Vec<u8>> {
    if payload.len() < NONCE_LENGTH + TAG_LENGTH {
        return Err(CoreError::Crypto(format!(
            "Payload too short for decryption: expected at least {} bytes, found {}",
            NONCE_LENGTH + TAG_LENGTH,
            payload.len()
        )));
    }

    let cipher = ChaCha20Poly1305::new(key.into());
    let nonce = Nonce::from_slice(&payload[..NONCE_LENGTH]);
    let ciphertext = &payload[NONCE_LENGTH..];

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| CoreError::Crypto(format!("Decryption / authentication tag failed: {:?}", e)))?;

    Ok(plaintext)
}

/// Encrypts plaintext and returns a standard Base64-encoded string for relay transmission.
pub fn encrypt_to_base64(key: &[u8; 32], plaintext: &[u8]) -> Result<String> {
    let encrypted = encrypt_frame(key, plaintext)?;
    Ok(BASE64_STANDARD.encode(encrypted))
}

/// Decodes Base64-encoded ciphertext and decrypts it with ChaCha20-Poly1305.
pub fn decrypt_from_base64(key: &[u8; 32], b64_payload: &str) -> Result<Vec<u8>> {
    let bytes = BASE64_STANDARD
        .decode(b64_payload)
        .map_err(|e| CoreError::Crypto(format!("Invalid base64 payload: {:?}", e)))?;
    decrypt_frame(key, &bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_e2ee_encryption_decryption_roundtrip() {
        let secret = "KV7M-9X2P";
        let salt = b"session-salt-12345";
        let key = derive_session_key(secret, salt).unwrap();

        let original_data = b"echo 'classified terminal output'";
        let encrypted = encrypt_frame(&key, original_data).unwrap();

        // Ensure payload is nonce + data + tag
        assert_eq!(encrypted.len(), NONCE_LENGTH + original_data.len() + TAG_LENGTH);

        let decrypted = decrypt_frame(&key, &encrypted).unwrap();
        assert_eq!(&decrypted[..], original_data);
    }

    #[test]
    fn test_base64_relay_encryption_roundtrip() {
        let secret = "KV7M-9X2P";
        let salt = b"relay-salt-98765";
        let key = derive_session_key(secret, salt).unwrap();

        let original = b"relay packet data payload";
        let b64 = encrypt_to_base64(&key, original).unwrap();
        assert!(!b64.is_empty());

        let decrypted = decrypt_from_base64(&key, &b64).unwrap();
        assert_eq!(&decrypted[..], original);
    }

    #[test]
    fn test_decryption_fails_with_wrong_key() {
        let secret_a = "KV7M-9X2P";
        let secret_b = "W89N-1A4C";
        let salt = b"salt-123";

        let key_a = derive_session_key(secret_a, salt).unwrap();
        let key_b = derive_session_key(secret_b, salt).unwrap();

        let original_data = b"secret data";
        let encrypted = encrypt_frame(&key_a, original_data).unwrap();

        let result = decrypt_frame(&key_b, &encrypted);
        assert!(result.is_err());
    }

    #[test]
    fn test_decryption_fails_if_tampered() {
        let key = derive_session_key("CODE-1234", b"salt").unwrap();
        let mut encrypted = encrypt_frame(&key, b"unaltered data").unwrap();

        // Tamper with last byte (part of Poly1305 tag)
        let len = encrypted.len();
        encrypted[len - 1] ^= 0x55;

        assert!(decrypt_frame(&key, &encrypted).is_err());
    }
}
