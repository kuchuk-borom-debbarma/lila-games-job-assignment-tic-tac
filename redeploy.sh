#!/bin/bash

echo "🚀 Building Server Logic..."
cd server && bun run build

echo "🔄 Restarting Nakama..."
# We use down/up to ensure the new volume mapping is picked up correctly
docker compose down && docker compose up -d

echo "📊 Following Logs (Press Ctrl+C to stop)..."
docker compose logs -f nakama
