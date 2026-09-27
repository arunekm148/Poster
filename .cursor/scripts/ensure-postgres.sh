#!/usr/bin/env bash
set -euo pipefail

PGDATA="${PGDATA:-/var/lib/postgresql/16/main}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-poster}"
PGPASSWORD="${PGPASSWORD:-poster}"
PGDATABASE="${PGDATABASE:-poster}"

export PGPORT PGPASSWORD

start_cluster() {
  if command -v pg_ctlcluster >/dev/null 2>&1; then
    sudo pg_ctlcluster 16 main start || true
    return
  fi

  if ! sudo -u postgres pg_isready -q 2>/dev/null; then
    sudo -u postgres /usr/lib/postgresql/16/bin/pg_ctl -D "$PGDATA" -l /tmp/postgresql.log start || true
  fi
}

start_cluster

for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q 2>/dev/null; then
    break
  fi
  sleep 1
done

if ! sudo -u postgres pg_isready -q 2>/dev/null; then
  echo "PostgreSQL did not become ready in time." >&2
  exit 1
fi

sudo -u postgres psql -v ON_ERROR_STOP=1 postgres <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${PGUSER}') THEN
    CREATE ROLE ${PGUSER} LOGIN PASSWORD '${PGPASSWORD}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE ${PGDATABASE} OWNER ${PGUSER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${PGDATABASE}')\\gexec
GRANT ALL PRIVILEGES ON DATABASE ${PGDATABASE} TO ${PGUSER};
SQL
