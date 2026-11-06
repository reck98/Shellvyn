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
| **TH-01** | **Signaling Relay Eavesdropping** | Critical | End-to-End Encryption (ChaCha20-Poly1305) with keys derived from pairing secret. Relay server is strictly zero-knowledge. | Specified |
| **TH-02** | **Pairing Code Brute Force** | High | 8-character Crockford Base32 code ($1.1 \times 10^{12}$ search space) + Token bucket rate limiting (3 strikes $\to$ 15m lockout) + 5m code TTL. | Specified |
| **TH-03** | **Unauthorized Terminal Hijacking** | Critical | Mandatory Host Prompt (`pair_request` $\to$ `pair_accept`/`pair_reject`) displaying remote IP and User-Agent. | Specified |
| **TH-04** | **Credential & Token Leakage** | High | Environment sanitization whitelist: purges `*TOKEN*`, `*KEY*`, `*SECRET*`, `*PASSWORD*`, `AWS_*`, `GITHUB_*` from child shell. | Specified |
| **TH-05** | **Rogue Remote Command Execution** | Critical | Granular Permission Scopes: Host can select **Read-Only** mode to completely drop remote input. | Specified |
| **TH-06** | **Buffer Overflow / DoS via Bulk Output** | Medium | Explicit WebRTC backpressure: pauses PTY read loop when bufferedAmount exceeds 1 MiB. | Specified |
| **TH-07** | **Zombie / Orphan Process Leak** | Medium | Automated process tree tracking and explicit termination on session disconnect (`ClosePseudoConsole` / `killpg`). | Specified |
| **TH-08** | **Replay Attacks** | High | 12-byte random nonces per binary frame; monotonic sequence numbers; ephemeral pairing sessions. | Specified |

---

## 3. Security Audit Checklist
- [ ] No plaintext passwords or shell commands in any application log (`tracing` / `env_logger` filters).
- [ ] Pairing code generation uses cryptographically secure RNG (`rand::rngs::OsRng`).
- [ ] E2EE keys generated via `HKDF-SHA256` with domain-separated salt.
- [ ] ConPTY pipes allocated with restricted security attributes (`bInheritHandle = FALSE`).
- [ ] POSIX PTY allocated with `O_CLOEXEC` on master and slave descriptors.
