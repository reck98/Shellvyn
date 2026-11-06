# Technology Decisions & Trade-Off Matrix

## 1. Overview

This document formalizes the key engineering technology decisions for **Shellvyn**, evaluating the trade-offs of candidate technologies against the reference product (Skyping) and project requirements.

---

## 2. Decision 1: Host Agent Programming Language

### Candidate Options
1. **Rust** (*Selected*)
2. **Go** (*Skyping's Choice*)
3. **C++ (C++20)**

### Trade-Off Matrix

| Dimension | Rust (Selected) | Go (Skyping) | C++20 |
| :--- | :--- | :--- | :--- |
| **Native ConPTY Ergonomics** | **High**: `windows-sys` provides direct, safe, zero-overhead Win32 bindings. | **Low**: Requires CGO or raw `syscall` pointers; awkward error handling. | **High**: First-class Windows API support, but lacks memory safety guarantees. |
| **Linux POSIX PTY Ergonomics** | **High**: `nix` crate provides safe POSIX bindings (`openpty`, `termios`, `ioctl`). | **High**: `creack/pty` works well on Linux/macOS. | **High**: Direct libc calls, but requires manual memory and FD management. |
| **Binary Footprint** | **~4–6 MiB** (Static binary, LTO, `opt-level = "z"`). | **~11.7 MiB** (Embedded Go runtime, GC, reflection). | **~3–5 MiB** (Static MSVC / GCC). |
| **Memory & Thread Overhead** | Zero-cost abstractions, multi-threaded Tokio reactor. | Green goroutines with M:N scheduler (small overhead). | Manual threading, risk of race conditions and memory safety bugs. |
| **Cross-Compilation** | Seamless via `cargo cross` / `cross-rs`. | Seamless via `GOOS=windows GOARCH=amd64`. | Complex CMake / toolchain configurations. |

### Decision
**Adopt Rust**. Rust guarantees memory safety and concurrency safety while giving Shellvyn first-class access to low-level Windows ConPTY structures without CGO complexity or garbage collector latency spikes.

---

## 3. Decision 2: Web Client Architecture

### Candidate Options
1. **React 19 + TypeScript + Vite** (*Selected*)
2. **Next.js (App Router)** (*Skyping's Choice*)
3. **Vanilla JavaScript / Web Components**

### Trade-Off Matrix

| Dimension | React + Vite (Selected) | Next.js (Skyping) | Vanilla JS |
| :--- | :--- | :--- | :--- |
| **Application Type** | Client-side Single Page Application (SPA). | Hybrid SSR / Server Components. | Lightweight SPA. |
| **Server Requirement** | Completely static; can be served from S3, Cloudflare Pages, GitHub Pages, or embedded in host agent. | Requires Node.js server or Cloudflare OpenNext worker adapter. | Completely static. |
| **Terminal Canvas Integration** | Simple client-side lifecycle mounting with React 19 `useRef` and `useEffect`. | Complex hydration workarounds (`"use client"`, dynamic import `ssr: false`). | Direct DOM manipulation. |
| **Bundle Size & Load Speed** | Minimal (< 300 KiB gzip total). | Heavy due to Next.js router runtime (> 600 KiB). | Minimal (< 100 KiB). |
| **State Management** | Clean declarative hooks (`useTransport`, `useTerminal`). | Server component / client boundary separation. | Imperative spaghetti as state grows. |

### Decision
**Adopt React 19 + TypeScript + Vite**. The Shellvyn web viewer is an interactive, stateful client that talks directly to WebSockets and WebRTC. SSR provides no value to an authenticated terminal stream, while Vite allows Shellvyn to be distributed as a static artifact or even embedded directly into the host binary's local HTTP server.

---

## 4. Decision 3: Terminal Canvas Engine

### Candidate Options
1. **`@xterm/xterm` (xterm.js)** (*Selected*)
2. **Custom HTML5 Canvas Renderer**
3. **DOM Pre/Code Elements**

### Trade-Off Matrix

| Dimension | xterm.js (Selected) | Custom Canvas | DOM `<pre>` Elements |
| :--- | :--- | :--- | :--- |
| **VT100 / ANSI Compatibility** | **Industry Gold Standard**: Complete DEC VT100/VT220/VT520, true-color 24-bit, alternate screen buffer, bracketed paste. | Low: Re-implementing a terminal emulator requires years of edge-case handling. | Very Low: Breaks on cursor positioning, escape sequences, and full-screen TUI apps. |
| **Performance** | WebGL 2 hardware acceleration via `@xterm/addon-webgl` (60fps on massive logs). | Requires custom WebGL shader pipeline. | Very Poor: DOM layout thrashing on fast terminal output. |
| **Addon Ecosystem** | Fit addon, search addon, image addon, canvas addon, serialize addon. | None. | None. |

### Decision
**Adopt `@xterm/xterm` (xterm.js)** with `@xterm/addon-fit` and `@xterm/addon-webgl`.

---

## 5. Decision 4: WebRTC DataChannel Engine (Host Agent)

### Candidate Options
1. **`webrtc-rs`** (*Selected*)
2. **`libdatachannel` (C++ with Rust bindings)**
3. **Pion WebRTC (Go)**

### Decision
**Adopt `webrtc-rs`**. `webrtc-rs` is an active, pure-Rust implementation of the WebRTC stack modeled directly after Pion (which Skyping uses). It integrates natively into Tokio's asynchronous event loop, eliminating external C++ compilation dependencies.

---

## 6. Decision 5: Cryptographic Suite for E2EE

### Candidate Options
1. **ChaCha20-Poly1305** (*Selected*)
2. **AES-256-GCM**

### Decision
**Adopt ChaCha20-Poly1305 with AES-256-GCM fallback**.
- **Rationale**: ChaCha20-Poly1305 is natively supported by both Rust (`chacha20poly1305` crate) and the Web Crypto API. It provides constant-time performance across all CPU architectures (including ARM devices without AES hardware acceleration) and guarantees authenticated encryption with zero side-channel leakage.
