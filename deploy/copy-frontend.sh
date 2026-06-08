#!/usr/bin/env bash
# Deploy static frontend to the THWS production server (N1b).
# Run from the repo root:
#   bash deploy/copy-frontend.sh
#
# Requires SSH access to the THWS VM (THWS network / VPN).
# The target directory /var/www/advent-frontend/ must exist on the server;
# Nginx serves it as the catch-all location /.

set -euo pipefail

SERVER="elsadi@10.10.103.15"
REMOTE_DIR="/var/www/advent-frontend"
LOCAL_FRONTEND="."

# Files and folders that belong to the frontend.
INCLUDES=(
  --include="index.html"
  --include="css/***"
  --include="js/***"
  --include="img/***"
)

echo "→ Syncing frontend to ${SERVER}:${REMOTE_DIR} …"

rsync -avz --delete \
  "${INCLUDES[@]}" \
  --exclude="*" \
  "${LOCAL_FRONTEND}/" \
  "${SERVER}:${REMOTE_DIR}/"

echo "✓ Frontend deployed. Verify: curl -s http://10.10.103.15/ | head -5"
