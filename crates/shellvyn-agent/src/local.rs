//! Shellvyn Local Loopback Server
//!
//! Provides an embedded HTTP and WebSocket server for streaming local terminal
//! PTY sessions directly to the web client for testing and local network use.

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::State;
use axum::response::{Html, IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use bytes::Bytes;
use futures_util::{SinkExt, StreamExt};
use shellvyn_core::framing::Frame;
use shellvyn_pty::{spawn_terminal, ShellType, Winsize};
use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::fs;
use tracing::{debug, error, info};

#[derive(Clone)]
pub struct LocalServerState {
    pub static_dir: PathBuf,
}

/// Runs the local loopback server on the specified port.
pub async fn run_local_server(port: u16) -> Result<(), Box<dyn std::error::Error>> {
    let static_dir = Path::new("web/dist").to_path_buf();
    let state = Arc::new(LocalServerState { static_dir });

    let app = Router::new()
        .route("/ws", get(ws_handler))
        .route("/", get(index_handler))
        .route("/assets/{*path}", get(assets_handler))
        .fallback(index_handler)
        .with_state(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let listener = tokio::net::TcpListener::bind(addr).await?;

    println!();
    println!("===============================================================");
    println!("  Shellvyn Local Loopback Terminal Active!");
    println!("  Open your browser to: http://127.0.0.1:{}", port);
    println!("  Direct WebSocket:     ws://127.0.0.1:{}/ws", port);
    println!("  Press Ctrl+C to stop.");
    println!("===============================================================");
    println!();

    axum::serve(listener, app).await?;
    Ok(())
}

async fn index_handler(State(state): State<Arc<LocalServerState>>) -> Response {
    let index_path = state.static_dir.join("index.html");
    if let Ok(content) = fs::read_to_string(&index_path).await {
        return Html(content).into_response();
    }

    // Fallback embedded HTML if web/dist is not built
    Html(r#"<!DOCTYPE html>
<html>
<head>
    <title>Shellvyn Local Terminal</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style>
        body { background: #020617; color: #f8fafc; font-family: monospace; padding: 2rem; }
        .card { background: #0f172a; border: 1px solid #1e293b; padding: 1.5rem; border-radius: 0.5rem; max-width: 600px; }
        code { color: #38bdf8; }
    </style>
</head>
<body>
    <div class="card">
        <h2>Shellvyn Local Loopback Server</h2>
        <p>The Web Client static assets were not found in <code>web/dist</code>.</p>
        <p>Build the web frontend with:</p>
        <pre>cd web && npm run build</pre>
        <p>WebSocket endpoint is active at <code>ws://127.0.0.1:3000/ws</code>.</p>
    </div>
</body>
</html>"#).into_response()
}

async fn assets_handler(
    State(state): State<Arc<LocalServerState>>,
    axum::extract::Path(path): axum::extract::Path<String>,
) -> Response {
    let file_path = state.static_dir.join("assets").join(&path);
    if let Ok(content) = fs::read(&file_path).await {
        let mime = if path.ends_with(".js") {
            "application/javascript"
        } else if path.ends_with(".css") {
            "text/css"
        } else if path.ends_with(".svg") {
            "image/svg+xml"
        } else {
            "application/octet-stream"
        };

        return (
            [("content-type", mime)],
            content,
        ).into_response();
    }

    (axum::http::StatusCode::NOT_FOUND, "Asset not found").into_response()
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(_state): State<Arc<LocalServerState>>,
) -> impl IntoResponse {
    ws.on_upgrade(handle_socket)
}

async fn handle_socket(socket: WebSocket) {
    info!("New WebSocket client connected to local terminal loopback");

    // Spawn an interactive terminal session
    let initial_size = Winsize { cols: 80, rows: 24 };
    let (mut session, mut rx_output) = match spawn_terminal(ShellType::default_for_os(), initial_size) {
        Ok(res) => res,
        Err(e) => {
            error!("Failed to spawn local PTY session: {}", e);
            return;
        }
    };

    let (mut ws_sender, mut ws_receiver) = socket.split();

    // 1. Task: PTY output -> WebSocket
    let mut to_client_task = tokio::spawn(async move {
        while let Some(chunk) = rx_output.recv().await {
            // Encode as DATA binary frame
            let frame = Frame::Data(chunk);
            let bytes = frame.encode();
            if ws_sender.send(Message::Binary(bytes.into())).await.is_err() {
                break;
            }
        }
    });

    // 2. Task: WebSocket input -> PTY
    let mut from_client_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = ws_receiver.next().await {
            match msg {
                Message::Binary(bin) => {
                    let bytes = Bytes::from(bin);
                    if let Ok(frame) = Frame::decode(bytes) {
                        match frame {
                            Frame::Data(input_bytes) => {
                                let _ = session.send_input(input_bytes);
                            }
                            Frame::Resize { cols, rows } => {
                                debug!(cols, rows, "Client requested terminal resize");
                                let _ = session.resize(Winsize { cols, rows });
                            }
                            Frame::Close { reason } => {
                                info!(reason = %reason, "Client closed terminal session");
                                let _ = session.terminate();
                                break;
                            }
                            _ => {}
                        }
                    }
                }
                Message::Close(_) => {
                    debug!("Client sent WebSocket close");
                    let _ = session.terminate();
                    break;
                }
                _ => {}
            }
        }
        let _ = session.terminate();
    });

    // Wait until either task completes, then abort the other
    tokio::select! {
        _ = (&mut to_client_task) => from_client_task.abort(),
        _ = (&mut from_client_task) => to_client_task.abort(),
    }

    info!("Local terminal loopback session ended");
}
