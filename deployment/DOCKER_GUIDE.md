# Shellvyn Docker Infrastructure & Local Testing Guide

This guide details how to build, test, and run the containerized Shellvyn Signaling Service locally and in container orchestration environments.

---

## 1. Dockerfile Architecture

The production Dockerfile located at the root of the repository ([`Dockerfile`](../Dockerfile)) is a hardened, multi-stage build:

### Stage 1: Build Layer (`rust:1.85-slim-bookworm`)
- Uses official minimal Rust compiler images.
- Implements Cargo dependency caching using workspace manifest skeletons to avoid re-compiling external crates on source-only changes.
- Compiles exclusively the signaling server binary:
  ```bash
  cargo build --release --package shellvyn-signaling --bin shellvyn-signaling
  ```
- Strips debug symbols with `strip` to minimize binary footprint (yielding a ~12 MB binary).

### Stage 2: Runtime Layer (`debian:bookworm-slim`)
- Minimal attack surface (~75 MB total image size).
- Includes only system root CA certificates (`ca-certificates`) and `curl` for container health monitoring.
- Runs under a dedicated, unprivileged non-root service account (`shellvyn`, UID `10001`, GID `10001`).
- Binds to `0.0.0.0:${PORT}` and handles `SIGTERM` process termination signals gracefully.

---

## 2. Building the Docker Image

Build the production signaling image locally:

```bash
docker build -t shellvyn-signaling:latest .
```

Verify image size and security attributes:
```bash
docker images shellvyn-signaling:latest
```

---

## 3. Running the Container

### Standalone Container Run
```bash
docker run -d \
  --name shellvyn-signaling \
  -p 8080:8080 \
  -e PORT=8080 \
  -e RUST_LOG=info,shellvyn_signaling=debug \
  --restart unless-stopped \
  shellvyn-signaling:latest
```

### Verify Container Health
```bash
curl -i http://127.0.0.1:8080/health
```

### Inspect Container Logs
```bash
docker logs -f shellvyn-signaling
```

### Stop and Clean Up
```bash
docker stop shellvyn-signaling
docker rm shellvyn-signaling
```

---

## 4. Local Testing with Docker Compose

A developer configuration is provided in [`docker-compose.yml`](../docker-compose.yml) to run the signaling service and the web frontend together:

```bash
docker compose up -d
```

### Services Started:
1. `shellvyn-signaling` listening on `http://localhost:8080` (healthcheck on `/health`).
2. `shellvyn-web` serving the React 19 frontend on `http://localhost:5173`.

### Full Integration Test Workflow:
1. Start the containerized stack:
   ```bash
   docker compose up -d
   ```
2. Run the native host agent on your workstation:
   ```bash
   cargo run -p shellvyn-agent -- share --server ws://127.0.0.1:8080/ws
   ```
3. Open `http://localhost:5173` in your browser.
4. Enter the generated pairing code.
5. Approve the connection on your host terminal.
6. Verify live terminal streaming through the local Docker container!

To stop the services:
```bash
docker compose down
```
