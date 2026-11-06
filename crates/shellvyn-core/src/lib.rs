//! Shellvyn Core Library
//!
//! Provides fundamental data structures, protocol definitions, pairing code utilities,
//! framing wire format, and zero-knowledge E2EE encryption primitives.

pub mod crypto;
pub mod error;
pub mod framing;
pub mod pairing;
pub mod protocol;

pub use error::{CoreError, Result};
