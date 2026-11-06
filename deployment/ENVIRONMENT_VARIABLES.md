# Shellvyn Environment Variables Reference

This document catalogs all environment variables supported by Shellvyn across backend signaling services, the frontend web application, and native host agents.

---

## 1. Signaling & Relay Server (`shellvyn-signaling`)

These variables configure the Axum server process when running standalone, inside Docker, or on Render:

| Variable | Type | Default | Required? | Description & Production Guidance |
| :--- | :---: | :---: | :---: | :--- |
| `PORT` | `u16` | `8080` | Optional | Port on which the HTTP health check and WebSocket server listen. On Render and Heroku, this is injected automatically. |
| `RUST_LOG` | `string` | `info` | Optional | Tracing filter directive (e.g. `info,shellvyn_signaling=debug`). Controls logging verbosity. Do not use `trace` in production to prevent high log volume. |
| `RUST_BACKTRACE` | `0` or `1` | `0` | Optional | Set to `1` to enable full stack traces in stderr upon an unhandled panic. |

---

## 2. Web Client (`shellvyn-web`)

These variables configure Vite and React at build time:

| Variable | Type | Default | Required? | Description & Production Guidance |
| :--- | :---: | :---: | :---: | :--- |
| `VITE_SIGNALING_URL` | `string` | Dynamic | **Recommended** | The WebSocket URL for the signaling service (e.g. `wss://shellvyn-signaling.onrender.com/ws`). <br><br>• In production: Must begin with `wss://` to avoid mixed-content blocking on HTTPS pages.<br>• In local development: Defaults to `ws://localhost:8080/ws` if unset. |

---

## 3. Host Agent (`shellvyn-agent`)

The native agent is driven primarily via CLI arguments (`shellvyn share`, `shellvyn local`), but also respects the following environment variables:

| Variable | Type | Default | Required? | Description |
| :--- | :---: | :---: | :---: | :--- |
| `SHELLVYN_SERVER` | `string` | `ws://127.0.0.1:8080/ws` | Optional | Default signaling server URL when `--server` is not explicitly supplied on the command line. |
| `COMPUTERNAME` / `HOSTNAME` | `string` | `unknown-host` | Optional | Host machine identification string broadcast in `SignalingMessage::Register`. Injected automatically by Windows and POSIX shells. |
| `RUST_LOG` | `string` | `info` | Optional | Controls native agent diagnostic logging output. |

---

## 4. Render Blueprint Configuration Matrix

When deploying via `render.yaml`, variables are mapped as follows:

```yaml
# Service 1: shellvyn-signaling
envVars:
  - key: PORT
    value: 10000
  - key: RUST_LOG
    value: info,shellvyn_signaling=info

# Service 2: shellvyn-web
envVars:
  - key: VITE_SIGNALING_URL
    value: wss://shellvyn-signaling.onrender.com/ws
```
