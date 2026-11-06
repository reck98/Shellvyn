# Shellvyn Production Operations & Runbook

This runbook provides operational guidelines, diagnostic procedures, and troubleshooting steps for maintaining Shellvyn in production.

---

## 1. Health Monitoring & Service Level Indicators (SLIs)

### HTTP Health Probe
Render continually checks the signaling container via HTTP GET:
```bash
curl -f https://shellvyn-signaling.onrender.com/health
```

- **Frequency**: Every 30 seconds.
- **Success Criteria**: HTTP 200 with JSON payload `{"status":"healthy", ...}` within 5 seconds.
- **Action on Failure**: Render restarts the container after 3 consecutive failures.

### WebSocket Availability Probe
To verify that WebSocket upgrades and TLS termination are operational:
```bash
npx wscat -c wss://shellvyn-signaling.onrender.com/ws
```

---

## 2. In-Memory Session Registry Management

The signaling service maintains active pairing sessions in an in-memory `DashMap`:

- **Session TTL**: 5 minutes (300 seconds) from registration.
- **Automatic Eviction**: Expired sessions are evicted lazily upon lookup, re-registration, or client disconnection.
- **Memory Footprint**: Each active session consumes approximately 400 bytes of RAM. A 512 MB Render instance comfortably supports > 50,000 concurrent sessions without swapping.

### Container Restart & Redeployment Impact
- Because sessions are stored in process memory, redeploying or restarting the container terminates active relay connections.
- **Client Behavior**: Both the Host Agent and Web Client detect connection closure and enter the `disconnected` state.
- **Recovery**: The host must execute `shellvyn share` again to generate a new pairing code, and viewers reconnect with the new code.

---

## 3. Rate Limiting Operations

To defend against brute-force code guessing and denial-of-service attempts, the signaling service enforces a token-bucket rate limiter:

- **Threshold**: 3 consecutive invalid code attempts from an IP address.
- **Lockout Duration**: 15 minutes.
- **Response**: `SignalingMessage::Error { code: "RATE_LIMITED", message: "..." }`.

### Operational Note on Reverse Proxies
When hosted on Render, the inbound client IP is derived from the socket connection info or reverse proxy headers. If you suspect false-positive lockouts, check container logs for repeated failed join requests:
```text
WARN client_ip="203.0.113.42" rate_limit: "3 consecutive invalid code attempts recorded; IP locked out for 15m"
```

---

## 4. Common Troubleshooting Scenarios

### Issue 1: "Unable to establish WebSocket connection with signaling server"
- **Symptom**: Web client displays a red disconnection warning immediately upon entering a code.
- **Causes**:
  1. Mixed content: The web client was loaded over `https://`, but `VITE_SIGNALING_URL` was configured with `ws://` instead of `wss://`.
  2. Incorrect hostname: `VITE_SIGNALING_URL` points to an incorrect or inactive Render service URL.
  3. Render service sleeping: Free-tier Render web services spin down after 15 minutes of inactivity; initial wake-up may take 30-45 seconds.
- **Resolution**:
  1. Ensure `VITE_SIGNALING_URL` starts with `wss://`.
  2. Verify signaling health with `curl https://<signaling-url>/health`.

### Issue 2: "Pairing code not found, unavailable or expired"
- **Symptom**: Web client returns error when attempting to pair with a freshly shared code.
- **Causes**:
  1. The 5-minute session TTL expired before the viewer entered the code.
  2. The host agent was stopped or lost its network connection.
  3. Visual typo: Crockford Base32 visual lookalikes (`0`/`O` and `1`/`I`/`L`) are normalized automatically, but other invalid characters (`U`, `@`, `#`) cause immediate rejection.
- **Resolution**:
  Generate a new session on the host with `shellvyn share`.

### Issue 3: Host declines connection request
- **Symptom**: Viewer receives `PairReject` with "Host declined connection request".
- **Causes**:
  1. The host operator declined the interactive `[y/N]` prompt or typed `n`.
  2. The 30-second approval timeout expired on the host terminal without input.
- **Resolution**:
  Ensure the host operator is actively viewing their terminal and approves the prompt promptly, or pass `--auto-accept` if running in an automated, secure private environment.
