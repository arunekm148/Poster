#!/usr/bin/env bash
set -euo pipefail

cd /workspace

write_env_files() {
  cat > .env <<'EOF'
DATABASE_URL=postgresql://poster:poster@127.0.0.1:5432/poster
SESSION_SECRET=local-dev-session-secret-minimum-32-characters
SUPABASE_URL=https://placeholder.supabase.co
SUPABASE_SECRET_KEY=placeholder-dev-supabase-service-key
EOF
  cp .env .env.local
}

write_env_files

/workspace/.cursor/scripts/ensure-postgres.sh

npm ci
npx prisma migrate deploy
bash .cursor/scripts/seed-dev-admin.sh
