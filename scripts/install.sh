#!/usr/bin/env bash
# Shellvyn Host Agent Installer (Universal Linux / macOS)
# Usage: curl -fsSL https://raw.githubusercontent.com/reck98/Shellvyn/main/scripts/install.sh | bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
if [ -f "$SCRIPT_DIR/install-linux.sh" ]; then
  exec bash "$SCRIPT_DIR/install-linux.sh" "$@"
else
  exec bash -c "$(curl -fsSL https://raw.githubusercontent.com/reck98/Shellvyn/main/scripts/install-linux.sh)" -- "$@"
fi
