#!/bin/sh
# Runs pending Prisma migrations against the DB container, then boots the app.
set -e

echo "[entrypoint] Waiting for database to accept connections..."
ATTEMPTS=0
MAX_ATTEMPTS=30
until node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$queryRaw\`SELECT 1\`.then(() => { p.\$disconnect(); process.exit(0); }).catch(() => { p.\$disconnect(); process.exit(1); });
" 2>/dev/null; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
    echo "[entrypoint] Database did not become ready in time. Exiting."
    exit 1
  fi
  echo "[entrypoint] DB not ready yet (attempt $ATTEMPTS/$MAX_ATTEMPTS)... retrying in 2s"
  sleep 2
done

echo "[entrypoint] Database is up. Applying migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] Starting application..."
exec "$@"
