//! Shellvyn Signaling & Relay Library
//!
//! Provides the signaling server router, session registry, and rate limiter.

pub mod rate_limit;
pub mod registry;
pub mod server;

pub use rate_limit::RateLimiter;
pub use registry::SessionRegistry;
pub use server::{create_router, SignalingState};

use std::net::SocketAddr;
use std::sync::Arc;

/// Runs the signaling server listening on the specified address with graceful shutdown.
pub async fn run_signaling_server(addr: SocketAddr) -> Result<(), Box<dyn std::error::Error>> {
    let registry = SessionRegistry::new();
    let rate_limiter = Arc::new(RateLimiter::new());
    let state = SignalingState {
        registry,
        rate_limiter,
    };

    let app = create_router(state);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    tracing::info!("Signaling Server listening on ws://{}/ws", addr);
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>())
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    tracing::info!("Signaling Server shut down gracefully");
    Ok(())
}

async fn shutdown_signal() {
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
        _ = ctrl_c => {
            tracing::info!("Received Ctrl+C, shutting down gracefully");
        },
        _ = terminate => {
            tracing::info!("Received SIGTERM, shutting down gracefully");
        },
    }
}
