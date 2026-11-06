//! Shellvyn Host Agent Library
//!
//! Exposes local loopback server, terminal management, and host signaling capabilities.

pub mod local;
pub mod share;

pub use local::run_local_server;
pub use share::{run_share_session, ShareOptions};

/// Helper function to launch the loopback server for automated integration tests.
pub async fn run_local_server_for_test(port: u16) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    local::run_local_server(port).await.map_err(|e| Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())) as Box<dyn std::error::Error + Send + Sync>)
}
