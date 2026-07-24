#!/usr/bin/env bash
# Wrapper for the daily Parse.bot sync, invoked from cron. Cron has a minimal
# environment, so we cd into the repo and use an absolute node path. Secrets
# come from .env via node's --env-file.
set -euo pipefail

REPO="/home/antoine/EnergyAtlas"
NODE="/home/antoine/.nvm/versions/node/v22.12.0/bin/node"

cd "$REPO"
echo "=== sync-parsebot $(date -Is) ==="
"$NODE" --env-file=.env scripts/sync-parsebot.mjs
