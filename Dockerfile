# ==============================================================================
# Shellvyn Signaling & Relay Server — Production Multi-Stage Dockerfile
# ==============================================================================
# Stage 1: Build stage (compile optimized release binary for shellvyn-signaling)
# ==============================================================================
FROM rust:1.85-slim-bookworm AS builder

WORKDIR /usr/src/shellvyn

# Install essential compilation dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace configuration and lockfile for dependency caching
COPY Cargo.toml Cargo.lock* ./
COPY crates/shellvyn-core/Cargo.toml crates/shellvyn-core/Cargo.toml
COPY crates/shellvyn-pty/Cargo.toml crates/shellvyn-pty/Cargo.toml
COPY crates/shellvyn-signaling/Cargo.toml crates/shellvyn-signaling/Cargo.toml
COPY crates/shellvyn-agent/Cargo.toml crates/shellvyn-agent/Cargo.toml

# Create dummy source files for cargo dependency caching layer
RUN mkdir -p crates/shellvyn-core/src && echo "pub fn dummy() {}" > crates/shellvyn-core/src/lib.rs && \
    mkdir -p crates/shellvyn-pty/src && echo "pub fn dummy() {}" > crates/shellvyn-pty/src/lib.rs && \
    mkdir -p crates/shellvyn-signaling/src && echo "pub fn dummy() {}" > crates/shellvyn-signaling/src/lib.rs && \
    echo "fn main() {}" > crates/shellvyn-signaling/src/main.rs && \
    mkdir -p crates/shellvyn-agent/src && echo "pub fn dummy() {}" > crates/shellvyn-agent/src/lib.rs && \
    echo "fn main() {}" > crates/shellvyn-agent/src/main.rs

# Build dependencies only (cached until Cargo.lock or Cargo.toml changes)
RUN cargo build --release --package shellvyn-signaling --bin shellvyn-signaling || true

# Copy actual source files
COPY crates/shellvyn-core/src crates/shellvyn-core/src
COPY crates/shellvyn-pty/src crates/shellvyn-pty/src
COPY crates/shellvyn-signaling/src crates/shellvyn-signaling/src
COPY crates/shellvyn-agent/src crates/shellvyn-agent/src

# Ensure timestamp update on sources so cargo rebuilds the real crate
RUN touch crates/shellvyn-core/src/lib.rs \
    crates/shellvyn-signaling/src/lib.rs \
    crates/shellvyn-signaling/src/main.rs

# Build final production binary with strip/LTO optimizations
RUN cargo build --release --package shellvyn-signaling --bin shellvyn-signaling && \
    strip /usr/src/shellvyn/target/release/shellvyn-signaling

# ==============================================================================
# Stage 2: Minimal hardened runtime stage
# ==============================================================================
FROM debian:bookworm-slim AS runtime

# Install TLS root certificates and curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated non-root service user and group
RUN groupadd -g 10001 shellvyn && \
    useradd -u 10001 -g shellvyn -s /sbin/nologin -M shellvyn

# Copy compiled binary from builder
COPY --from=builder /usr/src/shellvyn/target/release/shellvyn-signaling /usr/local/bin/shellvyn-signaling

# Security hardening: ensure binary is read-only executable
RUN chmod 0755 /usr/local/bin/shellvyn-signaling && \
    chown root:root /usr/local/bin/shellvyn-signaling

USER shellvyn:shellvyn

# Default runtime configuration
ENV PORT=8080 \
    RUST_LOG=info,shellvyn_signaling=debug

EXPOSE 8080

# Container healthcheck using the native /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://127.0.0.1:${PORT}/health || exit 1

STOPSIGNAL SIGTERM

ENTRYPOINT ["/usr/local/bin/shellvyn-signaling"]
