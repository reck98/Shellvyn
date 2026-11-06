# Security Policy

Shellvyn is engineered with a **Security-First Architecture**. Because Shellvyn bridges host pseudo-terminals with browser interfaces, maintaining zero-knowledge confidentiality and robust authorization boundaries is paramount.

---

## Supported Versions

| Version | Supported | Security Maintenance |
| :---: | :---: | :--- |
| `0.1.x` | :white_check_mark: | Active release branch |
| `< 0.1.0` | :x: | Unsupported pre-release builds |

---

## Security Model & Cryptographic Guarantees

### 1. Zero-Knowledge Relay Architecture
- When routing terminal traffic via the signaling relay server (`SignalingMessage::RelayData`), all data payloads are encrypted using **ChaCha20-Poly1305** authenticated encryption with associated data (AEAD).
- The 256-bit symmetric session key is derived on the host and viewer endpoints using **HKDF-SHA256**:
  $$\text{Key} = \text{HKDF-Expand}(\text{HKDF-Extract}(\text{session\_salt}, \text{pairing\_code}), \text{"Shellvyn-E2EE-v2"}, 32)$$
- The signaling and relay servers only process opaque Base64-encoded ciphertext. They do not possess the pairing secret and cannot decrypt keystrokes, environment variables, or terminal output.

### 2. High-Entropy Pairing & Brute-Force Defense
- Sessions generate 40-bit entropy pairing codes formatted in **Crockford Base32** (`XXXX-XXXX`, $1.1 \times 10^{12}$ search space).
- The signaling service implements an active token-bucket rate limiter:
  - An IP address that produces **3 consecutive invalid join attempts** is automatically locked out for **15 minutes**.
  - Ephemeral session registrations automatically expire after **5 minutes (300s TTL)** if not claimed.

### 3. Explicit Host Approval & Scope Control
- Remote viewer join attempts trigger a mandatory host handshake (`PairRequest` $\to$ `PairAccept` / `PairReject`).
- The host agent displays the remote viewer's IP address and User-Agent before granting access.
- The host can enforce **Read-Only Mode** (`--read-only`), causing the host agent to reject all incoming remote keystrokes while continuing to stream terminal output.

### 4. Process Isolation & Resource Safety
- On Windows, child console processes are spawned inside dedicated `CreatePseudoConsole` instances with explicit handle inheritance restrictions (`bInheritHandle = FALSE`, `STARTF_USESTDHANDLES`).
- On Linux, sessions run in isolated POSIX pseudo-terminals (`openpty`, `setsid`, `login_tty`).
- On session close, the terminal manager executes immediate process tree teardown (`ClosePseudoConsole`, `TerminateProcess`, `killpg`) to eliminate orphan and zombie subprocesses.

---

## Reporting a Vulnerability

If you discover a security vulnerability within Shellvyn:

1. **Do not create a public GitHub issue.**
2. Send an email to the security maintainers at: **aashish7648@gmail.com** with the subject `[SECURITY] Shellvyn Vulnerability Report`.
3. Include:
   - A clear description of the vulnerability and attack vector.
   - Proof-of-concept (PoC) code or exact steps to reproduce.
   - Impact assessment on host systems or relay infrastructure.
4. We will acknowledge receipt of your report within 48 hours and coordinate a private patch and disclosure schedule.
