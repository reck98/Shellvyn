# Shellvyn Changelog

All notable changes to the Shellvyn platform will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.4] - 2026-11-07

### Changed
- Defaulted host approval to manual verification:
  - `shellvyn share` now defaults to requiring explicit host authorization (`[y/N]` prompt) before admitting any incoming viewer.
  - Added `--auto-accept` flag for optional unattended sessions.
  - Added Approval Mode indicator to the host session banner.

## [0.1.3] - 2026-11-07

### Fixed
- Fixed reverse proxy client IP resolution in signaling server:
  - Extracted true client IP from `CF-Connecting-IP`, `X-Forwarded-For`, and `X-Real-IP`.
  - Excluded internal private cloud networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) from rate limiter lockout so cloud reverse proxies are never blocked.
  - Adjusted rate limiter threshold to 5 attempts with 5-minute lockout window.
- Fixed idle connection drops via 15-second bidirectional keep-alive heartbeats in both host agent and web client.
- Fixed web client URL hash auto-join so opening `https://shellvyn.reck98.in/#XXXX-XXXX` automatically pre-fills code and connects.
- Ensured signaling connection errors and status codes are explicitly printed to host terminal.

## [0.1.2] - 2026-11-07

### Fixed
- Fixed double-formatting of pairing codes in `shellvyn share` session banner:
  - `generate_pairing_code()` returns canonical 8-character `XXXX-XXXX` format; prevented re-slicing which caused double dashes (`--`) and truncated the 8th character.
  - Added normalization and validation when a custom `--code` argument is supplied.

## [0.1.1] - 2026-11-07

### Added
- Graceful shutdown lifecycle in `shellvyn share` host agent:
  - Intercepts `Ctrl+C` (`SIGINT`) and `SIGTERM` across platforms.
  - Automatically notifies active viewer with encrypted `Frame::Close` payload before disconnecting.
  - Sends clean WebSocket `CloseFrame::Normal` to the signaling server to unregister session immediately.
  - Safely terminates child PTY terminal process and releases all Win32 handles / POSIX file descriptors.
  - Added graceful shutdown to `shellvyn local` loopback server via Axum's `with_graceful_shutdown`.
- Full TLS WebSocket (`wss://`) support using `rustls-tls-native-roots` and the `ring` crypto provider.

## [0.1.0] - 2026-11-07

### Added
- Redesigned Web Client Interface (Taste Design Overhaul):
  - Completely eliminated AI-generated visual clutter, excessive gradients, glowing cards, and arbitrary animations.
  - Built a refined, minimal, high-density developer workstation interface inspired by Linear, Raycast, and Warp.
  - Implemented first-class Light and Dark visual modes with instant `@xterm/xterm` color palette switching and `localStorage` persistence.
  - Refactored pairing code console with character normalization, instant input validation, and local session history (last 3 sessions).
  - Streamlined active terminal toolbar with session geometry indicators, link sharing, and buffer clearing.
- Completed reverse-engineering investigation of reference product (Skyping) using REA.
- Authored 5 detailed investigation documents:
  - `investigation/PRODUCT_ANALYSIS.md`
  - `investigation/WEB_APPLICATION_ANALYSIS.md`
  - `investigation/TERMINAL_AGENT_ANALYSIS.md`
  - `investigation/NETWORKING_ANALYSIS.md`
  - `investigation/SECURITY_ANALYSIS.md`
- Authored 5 architectural specification documents:
  - `architecture/SHELLVYN_ARCHITECTURE.md`
  - `architecture/COMPONENT_DESIGN.md`
  - `architecture/PROTOCOL_SPECIFICATION.md`
  - `architecture/TECHNOLOGY_DECISIONS.md`
  - `architecture/IMPLEMENTATION_ROADMAP.md`
- Implemented Distribution, Packaging & Release (M6):
  - Compiled optimized production release binaries using 64-bit MinGW toolchain (`w64devkit` + `rust-lld`):
    - `target/release/shellvyn-agent.exe` (7.9 MB)
    - `target/release/shellvyn-signaling.exe` (6.5 MB)
  - Built optimized production web application bundle (`web/dist/`) via `tsc -b && vite build`.
- Implemented Security Hardening & Threat Mitigations (M5):
  - Verified 15-minute IP lockout on brute force attempts (token-bucket rate limiter).
  - Verified zero-knowledge confidentiality: relay server only sees Base64-encoded AEAD ciphertext.
  - Audited memory and thread safety across async boundaries (`SafeHandle` abstraction for Win32 `HANDLE`).
- Implemented Remote Connectivity & Zero-Knowledge E2EE Relay (M4):
  - Implemented end-to-end encryption pipeline using ChaCha20-Poly1305 with HKDF-SHA256 session key derivation.
  - Implemented Base64 relay envelope (`SignalingMessage::RelayData`) in `shellvyn-core`.
  - Built `shellvyn share` host agent command displaying active session ASCII banner, pairing code, and URL.
  - Implemented bidirectional terminal streaming: ConPTY output $\to$ binary DATA frame $\to$ ChaCha20-Poly1305 $\to$ Base64 RelayData $\to$ viewer.
  - Implemented web client remote relay adapter in React (`App.tsx` + `crypto.ts`).
  - Added automated end-to-end integration test (`e2ee_share_test.rs`) verifying full encrypted round-trip terminal I/O.
- Implemented Pairing & Signaling Service (M3):
  - Implemented `RateLimiter` with token-bucket algorithm (3 failed attempts $\to$ 15-minute IP lockout).
  - Implemented `SessionRegistry` with non-blocking concurrent DashMap and 5-minute session TTL auto-eviction.
  - Built Axum WebSocket signaling server routing `Register`, `Join`, `PairRequest`, `PairAccept`, `PairReject`, `RelayData`, and `Heartbeat`.
  - Added automated signaling integration test suite (`signaling_test.rs`).
- Implemented Browser Terminal & Local Loopback (M2):
  - Created modern React 19 + TypeScript + Vite + Tailwind CSS v4 web client in `web/`.
  - Integrated `@xterm/xterm` with `@xterm/addon-fit` and `@xterm/addon-webgl` for hardware-accelerated ANSI terminal rendering.
  - Implemented client-side binary wire framing (`framing.ts`) and Crockford Base32 input normalization (`pairing.ts`).
  - Implemented client-side ChaCha20-Poly1305 AEAD and HKDF-SHA256 E2EE cryptography (`crypto.ts`) interoperable with Rust core.
  - Built embedded HTTP and WebSocket local loopback server (`shellvyn local --port 3000`) in `shellvyn-agent` using Axum.
  - Created automated end-to-end integration test (`loopback_test.rs`) verifying full-stack browser-to-PTY streaming over WebSocket.
- Implemented Local Terminal Agent & PTY Subsystems (M1):
  - Created cross-platform `shellvyn-pty` crate with unified `TerminalSession` trait and `spawn_terminal` factory.
  - Implemented Windows `ConPtySession` using Windows ConPTY (`CreatePseudoConsole`, `STARTF_USESTDHANDLES`, `PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE`, `ResizePseudoConsole`).
  - Implemented asynchronous pipe reader thread forwarding ANSI terminal output into Tokio `mpsc` channel.
  - Implemented thread-safe `send_input` for keystroke streaming.
  - Implemented Linux POSIX PTY subsystem (`openpty`, `setsid`, `login_tty`, `ioctl(TIOCSWINSZ)`).
  - Implemented `shellvyn test-pty` diagnostic command verifying terminal spawn, I/O roundtrip, and dynamic resizing.
  - Passed all automated integration tests with both PowerShell and CMD.
- Project Foundation (M0):
  - Initialized Git repository and remote origin `https://github.com/reck98/Shellvyn.git`.
  - Created `.gitignore` and root `README.md`.
  - Created implementation, testing, and security tracking registers (`IMPLEMENTATION_STATUS.md`, `TESTING_STATUS.md`, `SECURITY_STATUS.md`).
  - Configured Cargo workspace with members: `shellvyn-core`, `shellvyn-pty`, `shellvyn-signaling`, `shellvyn-agent`.
  - Implemented `shellvyn-core` with Crockford Base32 8-char pairing generator and normalizer, binary wire framing v2 encoder/decoder, ChaCha20-Poly1305 AEAD + HKDF-SHA256 zero-knowledge encryption, and typed WebSocket signaling messages.
  - Resolved Windows GNU toolchain linker dependencies using isolated 64-bit MinGW toolchain (`w64devkit` + `rust-lld`).
  - Verified 100% automated test pass rate (18 tests passing across core crypto, protocol, framing, and pairing).
