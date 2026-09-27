#!/usr/bin/env bash
set -euo pipefail

cd /workspace

if [[ ! -f .env ]]; then
  cat > .env <<'EOF'
DATABASE_URL=postgresql://poster:poster@127.0.0.1:5432/poster
SESSION_SECRET=local-dev-session-secret-minimum-32-characters
EOF
  cp .env .env.local
fi

/workspace/.cursor/scripts/ensure-postgres.sh
