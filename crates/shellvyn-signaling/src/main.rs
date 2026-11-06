use tracing::info;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();
    info!("Starting Shellvyn Signaling Server (v{})", env!("CARGO_PKG_VERSION"));
    Ok(())
}
