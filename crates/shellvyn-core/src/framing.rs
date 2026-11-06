use crate::error::{CoreError, Result};
use bytes::{Buf, BufMut, Bytes, BytesMut};

pub const OPCODE_DATA: u8 = 0x01;
pub const OPCODE_RESIZE: u8 = 0x02;
pub const OPCODE_CLOSE: u8 = 0x03;
pub const OPCODE_PING: u8 = 0x04;
pub const OPCODE_PONG: u8 = 0x05;
pub const OPCODE_PERMISSION: u8 = 0x06;
pub const OPCODE_AUTH_CHALLENGE: u8 = 0x07;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PermissionMode {
    ReadOnly = 0x00,
    Interactive = 0x01,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Frame {
    Data(Bytes),
    Resize { cols: u16, rows: u16 },
    Close { reason: String },
    Ping,
    Pong,
    Permission(PermissionMode),
    AuthChallenge([u8; 32]),
}

impl Frame {
    /// Encodes the frame into a byte buffer matching the binary wire protocol.
    pub fn encode(&self) -> Bytes {
        match self {
            Frame::Data(data) => {
                let mut buf = BytesMut::with_capacity(1 + data.len());
                buf.put_u8(OPCODE_DATA);
                buf.put_slice(data);
                buf.freeze()
            }
            Frame::Resize { cols, rows } => {
                let mut buf = BytesMut::with_capacity(5);
                buf.put_u8(OPCODE_RESIZE);
                buf.put_u16(*cols);
                buf.put_u16(*rows);
                buf.freeze()
            }
            Frame::Close { reason } => {
                let reason_bytes = reason.as_bytes();
                let mut buf = BytesMut::with_capacity(1 + reason_bytes.len());
                buf.put_u8(OPCODE_CLOSE);
                buf.put_slice(reason_bytes);
                buf.freeze()
            }
            Frame::Ping => Bytes::from_static(&[OPCODE_PING]),
            Frame::Pong => Bytes::from_static(&[OPCODE_PONG]),
            Frame::Permission(mode) => {
                Bytes::from(vec![OPCODE_PERMISSION, *mode as u8])
            }
            Frame::AuthChallenge(nonce) => {
                let mut buf = BytesMut::with_capacity(1 + 32);
                buf.put_u8(OPCODE_AUTH_CHALLENGE);
                buf.put_slice(nonce);
                buf.freeze()
            }
        }
    }

    /// Decodes a frame from raw bytes.
    pub fn decode(mut buffer: Bytes) -> Result<Self> {
        if buffer.is_empty() {
            return Err(CoreError::Framing("Empty frame buffer".into()));
        }

        let opcode = buffer.get_u8();
        match opcode {
            OPCODE_DATA => Ok(Frame::Data(buffer)),
            OPCODE_RESIZE => {
                if buffer.remaining() < 4 {
                    return Err(CoreError::Framing(format!(
                        "Resize frame too short: expected 4 bytes, found {}",
                        buffer.remaining()
                    )));
                }
                let cols = buffer.get_u16();
                let rows = buffer.get_u16();
                Ok(Frame::Resize { cols, rows })
            }
            OPCODE_CLOSE => {
                let reason = String::from_utf8(buffer.to_vec())
                    .map_err(|e| CoreError::Framing(format!("Invalid UTF-8 close reason: {}", e)))?;
                Ok(Frame::Close { reason })
            }
            OPCODE_PING => Ok(Frame::Ping),
            OPCODE_PONG => Ok(Frame::Pong),
            OPCODE_PERMISSION => {
                if buffer.is_empty() {
                    return Err(CoreError::Framing("Missing permission flag in frame".into()));
                }
                let mode = match buffer.get_u8() {
                    0x00 => PermissionMode::ReadOnly,
                    0x01 => PermissionMode::Interactive,
                    other => {
                        return Err(CoreError::Framing(format!(
                            "Invalid permission mode byte: 0x{:02x}",
                            other
                        )));
                    }
                };
                Ok(Frame::Permission(mode))
            }
            OPCODE_AUTH_CHALLENGE => {
                if buffer.remaining() < 32 {
                    return Err(CoreError::Framing(format!(
                        "Auth challenge frame too short: expected 32 bytes, found {}",
                        buffer.remaining()
                    )));
                }
                let mut nonce = [0u8; 32];
                buffer.copy_to_slice(&mut nonce);
                Ok(Frame::AuthChallenge(nonce))
            }
            unknown => Err(CoreError::Framing(format!(
                "Unknown frame opcode: 0x{:02x}",
                unknown
            ))),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_data_frame_roundtrip() {
        let payload = Bytes::from("echo hello world\n");
        let frame = Frame::Data(payload.clone());
        let encoded = frame.encode();
        assert_eq!(encoded[0], OPCODE_DATA);
        assert_eq!(&encoded[1..], &payload[..]);

        let decoded = Frame::decode(encoded).unwrap();
        assert_eq!(decoded, Frame::Data(payload));
    }

    #[test]
    fn test_resize_frame_roundtrip() {
        let frame = Frame::Resize { cols: 120, rows: 40 };
        let encoded = frame.encode();
        assert_eq!(encoded.len(), 5);
        assert_eq!(encoded[0], OPCODE_RESIZE);
        assert_eq!(&encoded[1..3], &120u16.to_be_bytes());
        assert_eq!(&encoded[3..5], &40u16.to_be_bytes());

        let decoded = Frame::decode(encoded).unwrap();
        assert_eq!(decoded, Frame::Resize { cols: 120, rows: 40 });
    }

    #[test]
    fn test_close_frame_roundtrip() {
        let frame = Frame::Close {
            reason: "User closed session".into(),
        };
        let encoded = frame.encode();
        let decoded = Frame::decode(encoded).unwrap();
        assert_eq!(
            decoded,
            Frame::Close {
                reason: "User closed session".into()
            }
        );
    }

    #[test]
    fn test_ping_pong_frames() {
        let ping_encoded = Frame::Ping.encode();
        assert_eq!(Frame::decode(ping_encoded).unwrap(), Frame::Ping);

        let pong_encoded = Frame::Pong.encode();
        assert_eq!(Frame::decode(pong_encoded).unwrap(), Frame::Pong);
    }

    #[test]
    fn test_permission_frame() {
        let ro = Frame::Permission(PermissionMode::ReadOnly);
        assert_eq!(Frame::decode(ro.encode()).unwrap(), ro);

        let rw = Frame::Permission(PermissionMode::Interactive);
        assert_eq!(Frame::decode(rw.encode()).unwrap(), rw);
    }
}
