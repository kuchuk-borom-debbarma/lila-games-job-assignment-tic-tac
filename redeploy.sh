#!/bin/bash
set -e

echo "🚀 Building Server Logic..."
cd server && bun run build

echo "🔄 Restarting Nakama..."
docker compose down -v   # <-- -v removes volumes, forces fresh mount
docker compose up -d

echo "📊 Following Logs (Press Ctrl+C to stop)..."
docker compose logs -f nakama