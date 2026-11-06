/**
 * Shellvyn Binary Framing Wire Protocol (v2)
 *
 * Implements the 1-byte opcode binary packet framing specification.
 */

export const OPCODE_DATA = 0x01;
export const OPCODE_RESIZE = 0x02;
export const OPCODE_CLOSE = 0x03;
export const OPCODE_PING = 0x04;
export const OPCODE_PONG = 0x05;
export const OPCODE_PERMISSION = 0x06;
export const OPCODE_AUTH_CHALLENGE = 0x07;

export const PermissionMode = {
  ReadOnly: 0x00,
  Interactive: 0x01,
} as const;

export type PermissionMode = (typeof PermissionMode)[keyof typeof PermissionMode];

export type Frame =
  | { type: 'data'; data: Uint8Array }
  | { type: 'resize'; cols: number; rows: number }
  | { type: 'close'; reason: string }
  | { type: 'ping' }
  | { type: 'pong' }
  | { type: 'permission'; mode: PermissionMode }
  | { type: 'auth_challenge'; nonce: Uint8Array };

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Encodes terminal keystroke data into a binary DATA frame (opcode 0x01).
 */
export function encodeData(input: Uint8Array | string): Uint8Array {
  const payload = typeof input === 'string' ? textEncoder.encode(input) : input;
  const frame = new Uint8Array(1 + payload.length);
  frame[0] = OPCODE_DATA;
  frame.set(payload, 1);
  return frame;
}

/**
 * Encodes window dimensions into a 5-byte RESIZE frame (opcode 0x02).
 */
export function encodeResize(cols: number, rows: number): Uint8Array {
  const frame = new Uint8Array(5);
  frame[0] = OPCODE_RESIZE;
  const view = new DataView(frame.buffer);
  view.setUint16(1, cols, false); // Big-Endian
  view.setUint16(3, rows, false); // Big-Endian
  return frame;
}

/**
 * Encodes a CLOSE frame with diagnostic text (opcode 0x03).
 */
export function encodeClose(reason: string): Uint8Array {
  const payload = textEncoder.encode(reason);
  const frame = new Uint8Array(1 + payload.length);
  frame[0] = OPCODE_CLOSE;
  frame.set(payload, 1);
  return frame;
}

/**
 * Encodes a keep-alive PING frame (opcode 0x04).
 */
export function encodePing(): Uint8Array {
  return new Uint8Array([OPCODE_PING]);
}

/**
 * Encodes a keep-alive PONG frame (opcode 0x05).
 */
export function encodePong(): Uint8Array {
  return new Uint8Array([OPCODE_PONG]);
}

/**
 * Decodes a raw binary frame received over WebRTC DataChannel or WebSocket.
 */
export function decodeFrame(bytes: Uint8Array): Frame {
  if (bytes.length === 0) {
    throw new Error('Cannot decode empty frame');
  }

  const opcode = bytes[0];
  switch (opcode) {
    case OPCODE_DATA:
      return { type: 'data', data: bytes.subarray(1) };

    case OPCODE_RESIZE: {
      if (bytes.length < 5) {
        throw new Error(`Resize frame too short: ${bytes.length} bytes`);
      }
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const cols = view.getUint16(1, false);
      const rows = view.getUint16(3, false);
      return { type: 'resize', cols, rows };
    }

    case OPCODE_CLOSE: {
      const reason = textDecoder.decode(bytes.subarray(1));
      return { type: 'close', reason };
    }

    case OPCODE_PING:
      return { type: 'ping' };

    case OPCODE_PONG:
      return { type: 'pong' };

    case OPCODE_PERMISSION: {
      if (bytes.length < 2) {
        throw new Error('Permission frame missing mode byte');
      }
      const mode = bytes[1] === 0x01 ? PermissionMode.Interactive : PermissionMode.ReadOnly;
      return { type: 'permission', mode };
    }

    case OPCODE_AUTH_CHALLENGE: {
      if (bytes.length < 33) {
        throw new Error('Auth challenge frame missing 32-byte nonce');
      }
      return { type: 'auth_challenge', nonce: bytes.subarray(1, 33) };
    }

    default:
      throw new Error(`Unknown frame opcode: 0x${opcode.toString(16)}`);
  }
}
