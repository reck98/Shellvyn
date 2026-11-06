use thiserror::Error;

#[derive(Error, Debug)]
pub enum CoreError {
    #[error("Framing error: {0}")]
    Framing(String),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Invalid pairing code format: {0}")]
    InvalidPairingCode(String),

    #[error("Cryptography error: {0}")]
    Crypto(String),

    #[error("Protocol error: {0}")]
    Protocol(String),
}

pub type Result<T> = std::result::Result<T, CoreError>;
