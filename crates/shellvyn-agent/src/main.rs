use clap::{Parser, Subcommand};
use shellvyn_pty::{spawn_terminal, ShellType, Winsize};
use std::time::{Duration, Instant};
use tokio::time::timeout;
use tracing::{error, info};

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
        /// Signaling server URL
        #[arg(short, long, default_value = "ws://127.0.0.1:8080/ws")]
        server: String,

        /// Read-only mode (viewers cannot send keystrokes)
        #[arg(long)]
        read_only: bool,
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
    tracing_subscriber::fmt::init();
    let cli = Cli::parse();

    match cli.command.unwrap_or(Commands::TestPty { shell: "default".into() }) {
        Commands::Share { server, read_only } => {
            info!(server = %server, read_only, "Starting Shellvyn terminal sharing session");
            // Will connect to signaling server in M3/M4
            Ok(())
        }
        Commands::Local { port } => {
            info!(port, "Starting Shellvyn local loopback terminal server");
            // Implemented in M2
            Ok(())
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
                    error!("PTY roundtrip verification timed out or failed");
                    Err("PTY roundtrip failed".into())
                }
            }
        }
    }
}
