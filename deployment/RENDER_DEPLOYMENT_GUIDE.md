# Shellvyn Render Blueprint Deployment Guide

This guide walks you through deploying Shellvyn to Render using the Infrastructure as Code (IaC) Blueprint defined in [`render.yaml`](../render.yaml).

---

## 1. Prerequisites

1. A [Render Account](https://dashboard.render.com/).
2. A GitHub account with access to the [Shellvyn Repository](https://github.com/reck98/Shellvyn).
3. The repository branch `main` ready with `render.yaml` and `Dockerfile`.

---

## 2. Deploying via Render Blueprint (Recommended)

Render Blueprints automatically parse `render.yaml` to provision both the Dockerized signaling server and the static web client in one click.

### Step 1: Create a New Blueprint Instance
1. Log in to the [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** in the upper right corner and select **Blueprint**.
3. Connect your GitHub account and select the **`Shellvyn`** repository.
4. Select the branch: **`main`**.
5. Render will automatically detect and parse [`render.yaml`](../render.yaml).

### Step 2: Review Discovered Services
Render will display the Blueprint plan with two managed services:
- **`shellvyn-signaling`**: Docker Web Service running the Rust signaling and relay daemon.
- **`shellvyn-web`**: Static Site building the React 19 web terminal client.

### Step 3: Apply the Blueprint
1. Click **Apply**.
2. Render will trigger parallel build jobs:
   - Compiling the Docker image for `shellvyn-signaling` and verifying `/health`.
   - Running `npm ci && npm run build` for `shellvyn-web` and distributing assets to the global CDN.
3. Once deployed, Render assigns the public URLs:
   - Signaling Service: `https://shellvyn-signaling.onrender.com` (WebSocket: `wss://shellvyn-signaling.onrender.com/ws`)
   - Web Client: `https://shellvyn.reck98.in` (custom domain mapped to `shellvyn-web.onrender.com`)

---

## 3. Environment Variable Configuration

The Blueprint automatically sets default environment variables. You can review or customize them in the Render Dashboard:

### For `shellvyn-signaling` (Docker Web Service)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `10000` | Port assigned by Render for inbound HTTP/WS traffic. |
| `RUST_LOG` | `info,shellvyn_signaling=info` | Tracing log filter level. Set to `debug` for troubleshooting. |

### For `shellvyn-web` (Static Site)
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_SIGNALING_URL` | `wss://shellvyn-signaling.onrender.com/ws` | Production WebSocket endpoint for viewer client pairing. |

> [!NOTE]
> If your Render signaling service has a customized service name or custom domain, update `VITE_SIGNALING_URL` under **shellvyn-web > Environment** and trigger a manual re-deploy.

---

## 4. Validating the Deployment

### 1. Test Signaling Health Endpoint
Run in your local terminal:
```bash
curl -i https://shellvyn-signaling.onrender.com/health
```
**Expected Response:**
```http
HTTP/2 200
content-type: application/json
content-length: 68

{"service":"shellvyn-signaling","status":"healthy","version":"0.1.0"}
```

### 2. Test WebSocket Endpoint Handshake
Test the secure WebSocket endpoint using `wscat` or `curl`:
```bash
npx wscat -c wss://shellvyn-signaling.onrender.com/ws
```
**Expected Outcome:** Successful handshake without TLS or 404 errors.

### 3. Share Terminal from Local Agent
On your workstation (Windows or Linux), launch a sharing session targeting the Render signaling server:
```bash
shellvyn share --server wss://shellvyn-signaling.onrender.com/ws
```
The CLI will output an active session box with a pairing code (e.g. `KV7M-9X2P`).

### 4. Connect from Web Client
1. Open `https://shellvyn.reck98.in/` in your browser.
2. Enter the pairing code.
3. Approve the connection prompt on your workstation terminal.
4. Interact with your live terminal directly from the browser tab!

---

## 5. Operations & Maintenance

### Zero-Downtime Rolling Deploys
- Render monitors the `/health` endpoint on the new container before redirecting traffic.
- Render sends `SIGTERM` to the old container, allowing active connections to close gracefully.

### Rollback Procedure
If a bad build or regression occurs:
1. Navigate to **Dashboard > shellvyn-signaling > Deploys**.
2. Find the previous stable build commit.
3. Click **Rollback to this deploy**.
4. Repeat for **shellvyn-web** if frontend changes were involved.
