# Shellvyn Testing Status & Verification Register

## 1. Test Strategy Overview
Every component in Shellvyn requires automated test coverage at the unit, integration, and cross-platform layers. No milestone is considered complete without passing automated test executions.

---

## 2. Test Execution Log

| Date | Scope / Crate | Test Description | Tests Run | Passed | Failed | Status |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| 2026-11-07 | Pre-Implementation | Environment validation (rustc 1.99.1, node 22.20.0, npm 10.9.3) | 3 | 3 | 0 | PASS |
| 2026-11-07 | `shellvyn-core` | M0 Foundation: Crockford Base32 pairing, framing v2, ChaCha20-Poly1305 E2EE, JSON protocol | 17 | 17 | 0 | PASS |
| 2026-11-07 | `shellvyn-pty` | M1 Windows ConPTY: CMD & PowerShell spawn, input streaming, output capture, dynamic resize | 2 | 2 | 0 | PASS |
| 2026-11-07 | `shellvyn-agent` | M1 CLI Self-Test: `shellvyn test-pty` end-to-end PTY loopback roundtrip and resize | 2 | 2 | 0 | PASS |

---

## 3. Test Suites by Milestone

### M0 & M1: Core & Terminal PTY
- [x] `shellvyn_core::protocol::tests`: Serialization/deserialization of signaling messages (Register, JoinResult, PairRequest, IceCandidate).
- [x] `shellvyn_core::framing::tests`: Encode/decode of binary frames (`0x01` DATA, `0x02` RESIZE, `0x03` CLOSE, `0x04` PING, `0x05` PONG, `0x06` PERMISSION).
- [x] `shellvyn_core::pairing::tests`: Crockford Base32 formatting, entropy validation, code generation, lookalike normalization.
- [x] `shellvyn_core::crypto::tests`: ChaCha20-Poly1305 AEAD round-trip encryption/decryption with HKDF keys and tamper detection.
- [x] `shellvyn_pty::conpty::tests` (Windows):
  - [x] Spawn PowerShell & CMD processes via ConPTY.
  - [x] Write keystrokes (`Write-Output`, `echo`), assert output capture via async mpsc channel.
  - [x] Window resize test (`ResizePseudoConsole`).
  - [x] Clean process termination and pipe closure without handle leaks.
- [x] `shellvyn_agent::main` (CLI):
  - [x] Self-test loopback for default shell (PowerShell).
  - [x] Self-test loopback for Cmd (`shellvyn test-pty --shell cmd`).
- [ ] `shellvyn_pty::posix::tests` (Linux):
  - [ ] Spawn bash process.
  - [ ] Write keystrokes, assert output capture.
  - [ ] Window resize test (`ioctl(TIOCSWINSZ)`).
  - [ ] Child signal handling and PID reap.

### M2: Browser & Loopback Terminal
- [ ] Loopback WebSocket integration test (agent loopback $\to$ browser client).
- [ ] xterm.js ANSI rendering verification.
- [ ] Rapid window resize debounce test.

### M3: Signaling & Pairing
- [ ] Host registration test.
- [ ] Code matching and pairing routing test.
- [ ] Host acceptance / rejection response test.
- [ ] Code expiration test (5-minute TTL).
- [ ] Rate-limit enforcement test (3 failed attempts $\to$ HTTP 429 / lockout).

### M4: Transport & E2EE Relay
- [ ] WebRTC DataChannel connection test.
- [ ] E2EE relay stream test (assert ciphertext over wire).
- [ ] WebRTC disconnect failover to relay test.

### M5: Security & Stress
- [ ] Environment variable sanitization test.
- [ ] High-throughput buffer flood test (100MB output stream backpressure).
- [ ] Process leak test (zero zombie child processes after 50 consecutive session cycles).
