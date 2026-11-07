//! Shellvyn Host Agent Library
//!
//! Exposes local loopback server, terminal management, and host signaling capabilities.

pub mod local;
pub mod share;

pub use local::run_local_server;
pub use share::{run_share_session, ShareOptions};

/// Cross-platform listener for Ctrl+C (SIGINT) or SIGTERM for graceful shutdown.
pub async fn shutdown_signal() {
    let ctrl_c = async {
        let _ = tokio::signal::ctrl_c().await;
    };

    #[cfg(unix)]
    let terminate = async {
        if let Ok(mut sig) = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            sig.recv().await;
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}

/// Helper function to launch the loopback server for automated integration tests.
pub async fn run_local_server_for_test(port: u16) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    local::run_local_server(port).await.map_err(|e| Box::new(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())) as Box<dyn std::error::Error + Send + Sync>)
}
