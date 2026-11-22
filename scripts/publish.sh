#!/usr/bin/env bash
# Publish the app through an anonymous Serveo tunnel.
# No account or credentials required. The URL changes each time the tunnel restarts.
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p /tmp/opencode/shopspace-publish

if ! curl -fsS -o /dev/null http://localhost:3000/marketplace; then
  echo "Starting the production server on port 3000..."
  SHOPSPACE_DB_URL=file:data/shopspace.db nohup npm run start -- -p 3000 \
    > /tmp/opencode/shopspace-publish/server.log 2>&1 &
  for _ in $(seq 1 30); do
    if curl -fsS -o /dev/null http://localhost:3000/marketplace; then break; fi
    sleep 1
  done
fi

echo "Starting the public tunnel..."
nohup ssh \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  -o ServerAliveInterval=60 \
  -R 80:localhost:3000 serveo.net \
  > /tmp/opencode/shopspace-publish/tunnel.log 2>&1 &

for _ in $(seq 1 30); do
  url=$(grep -oE 'https://[a-zA-Z0-9-]+\.serveousercontent\.com' \
    /tmp/opencode/shopspace-publish/tunnel.log | head -1 || true)
  if [ -n "$url" ]; then
    echo "Live: $url/marketplace"
    exit 0
  fi
  sleep 1
done

echo "Tunnel did not start. See /tmp/opencode/shopspace-publish/tunnel.log" >&2
exit 1
