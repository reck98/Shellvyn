use clap::Parser;
use std::net::{IpAddr, SocketAddr};
use tracing::info;

/// Shellvyn Signaling and Relay Server
#[derive(Parser, Debug)]
#[command(
    name = "shellvyn-signaling",
    author = "Shellvyn Contributors",
    version,
    about = "Signaling and zero-knowledge relay server for Shellvyn"
)]
struct Args {
    /// Port to listen on (overridden by PORT environment variable if set)
    #[arg(short, long)]
    port: Option<u16>,

    /// Host IP address to bind to
    #[arg(long, default_value = "0.0.0.0")]
    host: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();
    let args = Args::parse();

    info!(
        "Starting Shellvyn Signaling Server (v{})",
        env!("CARGO_PKG_VERSION")
    );

    // PORT environment variable takes precedence (Render / Heroku / Container conventions)
    let port = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .or(args.port)
        .unwrap_or(8080);

    let host_ip: IpAddr = args
        .host
        .parse()
        .unwrap_or_else(|_| IpAddr::from([0, 0, 0, 0]));

    let addr = SocketAddr::from((host_ip, port));
    shellvyn_signaling::run_signaling_server(addr).await
}
