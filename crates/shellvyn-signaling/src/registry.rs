//! In-memory concurrent session registry for the Shellvyn Signaling Service
//!
//! Maps active pairing codes to host/viewer communication channels with TTL expiration.

use dashmap::DashMap;
use rand::rngs::OsRng;
use rand::RngCore;
use shellvyn_core::pairing::normalize_and_validate_code;
use shellvyn_core::protocol::{HostOs, SessionPermission, SignalingMessage};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::mpsc;
use tracing::{debug, info};

pub const DEFAULT_SESSION_TTL: Duration = Duration::from_secs(300); // 5 minutes

pub struct HostSession {
    pub host_id: String,
    pub hostname: String,
    pub os: HostOs,
    pub session_salt: String,
    pub created_at: Instant,
    pub expires_at: Instant,
    pub sender: mpsc::UnboundedSender<SignalingMessage>,
    pub permission: SessionPermission,
    pub active_viewer: Option<ViewerSession>,
}

pub struct ViewerSession {
    pub client_id: String,
    pub sender: mpsc::UnboundedSender<SignalingMessage>,
}

#[derive(Clone, Default)]
pub struct SessionRegistry {
    /// Maps normalized pairing code (e.g. "KV7M-9X2P") -> HostSession
    sessions_by_code: Arc<DashMap<String, HostSession>>,
    /// Maps host_id -> pairing code
    code_by_host_id: Arc<DashMap<String, String>>,
    /// Maps client_id -> pairing code
    code_by_client_id: Arc<DashMap<String, String>>,
}

impl SessionRegistry {
    pub fn new() -> Self {
        Self {
            sessions_by_code: Arc::new(DashMap::new()),
            code_by_host_id: Arc::new(DashMap::new()),
            code_by_client_id: Arc::new(DashMap::new()),
        }
    }

    /// Registers a new host session with an 8-character pairing code.
    pub fn register_host(
        &self,
        raw_code: &str,
        hostname: String,
        os: HostOs,
        sender: mpsc::UnboundedSender<SignalingMessage>,
    ) -> Result<(String, String, u64), String> {
        let code = normalize_and_validate_code(raw_code).map_err(|e| e.to_string())?;

        // Evict any existing session with this code if expired
        self.cleanup_if_expired(&code);

        if self.sessions_by_code.contains_key(&code) {
            return Err(format!("Pairing code '{}' is already actively in use", code));
        }

        let host_id = format!("h-{:016x}{:016x}", OsRng.next_u64(), OsRng.next_u64());

        // Generate 16-byte random session salt for HKDF
        let mut salt_bytes = [0u8; 16];
        OsRng.fill_bytes(&mut salt_bytes);
        let session_salt = format!("{:032x}", u128::from_be_bytes(salt_bytes));

        let now = Instant::now();
        let expires_at = now + DEFAULT_SESSION_TTL;

        let session = HostSession {
            host_id: host_id.clone(),
            hostname: hostname.clone(),
            os,
            session_salt: session_salt.clone(),
            created_at: now,
            expires_at,
            sender,
            permission: SessionPermission::Interactive,
            active_viewer: None,
        };

        self.sessions_by_code.insert(code.clone(), session);
        self.code_by_host_id.insert(host_id.clone(), code.clone());

        info!(code = %code, host_id = %host_id, hostname = %hostname, "Host registered successfully");
        Ok((host_id, session_salt, DEFAULT_SESSION_TTL.as_secs()))
    }

    /// Finds an active host session by pairing code.
    pub fn get_host_by_code(&self, raw_code: &str) -> Option<dashmap::mapref::one::Ref<'_, String, HostSession>> {
        let code = normalize_and_validate_code(raw_code).ok()?;
        self.cleanup_if_expired(&code);
        self.sessions_by_code.get(&code)
    }

    /// Atomically validates code and registers viewer request to host, preventing lock deadlocks.
    pub fn request_pairing(
        &self,
        raw_code: &str,
        client_id: String,
        viewer_sender: mpsc::UnboundedSender<SignalingMessage>,
        client_ip: String,
        user_agent: String,
    ) -> Result<(), shellvyn_core::protocol::JoinStatus> {
        let code = match normalize_and_validate_code(raw_code) {
            Ok(c) => c,
            Err(_) => return Err(shellvyn_core::protocol::JoinStatus::InvalidCode),
        };

        self.cleanup_if_expired(&code);

        if let Some(mut session) = self.sessions_by_code.get_mut(&code) {
            let pair_req = SignalingMessage::PairRequest {
                client_id: client_id.clone(),
                remote_ip: client_ip,
                user_agent,
            };
            if session.sender.send(pair_req).is_err() {
                return Err(shellvyn_core::protocol::JoinStatus::HostUnavailable);
            }
            session.active_viewer = Some(ViewerSession {
                client_id: client_id.clone(),
                sender: viewer_sender,
            });
            drop(session); // Explicitly release lock before inserting into code_by_client_id
            self.code_by_client_id.insert(client_id, code);
            Ok(())
        } else {
            Err(shellvyn_core::protocol::JoinStatus::InvalidCode)
        }
    }

    /// Fetches host metadata (hostname, session_salt) by host ID.
    pub fn get_host_info(&self, host_id: &str) -> Option<(String, String)> {
        let code_entry = self.code_by_host_id.get(host_id)?;
        let code = code_entry.value().clone();
        drop(code_entry);

        let session = self.sessions_by_code.get(&code)?;
        Some((session.hostname.clone(), session.session_salt.clone()))
    }

    /// Registers a viewer into the host session.
    pub fn attach_viewer(
        &self,
        raw_code: &str,
        client_id: String,
        sender: mpsc::UnboundedSender<SignalingMessage>,
    ) -> bool {
        let code = match normalize_and_validate_code(raw_code) {
            Ok(c) => c,
            Err(_) => return false,
        };

        if let Some(mut session) = self.sessions_by_code.get_mut(&code) {
            session.active_viewer = Some(ViewerSession {
                client_id: client_id.clone(),
                sender,
            });
            self.code_by_client_id.insert(client_id, code);
            true
        } else {
            false
        }
    }

    /// Sends a message directly to a target peer (host or viewer).
    pub fn send_to_peer(&self, target_id: &str, message: SignalingMessage) -> bool {
        // Check if target is a host
        if let Some(code) = self.code_by_host_id.get(target_id) {
            let code_str = code.value().clone();
            drop(code);
            if let Some(session) = self.sessions_by_code.get(&code_str) {
                return session.sender.send(message).is_ok();
            }
        }

        // Check if target is a viewer
        if let Some(code) = self.code_by_client_id.get(target_id) {
            let code_str = code.value().clone();
            drop(code);
            if let Some(session) = self.sessions_by_code.get(&code_str) {
                if let Some(viewer) = &session.active_viewer {
                    if viewer.client_id == target_id {
                        return viewer.sender.send(message).is_ok();
                    }
                }
            }
        }

        false
    }

    /// Cleans up a session when host disconnects.
    pub fn remove_host(&self, host_id: &str) {
        if let Some((_, code)) = self.code_by_host_id.remove(host_id) {
            if let Some((_, session)) = self.sessions_by_code.remove(&code) {
                if let Some(viewer) = session.active_viewer {
                    self.code_by_client_id.remove(&viewer.client_id);
                    let _ = viewer.sender.send(SignalingMessage::Error {
                        code: "HOST_DISCONNECTED".into(),
                        message: "The host has disconnected".into(),
                    });
                }
                debug!(code = %code, host_id = %host_id, "Host session unregistered and cleaned up");
            }
        }
    }

    /// Cleans up a viewer when viewer disconnects.
    pub fn remove_viewer(&self, client_id: &str) {
        if let Some((_, code)) = self.code_by_client_id.remove(client_id) {
            if let Some(mut session) = self.sessions_by_code.get_mut(&code) {
                if let Some(viewer) = &session.active_viewer {
                    if viewer.client_id == client_id {
                        session.active_viewer = None;
                    }
                }
            }
        }
    }

    fn cleanup_if_expired(&self, code: &str) {
        let is_expired = if let Some(session) = self.sessions_by_code.get(code) {
            Instant::now() >= session.expires_at
        } else {
            false
        };

        if is_expired {
            if let Some((_, session)) = self.sessions_by_code.remove(code) {
                self.code_by_host_id.remove(&session.host_id);
                if let Some(viewer) = session.active_viewer {
                    self.code_by_client_id.remove(&viewer.client_id);
                }
                debug!(code = %code, "Expired session automatically evicted");
            }
        }
    }
}
