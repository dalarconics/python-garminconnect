#!/usr/bin/env bash
# Production deploy for apps/web (requires `vercel login` on the machine).
# Configured for Vercel project with Root Directory = apps/web.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT/apps/web"

VERCEL_BIN="vercel"
if ! command -v vercel >/dev/null 2>&1; then
  VERCEL_BIN="npx vercel"
fi

# Prebuild locally to avoid monorepo root directory resolution mismatch on Vercel cloud
$VERCEL_BIN build --prod --yes
exec $VERCEL_BIN deploy --prebuilt --prod --yes
