use clap::{Parser, Subcommand};
use shellvyn_agent::{local, run_share_session, ShareOptions};
use shellvyn_pty::{spawn_terminal, ShellType, Winsize};
use std::time::{Duration, Instant};
use tokio::time::timeout;
use tracing::error;

#[derive(Parser, Debug)]
#[command(name = "shellvyn", version, about = "Cross-platform secure terminal sharing host agent")]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Share your current terminal session via the signaling server
    Share {
        /// Signaling server URL (overrides SHELLVYN_SERVER env var, default: wss://shellvyn-signaling.onrender.com/ws)
        #[arg(short, long)]
        server: Option<String>,

        /// Read-only mode (viewers cannot send keystrokes)
        #[arg(long)]
        read_only: bool,

        /// Automatically approve incoming viewer connection requests (default: manual prompt required)
        #[arg(long, default_value_t = false)]
        auto_accept: bool,

        /// Shell to launch: powershell, cmd, bash, or default
        #[arg(long, default_value = "default")]
        shell: String,
    },
    /// Run a local loopback server directly to browser for testing
    Local {
        /// Local port to serve
        #[arg(short, long, default_value_t = 3000)]
        port: u16,
    },
    /// Test pseudo-terminal (PTY) subsystem on this host
    TestPty {
        /// Shell to launch: powershell, cmd, bash, or default
        #[arg(long, default_value = "default")]
        shell: String,
    },
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let _ = rustls::crypto::ring::default_provider().install_default();
    tracing_subscriber::fmt::init();
    let cli = Cli::parse();

    match cli.command.unwrap_or(Commands::TestPty { shell: "default".into() }) {
        Commands::Share { server, read_only, auto_accept, shell } => {
            let server_url = server
                .or_else(|| std::env::var("SHELLVYN_SERVER").ok())
                .unwrap_or_else(|| "wss://shellvyn-signaling.onrender.com/ws".to_string());

            let shell_type = match shell.to_lowercase().as_str() {
                "cmd" => Some(ShellType::Cmd),
                "powershell" | "pwsh" => Some(ShellType::PowerShell),
                "bash" => Some(ShellType::Bash),
                _ => None,
            };

            run_share_session(ShareOptions {
                server_url,
                read_only,
                auto_accept,
                shell: shell_type,
                code: None,
            })
            .await
            .map_err(|e| e as Box<dyn std::error::Error>)
        }
        Commands::Local { port } => {
            local::run_local_server(port).await
        }
        Commands::TestPty { shell } => {
            println!("== Shellvyn PTY Subsystem Self-Test ==");
            let shell_type = match shell.to_lowercase().as_str() {
                "cmd" => ShellType::Cmd,
                "powershell" | "pwsh" => ShellType::PowerShell,
                "bash" => ShellType::Bash,
                _ => ShellType::default_for_os(),
            };

            println!("Spawning PTY with shell: {:?}", shell_type);
            let start = Instant::now();
            let (session, mut rx) = spawn_terminal(shell_type, Winsize { cols: 80, rows: 24 })?;
            let spawn_duration = start.elapsed();
            println!("[OK] PTY spawned in {:?}", spawn_duration);

            let ping_cmd = if cfg!(windows) {
                b"echo SHELLVYN_PTY_SELFTEST_OK\r\n".as_slice()
            } else {
                b"echo 'SHELLVYN_PTY_SELFTEST_OK'\n".as_slice()
            };

            session.send_input(bytes::Bytes::copy_from_slice(ping_cmd))?;

            let roundtrip = timeout(Duration::from_secs(5), async {
                let mut buffer = Vec::new();
                while let Some(chunk) = rx.recv().await {
                    buffer.extend_from_slice(&chunk);
                    let s = String::from_utf8_lossy(&buffer);
                    if s.contains("SHELLVYN_PTY_SELFTEST_OK") {
                        return true;
                    }
                }
                false
            })
            .await;

            match roundtrip {
                Ok(true) => {
                    println!("[OK] Terminal I/O loopback roundtrip verified!");
                    println!("[OK] Resizing PTY to 120x40...");
                    session.resize(Winsize { cols: 120, rows: 40 })?;
                    println!("[OK] Terminal resized successfully.");
                    println!("PTY Subsystem Status: ALL TESTS PASSED.");
                    Ok(())
                }
                _ => {
                    error!("PTY self-test failed: did not receive expected output in 5s");
                    Err("PTY self-test timed out".into())
                }
            }
        }
    }
}
