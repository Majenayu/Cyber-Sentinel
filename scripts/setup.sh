#!/bin/bash
# CyberSentinel auto-setup — runs on first boot / any import.
# This means you never need agent credits just to install dependencies.

set -e

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║       CyberSentinel — Auto Setup             ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# 1. Install / sync all workspace dependencies
echo "▶ Installing dependencies (pnpm install)..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
echo "✓ Dependencies ready."
echo ""

# 2. Print required-secrets reminder (only if they appear missing)
check_secret() {
  local name="$1"
  local value="${!name}"
  if [ -z "$value" ]; then
    echo "  ⚠  $name is NOT set — add it in the Secrets tab (🔒)"
  else
    echo "  ✓  $name is set"
  fi
}

echo "▶ Checking required secrets..."
check_secret "MONGODB_URI"
check_secret "GROQ_API_KEY"
echo ""
echo "  Optional:"
check_secret "MISTRAL_API_KEY"
check_secret "SMTP_PASSWORD"
echo ""

echo "▶ Setup complete!"
echo "   Start the app via the Workflows panel (▶ buttons) or run:"
echo "     pnpm --filter @workspace/api-server run dev   # port 8080"
echo "     pnpm --filter @workspace/cyber-sentinel run dev  # port 5000"
echo ""
echo "   Login operator ID: Majen"
echo ""
