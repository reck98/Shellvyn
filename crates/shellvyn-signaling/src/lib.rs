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

/// Runs the signaling server listening on the specified address.
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
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>()).await?;
    Ok(())
}
