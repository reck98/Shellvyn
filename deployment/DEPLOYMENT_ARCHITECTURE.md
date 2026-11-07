# Shellvyn Deployment Architecture

**Target Platform:** Render Cloud Platform  
**Configuration Interface:** Render Blueprint (`render.yaml`)  
**Architecture Model:** Decoupled Edge Static Site + Dockerized WebSocket Relay + Distributed Native Agents

---

## 1. System Topology Overview

Shellvyn uses a decoupled, hybrid architecture designed for minimal latency, secure communication, and zero port-forwarding requirements on user machines:

```mermaid
flowchart TD
    subgraph Users["Distributed User Machines (No Inbound Ports)"]
        Host["Host Developer Machine\n(Windows ConPTY / Linux openpty)\nshellvyn-agent binary"]
        Viewer["Remote Viewer Browser\nChrome / Firefox / Edge / Safari\nhttps://shellvyn.reck98.in"]
    end

    subgraph Render["Render Cloud Infrastructure"]
        subgraph StaticCDN["Render Edge CDN"]
            WebSite["shellvyn-web\nStatic Site (React 19 + Vite)\nHigh-DPI Terminal Assets"]
        end

        subgraph ContainerEnv["Render Web Service (Docker)"]
            Proxy["Render TLS Edge\n(Reverse Proxy & WSS Terminator)"]
            Signaling["shellvyn-signaling\nRust Axum Daemon (Port: $PORT)\n- DashMap Session Registry\n- Token-Bucket Rate Limiter\n- Encrypted Relay Multiplexer"]
        end
    end

    Viewer -- "1. Load Web App (HTTPS)" --> WebSite
    Host -- "2. Register Session (WSS /ws)" --> Proxy
    Viewer -- "3. Pair & Join (WSS /ws)" --> Proxy
    Proxy -- "Internal HTTP/WS" --> Signaling
    Host <-. "4. Encrypted Terminal Stream (RelayData Frames) <br> ChaCha20-Poly1305 .->" Viewer
```

---

## 2. Infrastructure Components

### Component 1: `shellvyn-signaling` (Render Web Service)
- **Runtime**: Docker (Multi-stage Debian bookworm-slim base, non-root user `10001:10001`).
- **Core Functionality**:
  - Ephemeral registration for 8-character Crockford Base32 codes.
  - Active session matching using concurrent in-memory `DashMap`.
  - Rate-limited authorization (15-minute lockout on 3 invalid join attempts).
  - Encrypted `RelayData` frame forwarding over WebSocket.
- **Network Interface**:
  - Binds to `0.0.0.0:${PORT}` (Render assigns an ephemeral port, default 10000).
  - Edge reverse proxy terminates TLS, presenting valid public certificates for `wss://<service>.onrender.com/ws`.
  - Exposes `/health` returning JSON `{"status": "healthy", ...}` for zero-downtime rolling deploys.

### Component 2: `shellvyn-web` (Render Static Site)
- **Runtime**: Render Managed Static CDN.
- **Build Pipeline**: `npm ci && npm run build` producing optimized assets in `web/dist`.
- **Core Functionality**:
  - Pre-rendered Single Page Application (SPA) with rewrite rules (`/* -> /index.html`).
  - Terminal emulator via `@xterm/xterm` and hardware-accelerated WebGL addon.
  - Client-side encryption engine via `@noble/ciphers` and `@noble/hashes`.
- **Signaling Endpoint Binding**:
  - Configured at build time via `VITE_SIGNALING_URL=wss://<signaling-service>.onrender.com/ws`.
  - Falls back dynamically to current origin with `wss:` protocol when deployed under custom domains.

### Component 3: Distributed Native Agents (Host Machines)
- **Execution Target**: Developer workstations running Windows 10/11 or Linux distributions.
- **Design Principle**: **Never deployed to cloud infrastructure**. Terminal processes (ConPTY / POSIX PTY) execute locally on user hardware.
- **Outbound Connectivity**: Initiates an outbound WebSocket connection to the Render signaling service; requires zero firewall modifications, NAT traversal, or open inbound ports.

---

## 3. Communication & Data Flow

1. **Host Session Creation**:
   - Developer runs `shellvyn share --server wss://shellvyn-signaling.onrender.com/ws`.
   - Host establishes an outbound TLS WebSocket session to `/ws`.
   - Host sends `SignalingMessage::Register`.
   - Relay registers session in memory with a 5-minute (300s) TTL.
2. **Viewer Discovery & Pairing**:
   - Viewer loads `https://shellvyn.reck98.in/#KV7M-9X2P`.
   - Viewer connects outbound to `wss://shellvyn-signaling.onrender.com/ws`.
   - Viewer sends `SignalingMessage::Join { code }`.
3. **Authorization & Key Exchange**:
   - Relay verifies rate limit and forwards `PairRequest` to the Host.
   - Host prompts user: `Approve connection from <remote_ip>? [y/N]`.
   - Upon approval, Host sends `PairAccept`.
   - Both parties derive session keys and begin bidirectional streaming of encrypted frames.
4. **Relay Multiplexing**:
   - The relay routes opaque `SignalingMessage::RelayData` frames between Host and Viewer.
   - If either party disconnects, the in-memory session entry is evicted immediately.

---

## 4. Scaling Model & In-Memory Constraints

In the initial production phase:
- **Single Instance**: The signaling service runs as 1 instance on Render.
- **In-Memory DashMap**: Session state is held in process RAM. No external database or cache is required.
- **Restart Impact**: A service redeployment or container restart terminates active sessions; clients automatically attempt reconnection.
- **Horizontal Scaling Path (Future)**: When concurrent sessions exceed a single instance's capacity (approx. 10,000 active connections per GB RAM), Redis Pub/Sub or a NATS message broker will be introduced to coordinate session channels across multiple signaling nodes.
