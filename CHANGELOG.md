# Shellvyn Changelog

All notable changes to the Shellvyn platform will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-11-07

### Added
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
- Implemented Local Terminal Agent & PTY Subsystems (M1):
  - Created cross-platform `shellvyn-pty` crate with unified `TerminalSession` trait and `spawn_terminal` factory.
  - Implemented Windows `ConPtySession` using Windows ConPTY (`CreatePseudoConsole`, `STARTF_USESTDHANDLES`, `PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE`, `ResizePseudoConsole`).
  - Implemented asynchronous pipe reader thread forwarding ANSI terminal output into Tokio `mpsc` channel.
  - Implemented thread-safe `send_input` for keystroke streaming.
  - Implemented Linux POSIX PTY subsystem (`openpty`, `setsid`, `login_tty`, `ioctl(TIOCSWINSZ)`).
  - Implemented `shellvyn test-pty` diagnostic command verifying terminal spawn, I/O roundtrip, and dynamic resizing.
  - Passed all automated integration tests with both PowerShell and CMD.
  - Initialized Git repository and remote origin `https://github.com/reck98/Shellvyn.git`.
  - Created `.gitignore` and root `README.md`.
  - Created implementation, testing, and security tracking registers (`IMPLEMENTATION_STATUS.md`, `TESTING_STATUS.md`, `SECURITY_STATUS.md`).
  - Configured Cargo workspace with members: `shellvyn-core`, `shellvyn-pty`, `shellvyn-signaling`, `shellvyn-agent`.
  - Implemented `shellvyn-core` with Crockford Base32 8-char pairing generator and normalizer, binary wire framing v2 encoder/decoder, ChaCha20-Poly1305 AEAD + HKDF-SHA256 zero-knowledge encryption, and typed WebSocket signaling messages.
  - Resolved Windows GNU toolchain linker dependencies using isolated 64-bit MinGW toolchain (`w64devkit` + `rust-lld`).
  - Verified 100% automated test pass rate (17 tests passing across core crypto, protocol, framing, and pairing).
