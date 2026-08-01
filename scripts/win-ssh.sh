#!/bin/bash
# Connect to your Windows machine via Cloudflare Tunnel + SSH.
# Usage:
#   bash scripts/win-ssh.sh                          # uses saved hostname
#   bash scripts/win-ssh.sh renewal-xxx.trycloudflare.com   # override hostname
#
# The tunnel hostname changes every time you restart cloudflared on Windows.
# When it changes, pass the new one as an argument, or update DEFAULT_HOST below.

DEFAULT_HOST="renewal-items-able-hotel.trycloudflare.com"
HOST="${1:-$DEFAULT_HOST}"
USER="sshuser"

CF="/home/runner/.local/bin/cloudflared"

if [ ! -x "$CF" ]; then
  echo "cloudflared not found. Run this first:"
  echo '  curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /home/runner/.local/bin/cloudflared && chmod +x /home/runner/.local/bin/cloudflared'
  exit 1
fi

echo "Connecting to $USER@$HOST through Cloudflare Tunnel..."
echo "(password: the one you set for sshuser on Windows)"
echo ""

ssh \
  -o StrictHostKeyChecking=no \
  -o ProxyCommand="$CF access ssh --hostname %h" \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  "$USER@$HOST"
