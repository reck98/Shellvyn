//! Shellvyn Signaling & Relay WebSocket Server
//!
//! Handles host registration, viewer pairing, rate limiting, and WebRTC SDP/ICE routing.

use axum::extract::connect_info::ConnectInfo;
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::State;
use axum::response::IntoResponse;
use axum::routing::get;
use axum::{Json, Router};
use futures_util::{SinkExt, StreamExt};
use rand::rngs::OsRng;
use rand::RngCore;
use shellvyn_core::protocol::{ConnectionMode, JoinStatus, SignalingMessage};
use std::net::{IpAddr, SocketAddr};
use std::sync::Arc;
use tokio::sync::mpsc;
use tracing::{debug, warn};

use crate::rate_limit::RateLimiter;
use crate::registry::SessionRegistry;

#[derive(Clone)]
pub struct SignalingState {
    pub registry: SessionRegistry,
    pub rate_limiter: Arc<RateLimiter>,
}

pub fn create_router(state: SignalingState) -> Router {
    Router::new()
        .route("/health", get(health_handler))
        .route("/ws", get(ws_handler))
        .with_state(state)
}

async fn health_handler() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "healthy",
        "service": "shellvyn-signaling",
        "version": env!("CARGO_PKG_VERSION")
    }))
}

fn extract_client_ip(headers: &axum::http::HeaderMap, addr: SocketAddr) -> IpAddr {
    // 1. Try CF-Connecting-IP (Cloudflare)
    if let Some(cf_ip) = headers.get("cf-connecting-ip").and_then(|v| v.to_str().ok()) {
        if let Ok(parsed) = cf_ip.trim().parse::<IpAddr>() {
            return parsed;
        }
    }
    // 2. Try X-Forwarded-For (Render / reverse proxy - first entry is client IP)
    if let Some(xff) = headers.get("x-forwarded-for").and_then(|v| v.to_str().ok()) {
        if let Some(first) = xff.split(',').next() {
            if let Ok(parsed) = first.trim().parse::<IpAddr>() {
                return parsed;
            }
        }
    }
    // 3. Try X-Real-IP
    if let Some(real_ip) = headers.get("x-real-ip").and_then(|v| v.to_str().ok()) {
        if let Ok(parsed) = real_ip.trim().parse::<IpAddr>() {
            return parsed;
        }
    }
    // 4. Fallback to direct TCP socket IP
    addr.ip()
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    headers: axum::http::HeaderMap,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    State(state): State<SignalingState>,
) -> impl IntoResponse {
    let client_ip = extract_client_ip(&headers, addr);
    ws.on_upgrade(move |socket| handle_connection(socket, client_ip, state))
}

async fn handle_connection(socket: WebSocket, client_ip: IpAddr, state: SignalingState) {
    debug!(ip = %client_ip, "Incoming WebSocket connection on signaling server");

    let (mut ws_sender, mut ws_receiver) = socket.split();
    let (tx_to_client, mut rx_to_client) = mpsc::unbounded_channel::<SignalingMessage>();

    // 1. Task: Forward signaling messages from internal channel -> WebSocket
    let to_client_task = tokio::spawn(async move {
        while let Some(msg) = rx_to_client.recv().await {
            if let Ok(json) = serde_json::to_string(&msg) {
                if ws_sender.send(Message::Text(json.into())).await.is_err() {
                    break;
                }
            }
        }
    });

    let mut current_host_id: Option<String> = None;
    let mut current_client_id: Option<String> = None;

    // 2. Incoming messages from WebSocket
    while let Some(Ok(msg)) = ws_receiver.next().await {
        match msg {
            Message::Text(text) => {
                let parsed: Result<SignalingMessage, _> = serde_json::from_str(&text);
                match parsed {
                    Ok(signaling_msg) => match signaling_msg {
                        SignalingMessage::Register {
                            version: _,
                            code,
                            hostname,
                            os,
                        } => {
                            match state.registry.register_host(
                                &code,
                                hostname,
                                os,
                                tx_to_client.clone(),
                            ) {
                                Ok((host_id, session_salt, expires_in)) => {
                                    current_host_id = Some(host_id);
                                    let ack = SignalingMessage::Registered {
                                        status: "ok".into(),
                                        expires_in,
                                        session_salt,
                                        message: None,
                                    };
                                    let _ = tx_to_client.send(ack);
                                }
                                Err(err) => {
                                    let err_msg = SignalingMessage::Error {
                                        code: "REGISTRATION_FAILED".into(),
                                        message: err,
                                    };
                                    let _ = tx_to_client.send(err_msg);
                                }
                            }
                        }

                        SignalingMessage::Join { code } => {
                            // Check rate limit
                            if state.rate_limiter.is_locked_out(&client_ip) {
                                let err = SignalingMessage::Error {
                                    code: "RATE_LIMITED".into(),
                                    message: "Too many failed attempts. Please wait 15 minutes before retrying.".into(),
                                };
                                let _ = tx_to_client.send(err);
                                continue;
                            }

                            let client_id = format!("c-{:016x}", OsRng.next_u64());
                            current_client_id = Some(client_id.clone());

                            match state.registry.request_pairing(
                                &code,
                                client_id,
                                tx_to_client.clone(),
                                client_ip.to_string(),
                                "Web Browser (Shellvyn Web)".into(),
                            ) {
                                Ok(()) => {
                                    // PairRequest forwarded to Host successfully
                                }
                                Err(status) => {
                                    state.rate_limiter.record_failure(client_ip);
                                    let result = SignalingMessage::JoinResult {
                                        status,
                                        host_id: None,
                                        hostname: None,
                                        permission: None,
                                        session_salt: None,
                                        mode: None,
                                        message: Some("Pairing code not found, unavailable or expired".into()),
                                    };
                                    let _ = tx_to_client.send(result);
                                }
                            }
                        }

                        SignalingMessage::PairAccept {
                            client_id,
                            permission,
                        } => {
                            state.rate_limiter.record_success(&client_ip);

                            // Lookup host details to respond to viewer
                            if let Some(ref h_id) = current_host_id {
                                let (hostname, session_salt) = state
                                    .registry
                                    .get_host_info(h_id)
                                    .unwrap_or_else(|| ("Shellvyn Host".into(), "".into()));

                                let result = SignalingMessage::JoinResult {
                                    status: JoinStatus::Connected,
                                    host_id: Some(h_id.clone()),
                                    hostname: Some(hostname),
                                    permission: Some(permission),
                                    session_salt: Some(session_salt),
                                    mode: Some(ConnectionMode::WebRTC),
                                    message: None,
                                };
                                state.registry.send_to_peer(&client_id, result);
                            }
                        }

                        SignalingMessage::PairReject { client_id, reason } => {
                            let result = SignalingMessage::JoinResult {
                                status: JoinStatus::Rejected,
                                host_id: None,
                                hostname: None,
                                permission: None,
                                session_salt: None,
                                mode: None,
                                message: Some(reason),
                            };
                            state.registry.send_to_peer(&client_id, result);
                        }

                        SignalingMessage::SdpOffer {
                            from_id,
                            target_id,
                            sdp,
                        } => {
                            let target = target_id.clone();
                            state.registry.send_to_peer(
                                &target,
                                SignalingMessage::SdpOffer {
                                    from_id,
                                    target_id,
                                    sdp,
                                },
                            );
                        }

                        SignalingMessage::SdpAnswer {
                            from_id,
                            target_id,
                            sdp,
                        } => {
                            let target = target_id.clone();
                            state.registry.send_to_peer(
                                &target,
                                SignalingMessage::SdpAnswer {
                                    from_id,
                                    target_id,
                                    sdp,
                                },
                            );
                        }

                        SignalingMessage::IceCandidate {
                            from_id,
                            target_id,
                            candidate,
                        } => {
                            let target = target_id.clone();
                            state.registry.send_to_peer(
                                &target,
                                SignalingMessage::IceCandidate {
                                    from_id,
                                    target_id,
                                    candidate,
                                },
                            );
                        }

                        SignalingMessage::RelayData {
                            from_id,
                            target_id,
                            payload,
                        } => {
                            let target = target_id.clone();
                            state.registry.send_to_peer(
                                &target,
                                SignalingMessage::RelayData {
                                    from_id,
                                    target_id,
                                    payload,
                                },
                            );
                        }

                        SignalingMessage::Heartbeat { timestamp } => {
                            let _ = tx_to_client.send(SignalingMessage::Heartbeat { timestamp });
                        }

                        _ => {}
                    },
                    Err(e) => {
                        warn!("Invalid signaling JSON from client: {}", e);
                    }
                }
            }
            Message::Close(_) => break,
            _ => {}
        }
    }

    // Clean up
    to_client_task.abort();
    if let Some(h_id) = current_host_id {
        state.registry.remove_host(&h_id);
    }
    if let Some(c_id) = current_client_id {
        state.registry.remove_viewer(&c_id);
    }

    debug!(ip = %client_ip, "Signaling WebSocket connection closed");
}
