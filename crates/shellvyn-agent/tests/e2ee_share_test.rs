use bytes::Bytes;
use futures_util::{SinkExt, StreamExt};
use shellvyn_agent::{run_share_session, ShareOptions};
use shellvyn_core::crypto::{decrypt_from_base64, derive_session_key, encrypt_to_base64};
use shellvyn_core::framing::Frame;
use shellvyn_core::protocol::{JoinStatus, SignalingMessage};
use std::net::SocketAddr;
use std::time::Duration;
use tokio::time::timeout;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;

#[tokio::test]
async fn test_end_to_end_zero_knowledge_e2ee_relay() {
    let port = 8185;
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let ws_url = format!("ws://127.0.0.1:{}/ws", port);

    // 1. Launch Signaling Server
    tokio::spawn(async move {
        let _ = shellvyn_signaling::run_signaling_server(addr).await;
    });

    // Wait for server to bind
    for _ in 0..20 {
        tokio::time::sleep(Duration::from_millis(50)).await;
        if tokio::net::TcpStream::connect(addr).await.is_ok() {
            break;
        }
    }

    let code = "KV7M-9X2P";

    // 2. Launch Host Agent in background
    let host_server_url = ws_url.clone();
    let host_code = code.to_string();
    tokio::spawn(async move {
        let opts = ShareOptions {
            server_url: host_server_url,
            read_only: false,
            auto_accept: true,
            shell: None, // OS default
            code: Some(host_code),
        };
        let _ = run_share_session(opts).await;
    });

    // Allow host agent to connect and register
    tokio::time::sleep(Duration::from_millis(300)).await;

    // 3. Viewer connects to Signaling Server
    let (mut viewer_ws, _) = connect_async(&ws_url)
        .await
        .expect("Viewer failed to connect to signaling server");

    // Viewer sends Join
    let join_msg = SignalingMessage::Join {
        code: code.to_string(),
    };
    viewer_ws
        .send(Message::Text(serde_json::to_string(&join_msg).unwrap().into()))
        .await
        .unwrap();

    // 4. Viewer receives JoinResult with session_salt
    let join_ack = timeout(Duration::from_secs(5), viewer_ws.next())
        .await
        .expect("Timeout waiting for viewer JoinResult")
        .unwrap()
        .unwrap();

    let (session_salt, host_id) = if let Message::Text(txt) = join_ack {
        let msg: SignalingMessage = serde_json::from_str(&txt).unwrap();
        match msg {
            SignalingMessage::JoinResult {
                status,
                session_salt,
                host_id,
                ..
            } => {
                assert_eq!(status, JoinStatus::Connected);
                (session_salt.expect("Expected session_salt"), host_id.expect("Expected host_id"))
            }
            other => panic!("Expected JoinResult::Connected, got: {:?}", other),
        }
    } else {
        panic!("Expected text message");
    };

    // 5. Viewer derives ChaCha20-Poly1305 E2EE session key from code + salt
    let viewer_key = derive_session_key(code, session_salt.as_bytes()).unwrap();

    // 6. Viewer sends encrypted command: `echo E2EE_RELAY_VERIFIED\r\n`
    let cmd = if cfg!(windows) {
        b"echo E2EE_RELAY_VERIFIED\r\n".as_slice()
    } else {
        b"echo 'E2EE_RELAY_VERIFIED'\n".as_slice()
    };

    let data_frame = Frame::Data(Bytes::copy_from_slice(cmd)).encode();
    let encrypted_b64 = encrypt_to_base64(&viewer_key, &data_frame).unwrap();

    let relay_input = SignalingMessage::RelayData {
        from_id: "viewer-client-1".into(),
        target_id: host_id.clone(),
        payload: encrypted_b64,
    };
    viewer_ws
        .send(Message::Text(serde_json::to_string(&relay_input).unwrap().into()))
        .await
        .unwrap();

    // 7. Viewer listens for encrypted terminal output from Host and asserts roundtrip
    let output_verified = timeout(Duration::from_secs(5), async {
        let mut accumulated = Vec::new();
        while let Some(Ok(Message::Text(txt))) = viewer_ws.next().await {
            if let Ok(SignalingMessage::RelayData { payload, .. }) = serde_json::from_str::<SignalingMessage>(&txt) {
                // Decrypt payload with viewer's session key
                if let Ok(frame_bytes) = decrypt_from_base64(&viewer_key, &payload) {
                    if let Ok(Frame::Data(chunk)) = Frame::decode(Bytes::from(frame_bytes)) {
                        accumulated.extend_from_slice(&chunk);
                        let s = String::from_utf8_lossy(&accumulated);
                        if s.contains("E2EE_RELAY_VERIFIED") {
                            return true;
                        }
                    }
                }
            }
        }
        false
    })
    .await;

    assert_eq!(
        output_verified,
        Ok(true),
        "E2EE Relay roundtrip verification failed: expected 'E2EE_RELAY_VERIFIED' in decrypted terminal output"
    );

    // 8. Viewer sends Resize frame: 120 cols x 40 rows
    let resize_frame = Frame::Resize { cols: 120, rows: 40 }.encode();
    let resize_encrypted = encrypt_to_base64(&viewer_key, &resize_frame).unwrap();

    let relay_resize = SignalingMessage::RelayData {
        from_id: "viewer-client-1".into(),
        target_id: host_id.clone(),
        payload: resize_encrypted,
    };
    viewer_ws
        .send(Message::Text(serde_json::to_string(&relay_resize).unwrap().into()))
        .await
        .unwrap();

    // 9. Viewer sends Close frame
    let close_frame = Frame::Close { reason: "User left session".into() }.encode();
    let close_encrypted = encrypt_to_base64(&viewer_key, &close_frame).unwrap();
    let relay_close = SignalingMessage::RelayData {
        from_id: "viewer-client-1".into(),
        target_id: host_id,
        payload: close_encrypted,
    };
    viewer_ws
        .send(Message::Text(serde_json::to_string(&relay_close).unwrap().into()))
        .await
        .unwrap();

    println!("Zero-Knowledge E2EE Relay Test: ALL ASSERTIONS PASSED!");
}
