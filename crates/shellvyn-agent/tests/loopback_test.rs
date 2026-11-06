use bytes::Bytes;
use futures_util::{SinkExt, StreamExt};
use shellvyn_core::framing::Frame;
use std::net::SocketAddr;
use std::time::Duration;
use tokio::time::timeout;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;

#[tokio::test]
async fn test_local_loopback_terminal_stream() {
    let port = 3892;
    let addr = SocketAddr::from(([127, 0, 0, 1], port));

    // Spawn loopback server in background
    let _server_handle = tokio::spawn(async move {
        let _ = shellvyn_agent::run_local_server_for_test(port).await;
    });

    // Wait for server to start listening
    let mut connected = false;
    for _ in 0..20 {
        tokio::time::sleep(Duration::from_millis(100)).await;
        if tokio::net::TcpStream::connect(addr).await.is_ok() {
            connected = true;
            break;
        }
    }
    assert!(connected, "Failed to connect to local loopback server");

    // Connect via WebSocket
    let ws_url = format!("ws://127.0.0.1:{}/ws", port);
    let (mut ws_stream, _) = connect_async(&ws_url)
        .await
        .expect("Failed to perform WebSocket handshake with loopback server");

    // Send a test command via DATA frame
    let ping_cmd = if cfg!(windows) {
        b"echo SHELLVYN_LOOPBACK_MAGIC\r\n".as_slice()
    } else {
        b"echo 'SHELLVYN_LOOPBACK_MAGIC'\n".as_slice()
    };

    let frame = Frame::Data(Bytes::copy_from_slice(ping_cmd));
    ws_stream
        .send(Message::Binary(frame.encode().into()))
        .await
        .expect("Failed to send DATA frame over WebSocket");

    // Collect streamed terminal output
    let mut collected = Vec::new();
    let result = timeout(Duration::from_secs(8), async {
        while let Some(Ok(msg)) = ws_stream.next().await {
            if let Message::Binary(bin) = msg {
                let bytes = Bytes::from(bin);
                if let Ok(Frame::Data(output_bytes)) = Frame::decode(bytes) {
                    collected.extend_from_slice(&output_bytes);
                    let text = String::from_utf8_lossy(&collected);
                    if text.contains("SHELLVYN_LOOPBACK_MAGIC") {
                        return true;
                    }
                }
            }
        }
        false
    })
    .await;

    assert!(
        result.unwrap_or(false),
        "Loopback did not receive magic string in output: {}",
        String::from_utf8_lossy(&collected)
    );

    // Send resize frame
    let resize_frame = Frame::Resize { cols: 100, rows: 35 };
    assert!(ws_stream
        .send(Message::Binary(resize_frame.encode().into()))
        .await
        .is_ok());

    // Clean disconnect
    let close_frame = Frame::Close {
        reason: "Test complete".into(),
    };
    let _ = ws_stream
        .send(Message::Binary(close_frame.encode().into()))
        .await;
}
