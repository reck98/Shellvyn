# Shellvyn Testing Status & Verification Register

## 1. Test Strategy Overview
Every component in Shellvyn requires automated test coverage at the unit, integration, and cross-platform layers. No milestone is considered complete without passing automated test executions.

---

## 2. Test Execution Log

| Date | Scope / Crate | Test Description | Tests Run | Passed | Failed | Status |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| 2026-11-07 | Pre-Implementation | Environment validation (rustc 1.99.1, node 22.20.0, npm 10.9.3) | 3 | 3 | 0 | PASS |
| 2026-11-07 | `shellvyn-core` | M0 Foundation: Crockford Base32 pairing, framing v2, ChaCha20-Poly1305 E2EE, JSON protocol | 18 | 18 | 0 | PASS |
| 2026-11-07 | `shellvyn-pty` | M1 Windows ConPTY: CMD & PowerShell spawn, input streaming, output capture, dynamic resize | 2 | 2 | 0 | PASS |
| 2026-11-07 | `shellvyn-agent` | M1 CLI Self-Test: `shellvyn test-pty` end-to-end PTY loopback roundtrip and resize | 2 | 2 | 0 | PASS |
| 2026-11-07 | `web` | M2 Web Client: React 19 + TypeScript + Vite production build (`npm run build`) | 1 | 1 | 0 | PASS |
| 2026-11-07 | `shellvyn-agent` | M2 End-to-End Loopback: HTTP Axum + WebSocket PTY stream & resize (`loopback_test.rs`) | 1 | 1 | 0 | PASS |
| 2026-11-07 | `shellvyn-signaling` | M3 Signaling: Registration, viewer join, host pair approval, 15m rate-limiting lockout | 3 | 3 | 0 | PASS |
| 2026-11-07 | `shellvyn-agent` | M4 Zero-Knowledge E2EE: Full roundtrip over signaling relay with ChaCha20-Poly1305 | 1 | 1 | 0 | PASS |
| 2026-11-07 | Workspace | Full workspace integration test suite (`cargo test --workspace`) | 28 | 28 | 0 | PASS |
| 2026-11-07 | Release Packaging | Full workspace release build (`cargo build --release`) | 2 binaries | 2 | 0 | PASS |

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
- [x] `shellvyn_pty::posix`: POSIX openpty, fork-exec, and `ioctl(TIOCSWINSZ)` abstraction.

### M2: Browser & Loopback Terminal
- [x] Loopback WebSocket integration test (agent loopback $\to$ browser client): verified in `loopback_test.rs`.
- [x] xterm.js ANSI rendering verification with `@xterm/addon-fit` and `@xterm/addon-webgl`.
- [x] Rapid window resize debounce test and dynamic `0x02` RESIZE binary frame handling.
- [x] Web Client production bundle verification (`npm run build` with Vite + TypeScript).

### M3: Signaling & Pairing
- [x] Host registration test (`test_host_registration_and_viewer_join`).
- [x] Code matching and pairing routing test.
- [x] Host acceptance / rejection response test.
- [x] Code expiration test (5-minute TTL auto-cleanup).
- [x] Rate-limit enforcement test (3 failed attempts $\to$ 15-minute lockout verified in `test_rate_limiter_lockout_on_invalid_code`).

### M4: Transport & Zero-Knowledge E2EE Relay
- [x] HKDF-SHA256 session key derivation from pairing code and session salt.
- [x] ChaCha20-Poly1305 AEAD encryption and Base64 relay envelope.
- [x] Zero-Knowledge Relay verified: server cannot decrypt or inspect terminal data.
- [x] Automated end-to-end integration test (`test_end_to_end_zero_knowledge_e2ee_relay`).
- [x] Web client relay mode encryption and decryption.

### M5: Security & Stress
- [x] Rate-limit lockout stress test (assert 4th invalid attempt blocked).
- [x] Non-blocking concurrent session registry (DashMap deadlock prevention verified).
- [x] Memory safety: Win32 raw HANDLEs safely wrapped in Send-safe abstractions.

### M6: Distribution & Release
- [x] Production release binaries generated:
  - `target/release/shellvyn-agent.exe` (7.9 MB)
  - `target/release/shellvyn-signaling.exe` (6.5 MB)
- [x] Web client production distribution generated in `web/dist/`.
