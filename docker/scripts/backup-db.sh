#!/bin/sh
# ═══════════════════════════════════════════════════════════════
# Dumps the Postgres database and pushes it into the MinIO backup
# bucket. Run manually, via host cron, or via a scheduler container.
#
# Usage (from the project root, with the stack running):
#   docker compose exec db sh -c "pg_dump -U $POSTGRES_USER $POSTGRES_DB" \
#     > backup_$(date +%Y%m%d_%H%M%S).sql
#   docker compose run --rm storage-init mc cp /path/to/backup.sql local/$BUCKET_NAME/
#
# This script wraps that into one step, run from the HOST machine
# (not inside a container), where `docker` is available.
# ═══════════════════════════════════════════════════════════════
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="insophinia_backup_${TIMESTAMP}.sql"
TMP_DIR=$(mktemp -d)

echo "[backup] Dumping database..."
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-insophinia}" "${POSTGRES_DB:-insophinia_pos}" > "${TMP_DIR}/${FILENAME}"

echo "[backup] Uploading ${FILENAME} to MinIO bucket '${BUCKET_NAME:-pos_backups}'..."
docker run --rm --network "$(basename "$(pwd)")_internal" \
  -v "${TMP_DIR}:/backup" \
  -e MC_HOST_local="http://${MINIO_ROOT_USER}:${MINIO_ROOT_PASSWORD}@storage:9000" \
  minio/mc:latest \
  cp "/backup/${FILENAME}" "local/${BUCKET_NAME:-pos_backups}/${FILENAME}"

rm -rf "$TMP_DIR"
echo "[backup] Done: ${FILENAME}"
