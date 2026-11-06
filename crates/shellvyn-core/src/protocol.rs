use serde::{Deserialize, Serialize};

/// Operating system identifier reported by the host agent.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HostOs {
    Windows,
    Linux,
    Macos,
    Other(String),
}

/// Permission granted to a viewer session.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SessionPermission {
    ReadOnly,
    Interactive,
}

/// Connection mode negotiated between peers.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ConnectionMode {
    WebRTC,
    Relay,
}

/// Status of the viewer join attempt.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum JoinStatus {
    Connected,
    Rejected,
    InvalidCode,
    Expired,
    HostUnavailable,
}

/// Structured ICE candidate data.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct IceCandidateData {
    pub candidate: String,
    #[serde(rename = "sdpMid", skip_serializing_if = "Option::is_none")]
    pub sdp_mid: Option<String>,
    #[serde(rename = "sdpMLineIndex", skip_serializing_if = "Option::is_none")]
    pub sdp_mline_index: Option<u16>,
}

/// All signaling messages exchanged over the WebSocket signaling channel.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum SignalingMessage {
    /// Host -> Server: Register a new session code.
    Register {
        version: String,
        code: String,
        hostname: String,
        os: HostOs,
    },

    /// Server -> Host: Acknowledge registration.
    Registered {
        status: String,
        expires_in: u64,
        session_salt: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
    },

    /// Viewer -> Server: Join a session using a pairing code.
    Join {
        code: String,
    },

    /// Server -> Host: Notify of an incoming connection request from a viewer.
    PairRequest {
        client_id: String,
        remote_ip: String,
        user_agent: String,
    },

    /// Host -> Server: Host approves incoming viewer request.
    PairAccept {
        client_id: String,
        permission: SessionPermission,
    },

    /// Host -> Server: Host declines incoming viewer request.
    PairReject {
        client_id: String,
        reason: String,
    },

    /// Server -> Viewer: Result of join attempt.
    JoinResult {
        status: JoinStatus,
        #[serde(skip_serializing_if = "Option::is_none")]
        host_id: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        hostname: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        permission: Option<SessionPermission>,
        #[serde(skip_serializing_if = "Option::is_none")]
        session_salt: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        mode: Option<ConnectionMode>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
    },

    /// Peer -> Server -> Peer: WebRTC SDP Offer.
    SdpOffer {
        from_id: String,
        target_id: String,
        sdp: String,
    },

    /// Peer -> Server -> Peer: WebRTC SDP Answer.
    SdpAnswer {
        from_id: String,
        target_id: String,
        sdp: String,
    },

    /// Peer -> Server -> Peer: WebRTC ICE Candidate exchange.
    IceCandidate {
        from_id: String,
        target_id: String,
        candidate: IceCandidateData,
    },

    /// Peer -> Server: Initiate zero-knowledge relay fallback when P2P fails.
    RelayStart {
        client_id: String,
        host_id: String,
    },

    /// Server -> Peer: Relay connection established and ready.
    RelayReady {
        session_id: String,
    },

    /// Peer -> Server -> Peer: Opaque end-to-end encrypted payload in relay mode.
    RelayData {
        from_id: String,
        target_id: String,
        payload: String, // Base64-encoded ChaCha20-Poly1305 ciphertext
    },

    /// Bi-directional: Periodic ping/keep-alive over signaling WebSocket.
    Heartbeat {
        timestamp: u64,
    },

    /// Server -> Peer: Signaling error notification.
    Error {
        code: String,
        message: String,
    },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_register_serialization() {
        let msg = SignalingMessage::Register {
            version: "2.0.0".into(),
            code: "KV7M-9X2P".into(),
            hostname: "devbox".into(),
            os: HostOs::Windows,
        };

        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains(r#""type":"register""#));
        assert!(json.contains(r#""os":"windows""#));

        let parsed: SignalingMessage = serde_json::from_str(&json).unwrap();
        assert_eq!(msg, parsed);
    }

    #[test]
    fn test_pair_request_roundtrip() {
        let msg = SignalingMessage::PairRequest {
            client_id: "c-123".into(),
            remote_ip: "127.0.0.1".into(),
            user_agent: "Mozilla/5.0".into(),
        };

        let json = serde_json::to_string(&msg).unwrap();
        let parsed: SignalingMessage = serde_json::from_str(&json).unwrap();
        assert_eq!(msg, parsed);
    }

    #[test]
    fn test_join_result_roundtrip() {
        let msg = SignalingMessage::JoinResult {
            status: JoinStatus::Connected,
            host_id: Some("h-999".into()),
            hostname: Some("workstation".into()),
            permission: Some(SessionPermission::Interactive),
            session_salt: Some("dGVzdC1zYWx0".into()),
            mode: Some(ConnectionMode::WebRTC),
            message: None,
        };

        let json = serde_json::to_string(&msg).unwrap();
        let parsed: SignalingMessage = serde_json::from_str(&json).unwrap();
        assert_eq!(msg, parsed);
    }

    #[test]
    fn test_ice_candidate_roundtrip() {
        let msg = SignalingMessage::IceCandidate {
            from_id: "c-123".into(),
            target_id: "h-999".into(),
            candidate: IceCandidateData {
                candidate: "candidate:1 1 UDP ...".into(),
                sdp_mid: Some("0".into()),
                sdp_mline_index: Some(0),
            },
        };

        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains(r#""sdpMid":"0""#));
        let parsed: SignalingMessage = serde_json::from_str(&json).unwrap();
        assert_eq!(msg, parsed);
    }
}
