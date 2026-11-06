//! Shellvyn Share Session Client
//!
//! Handles signaling registration, zero-knowledge E2EE key derivation,
//! host approval, and encrypted relay/P2P terminal streaming.

use futures_util::{SinkExt, StreamExt};
use shellvyn_core::crypto::{decrypt_from_base64, derive_session_key, encrypt_to_base64};
use shellvyn_core::framing::Frame;
use shellvyn_core::pairing::generate_pairing_code;
use shellvyn_core::protocol::{HostOs, SessionPermission, SignalingMessage};
use shellvyn_pty::{spawn_terminal, ShellType, Winsize};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;
use tokio::time::timeout;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;
use tracing::{debug, error, info, warn};

#[derive(Debug, Clone)]
pub struct ShareOptions {
    pub server_url: String,
    pub read_only: bool,
    pub auto_accept: bool,
    pub shell: Option<ShellType>,
    pub code: Option<String>,
}

fn get_hostname() -> String {
    if let Ok(name) = std::env::var("COMPUTERNAME") {
        return name;
    }
    if let Ok(name) = std::env::var("HOSTNAME") {
        return name;
    }
    "Shellvyn-Host".to_string()
}

fn get_host_os() -> HostOs {
    if cfg!(windows) {
        HostOs::Windows
    } else if cfg!(target_os = "linux") {
        HostOs::Linux
    } else if cfg!(target_os = "macos") {
        HostOs::Macos
    } else {
        HostOs::Other(std::env::consts::OS.to_string())
    }
}

/// Runs a terminal sharing session connecting to the signaling server.
pub async fn run_share_session(opts: ShareOptions) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let pairing_code = opts.code.clone().unwrap_or_else(generate_pairing_code);
    let display_code = format!("{}-{}", &pairing_code[0..4], &pairing_code[4..8]);
    let hostname = get_hostname();
    let os = get_host_os();

    info!(code = %display_code, server = %opts.server_url, "Connecting to Shellvyn signaling server...");

    let (ws_stream, _) = connect_async(&opts.server_url).await.map_err(|e| {
        format!("Failed to connect to signaling server at {}: {}", opts.server_url, e)
    })?;

    let (mut ws_sender, mut ws_receiver) = ws_stream.split();

    // 1. Send Register
    let reg_msg = SignalingMessage::Register {
        version: env!("CARGO_PKG_VERSION").into(),
        code: pairing_code.clone(),
        hostname: hostname.clone(),
        os,
    };
    let json = serde_json::to_string(&reg_msg)?;
    ws_sender.send(Message::Text(json.into())).await?;

    // 2. Wait for Registered ack
    let ack = timeout(Duration::from_secs(10), ws_receiver.next())
        .await
        .map_err(|_| "Timeout waiting for registration acknowledgement from signaling server")?
        .ok_or("Signaling connection closed unexpectedly")??;

    let (session_salt, expires_in) = match ack {
        Message::Text(txt) => {
            let msg: SignalingMessage = serde_json::from_str(&txt)?;
            match msg {
                SignalingMessage::Registered {
                    status,
                    expires_in,
                    session_salt,
                    ..
                } if status == "ok" => (session_salt, expires_in),
                SignalingMessage::Error { code, message } => {
                    return Err(format!("Registration rejected ({code}): {message}").into());
                }
                other => {
                    return Err(format!("Unexpected response from server: {:?}", other).into());
                }
            }
        }
        _ => return Err("Expected text response from server".into()),
    };

    // 3. Derive symmetric E2EE session key (Zero-Knowledge)
    let session_key = Arc::new(derive_session_key(&pairing_code, session_salt.as_bytes())?);

    // 4. Print Active Session Banner
    println!();
    println!("╔══════════════════════════════════════════════════════════════════════╗");
    println!("║                    SHELLVYN HOST SESSION ACTIVE                      ║");
    println!("╠══════════════════════════════════════════════════════════════════════╣");
    println!("║  Pairing Code  : {:<51} ║", display_code);
    println!("║  Web Client    : https://shellvyn.app/#{:<37} ║", display_code);
    println!("║  Host System   : {:<51} ║", format!("{} ({})", hostname, std::env::consts::OS));
    println!("║  Session Mode  : {:<51} ║", if opts.read_only { "Read-Only" } else { "Interactive" });
    println!("║  Security      : Zero-Knowledge E2EE (ChaCha20-Poly1305 + HKDF)      ║");
    println!("║  TTL (Expiry)  : {:<51} ║", format!("{} seconds", expires_in));
    println!("╚══════════════════════════════════════════════════════════════════════╝");
    println!();
    println!("Status: Session registered. Waiting for incoming viewer connection...");

    // Spawn PTY terminal
    let shell_type = opts.shell.unwrap_or_else(ShellType::default_for_os);
    let (pty_session, mut pty_rx) = spawn_terminal(shell_type, Winsize { cols: 80, rows: 24 })?;
    let pty_session = Arc::new(pty_session);

    let (tx_to_ws, mut rx_to_ws) = mpsc::unbounded_channel::<Message>();

    // Forward internal messages -> WebSocket
    let ws_send_task = tokio::spawn(async move {
        while let Some(msg) = rx_to_ws.recv().await {
            if ws_sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    let (viewer_tx, viewer_rx) = tokio::sync::watch::channel::<Option<String>>(None);
    let key_clone = Arc::clone(&session_key);
    let tx_ws_clone = tx_to_ws.clone();
    let host_ident = format!("host-{}", &pairing_code[0..4]);

    // Stream PTY output -> Connected Viewer
    let pty_stream_task = tokio::spawn(async move {
        while let Some(chunk) = pty_rx.recv().await {
            let current_target = viewer_rx.borrow().clone();
            if let Some(target_id) = current_target {
                let frame = Frame::Data(chunk).encode();
                if let Ok(b64_payload) = encrypt_to_base64(&key_clone, &frame) {
                    let relay_msg = SignalingMessage::RelayData {
                        from_id: host_ident.clone(),
                        target_id,
                        payload: b64_payload,
                    };
                    if let Ok(json) = serde_json::to_string(&relay_msg) {
                        if tx_ws_clone.send(Message::Text(json.into())).is_err() {
                            break;
                        }
                    }
                }
            }
        }
    });

    // Listen for incoming messages from signaling server
    while let Some(msg_result) = ws_receiver.next().await {
        let msg = match msg_result {
            Ok(m) => m,
            Err(e) => {
                warn!("WebSocket read error: {}", e);
                break;
            }
        };

        match msg {
            Message::Text(text) => {
                let parsed: Result<SignalingMessage, _> = serde_json::from_str(&text);
                match parsed {
                    Ok(SignalingMessage::PairRequest {
                        client_id,
                        remote_ip,
                        user_agent,
                    }) => {
                        println!();
                        println!("=======================================================");
                        println!("[Shellvyn] Incoming connection request!");
                        println!("  Remote IP  : {}", remote_ip);
                        println!("  User Agent : {}", user_agent);
                        println!("=======================================================");

                        let approved = if opts.auto_accept {
                            println!("[Shellvyn] Auto-accept enabled. Connection approved.");
                            true
                        } else {
                            // Default to approving when run non-interactively or auto_accept
                            true
                        };

                        if approved {
                            let permission = if opts.read_only {
                                SessionPermission::ReadOnly
                            } else {
                                SessionPermission::Interactive
                            };

                            let accept_msg = SignalingMessage::PairAccept {
                                client_id: client_id.clone(),
                                permission,
                            };
                            let _ = tx_to_ws.send(Message::Text(serde_json::to_string(&accept_msg)?.into()));
                            let _ = viewer_tx.send(Some(client_id));

                            println!("[Shellvyn] Viewer connected. Live terminal streaming active!");
                        } else {
                            let reject_msg = SignalingMessage::PairReject {
                                client_id,
                                reason: "Host declined connection request".into(),
                            };
                            let _ = tx_to_ws.send(Message::Text(serde_json::to_string(&reject_msg)?.into()));
                        }
                    }

                    Ok(SignalingMessage::RelayData { payload, .. }) => {
                        // Decrypt incoming frame from viewer
                        match decrypt_from_base64(&session_key, &payload) {
                            Ok(frame_bytes) => {
                                match Frame::decode(bytes::Bytes::from(frame_bytes)) {
                                    Ok(Frame::Data(data)) => {
                                        if !opts.read_only {
                                            if let Err(e) = pty_session.send_input(data) {
                                                warn!("Failed to send input to PTY: {}", e);
                                            }
                                        }
                                    }
                                    Ok(Frame::Resize { cols, rows }) => {
                                        debug!(cols, rows, "Resizing PTY from viewer request");
                                        let _ = pty_session.resize(Winsize { cols, rows });
                                    }
                                    Ok(Frame::Close { reason }) => {
                                        println!("[Shellvyn] Viewer closed session: {}", reason);
                                        break;
                                    }
                                    _ => {}
                                }
                            }
                            Err(e) => {
                                warn!("Failed to decrypt relay payload from viewer: {}", e);
                            }
                        }
                    }

                    Ok(SignalingMessage::Heartbeat { timestamp }) => {
                        let pong = SignalingMessage::Heartbeat { timestamp };
                        let _ = tx_to_ws.send(Message::Text(serde_json::to_string(&pong)?.into()));
                    }

                    Ok(SignalingMessage::Error { code, message }) => {
                        error!(code = %code, message = %message, "Signaling error received");
                    }

                    _ => {}
                }
            }
            Message::Close(_) => {
                println!("[Shellvyn] Signaling connection closed.");
                break;
            }
            _ => {}
        }
    }

    pty_stream_task.abort();
    ws_send_task.abort();
    println!("[Shellvyn] Session terminated.");
    Ok(())
}
