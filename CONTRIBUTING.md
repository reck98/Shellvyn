# Contributing to Shellvyn

Thank you for your interest in contributing to **Shellvyn**! Shellvyn is an independent, open-source terminal sharing platform designed for cross-platform reliability, low latency, and zero-knowledge end-to-end security.

---

## 1. Clean-Room Implementation Principle

Shellvyn is developed strictly using public specifications, RFC standards, and observable network/PTY behaviors.
- **Do not** decompile, reverse-engineer, copy, or contribute proprietary code or assets from reference proprietary products.
- All code contributed to Shellvyn must be your original work and compatible with the project's dual MIT / Apache-2.0 license.

---

## 2. Development Prerequisites

Ensure your development environment meets the following baseline:

- **Rust Toolchain**: Rust 1.80+ (`stable` toolchain with `cargo` and `rustfmt`).
  - *Windows*: Visual Studio C++ Build Tools or 64-bit MinGW toolchain (`w64devkit` recommended).
  - *Linux*: `build-essential`, `gcc`, `glibc-devel`.
- **Node.js**: Node.js 20.x or 22.x LTS and npm 10.x+.
- **Git**: Modern Git client with Conventional Commit conventions.

---

## 3. Repository Architecture

The project is structured as a Cargo workspace with an accompanying Vite web client:

```
Shellvyn/
├── crates/
│   ├── shellvyn-core/       # Protocols, wire framing v2, ChaCha20-Poly1305 E2EE, Crockford Base32
│   ├── shellvyn-pty/        # Cross-platform PTY abstraction (Windows ConPTY + Linux POSIX openpty)
│   ├── shellvyn-signaling/  # Axum WebSocket signaling server & session registry
│   └── shellvyn-agent/      # Native host CLI agent (`share`, `local`, `test-pty`)
├── web/                     # React 19 + TypeScript + Vite + Tailwind CSS v4 + @xterm/xterm
├── architecture/            # Engineering specifications and protocol designs
└── investigation/           # Background technical analyses
```

---

## 4. Local Development Workflow

### Setting up the Rust Workspace
```bash
# Clone the repository
git clone https://github.com/reck98/Shellvyn.git
cd Shellvyn

# Verify compilation across all workspace crates
cargo check --workspace

# Run all automated unit and integration tests
cargo test --workspace
```

### Setting up the Web Client
```bash
cd web
npm install

# Start local Vite development server
npm run dev

# Verify TypeScript compilation and production build
npm run build
```

### Running Self-Test Diagnostics
```bash
# Test the local PTY subsystem
cargo run -p shellvyn-agent -- test-pty

# Run the local loopback server
cargo run -p shellvyn-agent -- local --port 3000
```

---

## 5. Coding Standards & Conventions

### Rust
- Format all code with `cargo fmt --check` before committing.
- Ensure zero compiler warnings and run `cargo clippy --workspace --all-targets`.
- Preserve explicit error handling (`Result<T, E>`) and avoid unwrap in production code paths.
- Win32 raw handles must always be wrapped in safe abstractions (`SafeHandle`).

### TypeScript / React
- Strict TypeScript (`"strict": true`, `"erasableSyntaxOnly": true`).
- Use `const` objects and mapped types instead of legacy TypeScript `enum`s.
- Clean component separation with Tailwind utility classes.

### Commit Messages
Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `feat(scope): add feature description`
- `fix(scope): resolve bug description`
- `docs(scope): update documentation`
- `test(scope): add unit or integration test`
- `refactor(scope): optimize internal logic`

---

## 6. Pull Request Checklist

Before submitting a Pull Request:
1. [ ] Branch created from latest `main` (`git checkout -b feature/my-feature`).
2. [ ] All workspace tests pass (`cargo test --workspace`).
3. [ ] Web client builds without TypeScript errors (`npm --prefix web run build`).
4. [ ] Documentation updated in `README.md` or relevant architecture files.
5. [ ] Relevant test cases added for new functionality or bug fixes.
