#!/usr/bin/env bash
set -euo pipefail

cd /workspace

set -a
# shellcheck disable=SC1091
source .env
set +a

PASSWORD_HASH='$2b$12$0ZjMmGuUqVgG//ZmkK7yW.qDZbYkbGbJpZyK5uwtKHZjeawgsCrFu'

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL
INSERT INTO "User" (
  id,
  name,
  phone,
  email,
  password,
  role,
  "isActive",
  "createdAt",
  "updatedAt"
)
VALUES (
  'dev-admin-seed',
  'Dev Admin',
  '9876543210',
  'dev-admin@agentsindia.local',
  '${PASSWORD_HASH}',
  'ADMIN',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (phone) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  "isActive" = true,
  "updatedAt" = NOW();
SQL

echo "Dev admin ready: phone 9876543210, password DevAdmin123!"
