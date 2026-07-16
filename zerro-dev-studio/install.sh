#!/usr/bin/env bash
# Install Zerro Dev Studio local CLI (real bash / git / fs agent).
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Benjamin5607/zerro_ai_landing/main/zerro-dev-studio/install.sh | bash
#   Or: bash install.sh
set -euo pipefail

REPO_URL="${ZERRO_REPO_URL:-https://github.com/Benjamin5607/zerro_ai_landing.git}"
BRANCH="${ZERRO_BRANCH:-main}"
PREFIX="${ZERRO_INSTALL_DIR:-$HOME/.zerro}"
PKG_DIR="$PREFIX/dev-studio"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   Zerro Dev Studio — local install           ║"
echo "║   Real bash · git · filesystem agent         ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js 18+ is required. Install from https://nodejs.org"
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "❌ Node.js 18+ required (found $(node -v))"
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "❌ git is required"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "❌ npm is required"
  exit 1
fi

mkdir -p "$PREFIX"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "→ Cloning $REPO_URL ($BRANCH)…"
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$TMP/landing"

echo "→ Installing package into $PKG_DIR…"
rm -rf "$PKG_DIR"
mkdir -p "$PKG_DIR"
cp -R "$TMP/landing/zerro-dev-studio/." "$PKG_DIR/"
cd "$PKG_DIR"
npm install --omit=dev >/dev/null 2>&1 || true

BIN_DIR="$PREFIX/bin"
mkdir -p "$BIN_DIR"
ln -sf "$PKG_DIR/bin/zerro-dev.mjs" "$BIN_DIR/zerro-dev"
ln -sf "$PKG_DIR/bin/zerro-dev.mjs" "$BIN_DIR/zerro"
chmod +x "$PKG_DIR/bin/zerro-dev.mjs" "$BIN_DIR/zerro-dev" "$BIN_DIR/zerro"

# Ensure PATH hint
SHELL_RC=""
case "${SHELL:-}" in
  */zsh) SHELL_RC="$HOME/.zshrc" ;;
  */bash) SHELL_RC="$HOME/.bashrc" ;;
  *) SHELL_RC="$HOME/.profile" ;;
esac

PATH_LINE='export PATH="$HOME/.zerro/bin:$PATH"'
if [ -n "$SHELL_RC" ] && [ -f "$SHELL_RC" ]; then
  if ! grep -q '\.zerro/bin' "$SHELL_RC" 2>/dev/null; then
    echo "" >> "$SHELL_RC"
    echo "# Zerro Dev Studio" >> "$SHELL_RC"
    echo "$PATH_LINE" >> "$SHELL_RC"
    echo "→ Added PATH to $SHELL_RC"
  fi
fi

echo ""
echo "✅ Installed: zerro-dev → $BIN_DIR/zerro-dev"
echo ""
echo "Next:"
echo "  1. export PATH=\"\$HOME/.zerro/bin:\$PATH\"   # or open a new terminal"
echo "  2. zerro-dev ollama connect   # local Ollama one-click"
echo "     OR export GROQ_API_KEY=…   # cloud API"
echo "  3. cd your-project && zerro-dev"
echo ""
echo "Windows (no bash):"
echo "  irm https://raw.githubusercontent.com/Benjamin5607/zerro_ai_landing/main/zerro-dev-studio/install.ps1 | iex"
echo ""
echo "One-shot:  zerro-dev \"add README and fix lint\""
echo "Web IDE:   https://zerroai.space  (browser Dev Studio)"
echo "Docs:      https://github.com/Benjamin5607/zerro_ai_landing#zerro-dev-studio-local"
echo ""
