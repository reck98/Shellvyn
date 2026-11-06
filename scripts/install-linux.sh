#!/usr/bin/env bash
# Shellvyn Host Agent Installer for Linux
# Repository: https://github.com/reck98/Shellvyn
# Usage: curl -fsSL https://raw.githubusercontent.com/reck98/Shellvyn/main/scripts/install-linux.sh | bash
set -euo pipefail

REPO="reck98/Shellvyn"
BIN_NAME="shellvyn"

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}==>${NC} ${BOLD}Installing Shellvyn Host Agent for Linux...${NC}"

# 1. Detect Architecture
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64)
    TARGET_ARCH="x86_64"
    ;;
  aarch64|arm64)
    TARGET_ARCH="aarch64"
    ;;
  *)
    echo -e "${RED}Error: Unsupported Linux architecture: $ARCH${NC}"
    echo "Shellvyn supports x86_64 and aarch64 on Linux."
    exit 1
    ;;
esac

ASSET_NAME="shellvyn-linux-${TARGET_ARCH}.tar.gz"
DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/${ASSET_NAME}"

echo -e "${BLUE}==>${NC} Detected architecture: ${BOLD}Linux ${TARGET_ARCH}${NC}"
echo -e "${BLUE}==>${NC} Downloading ${ASSET_NAME} from GitHub Releases..."

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

# 2. Download release asset or fallback to source build
if ! curl -fsSL "$DOWNLOAD_URL" -o "$TMP_DIR/$ASSET_NAME" 2>/dev/null; then
  echo -e "${YELLOW}Notice: Direct GitHub release asset download not found yet.${NC}"
  if command -v cargo >/dev/null 2>&1; then
    echo -e "${BLUE}==>${NC} Building shellvyn-agent using Cargo from repository..."
    cargo install --git "https://github.com/${REPO}.git" shellvyn-agent
    echo -e "${GREEN}✓ Shellvyn successfully installed via Cargo!${NC}"
    echo -e "Run '${GREEN}shellvyn share${NC}' to begin terminal sharing."
    exit 0
  else
    echo -e "${RED}Error: Could not download binary asset and Cargo is not installed.${NC}"
    echo "Please visit https://github.com/${REPO}/releases to download manually."
    exit 1
  fi
fi

# 3. Extract Archive
tar -xzf "$TMP_DIR/$ASSET_NAME" -C "$TMP_DIR"

# 4. Determine Destination Directory (non-root safe)
if [ "$(id -u)" -eq 0 ]; then
  INSTALL_DIR="/usr/local/bin"
else
  INSTALL_DIR="$HOME/.local/bin"
fi
mkdir -p "$INSTALL_DIR"

# Find binary in extracted directory (handling shellvyn or shellvyn-agent name)
if [ -f "$TMP_DIR/$BIN_NAME" ]; then
  cp "$TMP_DIR/$BIN_NAME" "$INSTALL_DIR/$BIN_NAME"
elif [ -f "$TMP_DIR/shellvyn-agent" ]; then
  cp "$TMP_DIR/shellvyn-agent" "$INSTALL_DIR/$BIN_NAME"
else
  FOUND_BIN="$(find "$TMP_DIR" -type f -name "shellvyn*" | head -n 1)"
  if [ -n "$FOUND_BIN" ]; then
    cp "$FOUND_BIN" "$INSTALL_DIR/$BIN_NAME"
  else
    echo -e "${RED}Error: Binary not found inside extracted archive.${NC}"
    exit 1
  fi
fi

chmod +x "$INSTALL_DIR/$BIN_NAME"

echo -e "${GREEN}✓ Successfully installed ${BIN_NAME} to ${INSTALL_DIR}/${BIN_NAME}${NC}"

# 5. Check PATH environment variable
if ! echo "$PATH" | tr ':' '\n' | grep -qx "$INSTALL_DIR"; then
  echo ""
  echo -e "${YELLOW}Note: ${INSTALL_DIR} is not in your current PATH.${NC}"
  echo -e "To make 'shellvyn' accessible globally, add this to your ${BOLD}~/.bashrc${NC} or ${BOLD}~/.zshrc${NC}:"
  echo -e "  ${BOLD}export PATH=\"\$PATH:${INSTALL_DIR}\"${NC}"
  echo ""
fi

echo -e "╔════════════════════════════════════════════════════════════╗"
echo -e "║             SHELLVYN HOST AGENT READY                      ║"
echo -e "╠════════════════════════════════════════════════════════════╣"
echo -e "║  Run command: ${GREEN}shellvyn share${NC}                               ║"
echo -e "║  Help:        ${BLUE}shellvyn --help${NC}                              ║"
echo -e "╚════════════════════════════════════════════════════════════╝"
echo ""
