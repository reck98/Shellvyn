use futures_util::{SinkExt, StreamExt};
use shellvyn_core::protocol::{
    HostOs, JoinStatus, SessionPermission, SignalingMessage,
};
use std::net::SocketAddr;
use std::time::Duration;
use tokio::time::timeout;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;

#[tokio::test]
async fn test_host_registration_and_viewer_join() {
    let port = 8182;
    let addr = SocketAddr::from(([127, 0, 0, 1], port));

    // 1. Start signaling server in background
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

    let ws_url = format!("ws://127.0.0.1:{}/ws", port);

    // 2. Host connects and registers code
    let (mut host_ws, _) = connect_async(&ws_url)
        .await
        .expect("Host failed to connect to signaling server");

    let reg_msg = SignalingMessage::Register {
        version: "2.0.0".into(),
        code: "KV7M-9X2P".into(),
        hostname: "Test-Host".into(),
        os: HostOs::Windows,
    };
    host_ws
        .send(Message::Text(serde_json::to_string(&reg_msg).unwrap().into()))
        .await
        .unwrap();

    // Verify host receives `Registered` ack
    let host_ack = timeout(Duration::from_secs(3), host_ws.next())
        .await
        .expect("Timeout waiting for host registration ack")
        .unwrap()
        .unwrap();

    if let Message::Text(txt) = host_ack {
        let msg: SignalingMessage = serde_json::from_str(&txt).unwrap();
        match msg {
            SignalingMessage::Registered { status, .. } => {
                assert_eq!(status, "ok");
            }
            other => panic!("Expected Registered message, got: {:?}", other),
        }
    } else {
        panic!("Expected text message");
    }

    // 3. Viewer connects and joins using lookalike/normalized code
    let (mut viewer_ws, _) = connect_async(&ws_url)
        .await
        .expect("Viewer failed to connect to signaling server");

    let join_msg = SignalingMessage::Join {
        code: "kv7m9x2p".into(),
    };
    viewer_ws
        .send(Message::Text(serde_json::to_string(&join_msg).unwrap().into()))
        .await
        .unwrap();

    // 4. Host receives `PairRequest`
    let host_pair_req = timeout(Duration::from_secs(3), host_ws.next())
        .await
        .expect("Timeout waiting for pair request on host")
        .unwrap()
        .unwrap();

    let client_id = if let Message::Text(txt) = host_pair_req {
        let msg: SignalingMessage = serde_json::from_str(&txt).unwrap();
        match msg {
            SignalingMessage::PairRequest { client_id, .. } => client_id,
            other => panic!("Expected PairRequest, got: {:?}", other),
        }
    } else {
        panic!("Expected text message");
    };

    // 5. Host sends `PairAccept`
    let accept_msg = SignalingMessage::PairAccept {
        client_id,
        permission: SessionPermission::Interactive,
    };
    host_ws
        .send(Message::Text(serde_json::to_string(&accept_msg).unwrap().into()))
        .await
        .unwrap();

    // 6. Viewer receives `JoinResult` with status: Connected
    let viewer_result = timeout(Duration::from_secs(3), viewer_ws.next())
        .await
        .expect("Timeout waiting for join result on viewer")
        .unwrap()
        .unwrap();

    if let Message::Text(txt) = viewer_result {
        let msg: SignalingMessage = serde_json::from_str(&txt).unwrap();
        match msg {
            SignalingMessage::JoinResult { status, .. } => {
                assert_eq!(status, JoinStatus::Connected);
            }
            other => panic!("Expected JoinResult, got: {:?}", other),
        }
    } else {
        panic!("Expected text message");
    }
}

#[tokio::test]
async fn test_rate_limiter_lockout_on_invalid_code() {
    let port = 8183;
    let addr = SocketAddr::from(([127, 0, 0, 1], port));

    tokio::spawn(async move {
        let _ = shellvyn_signaling::run_signaling_server(addr).await;
    });

    for _ in 0..20 {
        tokio::time::sleep(Duration::from_millis(50)).await;
        if tokio::net::TcpStream::connect(addr).await.is_ok() {
            break;
        }
    }

    let ws_url = format!("ws://127.0.0.1:{}/ws", port);
    let (mut ws, _) = connect_async(&ws_url).await.unwrap();

    // Attempt 3 invalid codes
    for _ in 0..3 {
        let invalid_join = SignalingMessage::Join {
            code: "0000-0000".into(),
        };
        ws.send(Message::Text(serde_json::to_string(&invalid_join).unwrap().into()))
            .await
            .unwrap();

        let resp = timeout(Duration::from_secs(3), ws.next()).await.unwrap().unwrap().unwrap();
        if let Message::Text(txt) = resp {
            let msg: SignalingMessage = serde_json::from_str(&txt).unwrap();
            match msg {
                SignalingMessage::JoinResult { status, .. } => {
                    assert_eq!(status, JoinStatus::InvalidCode);
                }
                other => panic!("Expected InvalidCode, got: {:?}", other),
            }
        }
    }

    // 4th attempt should be blocked by Rate Limiter!
    let fourth_join = SignalingMessage::Join {
        code: "0000-0000".into(),
    };
    ws.send(Message::Text(serde_json::to_string(&fourth_join).unwrap().into()))
        .await
        .unwrap();

    let rate_limit_resp = timeout(Duration::from_secs(3), ws.next()).await.unwrap().unwrap().unwrap();
    if let Message::Text(txt) = rate_limit_resp {
        let msg: SignalingMessage = serde_json::from_str(&txt).unwrap();
        match msg {
            SignalingMessage::Error { code, .. } => {
                assert_eq!(code, "RATE_LIMITED");
            }
            other => panic!("Expected RateLimited error, got: {:?}", other),
        }
    } else {
        panic!("Expected text message");
    }
}
