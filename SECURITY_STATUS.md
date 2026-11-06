# Shellvyn Security Status & Threat Register

## 1. Security Baseline & Guarantees
Shellvyn adheres to a **Security-First Architecture**:
1. **Zero-Knowledge Relay**: Relay servers never possess session keys and cannot inspect or tamper with terminal input or output.
2. **Explicit Host Authorization**: No viewer can connect to a terminal without real-time host user confirmation.
3. **High-Entropy Pairing**: 8-character Crockford Base32 codes ($1.1 \times 10^{12}$ combinations) prevent offline and online brute force.
4. **Environment Sanitization**: Sensitive environment variables are purged before shell execution.
5. **No Local Open Control Ports**: The agent does not bind unauthenticated remote control listeners.

---

## 2. Threat Register & Mitigation Matrix

| ID | Threat Vector | Risk Level | Mitigation in Shellvyn | Status |
| :---: | :--- | :---: | :--- | :---: |
| **TH-01** | **Signaling Relay Eavesdropping** | Critical | End-to-End Encryption (ChaCha20-Poly1305) with keys derived from pairing secret. Relay server is strictly zero-knowledge. | **Verified (Automated Test)** |
| **TH-02** | **Pairing Code Brute Force** | High | 8-character Crockford Base32 code ($1.1 \times 10^{12}$ search space) + Token bucket rate limiting (3 strikes $\to$ 15m lockout) + 5m code TTL. | **Verified (Automated Test)** |
| **TH-03** | **Unauthorized Terminal Hijacking** | Critical | Mandatory Host Handshake (`pair_request` $\to$ `pair_accept`/`pair_reject`) displaying remote IP and User-Agent. | **Verified (Automated Test)** |
| **TH-04** | **Credential & Token Leakage** | High | Clean-room subprocess launch with explicit handle protection (`bInheritHandle = FALSE`). | **Implemented** |
| **TH-05** | **Rogue Remote Command Execution** | Critical | Granular Permission Scopes: Host can select **Read-Only** mode to completely drop remote input. | **Verified (Automated Test)** |
| **TH-06** | **Buffer Overflow / DoS via Bulk Output** | Medium | Bounded channels (`mpsc::channel(1024)`) and async backpressure streaming. | **Implemented** |
| **TH-07** | **Zombie / Orphan Process Leak** | Medium | Automated process tree tracking and explicit termination on session disconnect (`ClosePseudoConsole`, `TerminateProcess`). | **Implemented** |
| **TH-08** | **Replay Attacks** | High | 12-byte random nonces per binary frame (`OsRng`) + ChaCha20-Poly1305 16-byte authentication tags. | **Verified (Automated Test)** |

---

## 3. Security Audit Checklist
- [x] No plaintext passwords or shell commands in any application log (`tracing` / `env_logger` filters).
- [x] Pairing code generation uses cryptographically secure RNG (`rand::rngs::OsRng`).
- [x] E2EE keys generated via `HKDF-SHA256` with domain-separated salt.
- [x] ConPTY pipes allocated with restricted security attributes (`bInheritHandle = FALSE`).
- [x] Win32 HANDLE types wrapped in `SafeHandle` enforcing pointer bounds and thread safety.
- [x] Zero-knowledge relay payload verification: relay server only sees Base64-encoded AEAD ciphertext.
