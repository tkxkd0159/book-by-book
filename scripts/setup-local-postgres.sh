#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCHEMA_FILE="$ROOT_DIR/db/schema/data.sql"

PG_CONTAINER_NAME="${PG_CONTAINER_NAME:-book-by-book-postgres}"
PG_IMAGE="${PG_IMAGE:-postgres:18}"
PG_PORT="${PG_PORT:-54329}"
PG_SUPERUSER="${PG_SUPERUSER:-postgres}"
PG_SUPERUSER_PASSWORD="${PG_SUPERUSER_PASSWORD:-postgres}"
LOCAL_DB_NAME="${LOCAL_DB_NAME:-book_by_book_local}"
APP_USER_PASSWORD="${APP_USER_PASSWORD:-local-dev-password}"
PG_VOLUME_MOUNT="${PG_VOLUME_MOUNT:-/var/lib/postgresql}"
PG_VOLUME_NAME="${PG_VOLUME_NAME:-${PG_CONTAINER_NAME}-data}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required but not installed."
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required but not installed."
  exit 1
fi

if [[ ! -f "$SCHEMA_FILE" ]]; then
  echo "Schema file not found: $SCHEMA_FILE"
  exit 1
fi

if [[ ! "$LOCAL_DB_NAME" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "LOCAL_DB_NAME must be a valid PostgreSQL identifier."
  exit 1
fi

if [[ "$PG_IMAGE" != postgres:18* ]]; then
  echo "Only PostgreSQL 18 images are supported by this script."
  echo "Set PG_IMAGE to a postgres:18 variant (for example postgres:18 or postgres:18-alpine)."
  exit 1
fi

container_state="$(docker ps -a --filter "name=^/${PG_CONTAINER_NAME}$" --format "{{.State}}")"

if [[ -n "$container_state" ]]; then
  existing_image="$(docker inspect -f '{{.Config.Image}}' "$PG_CONTAINER_NAME" 2>/dev/null || true)"
  if [[ -n "$existing_image" && "$existing_image" != "$PG_IMAGE" ]]; then
    echo "Existing container image mismatch."
    echo "  current:  $existing_image"
    echo "  expected: $PG_IMAGE"
    echo "Recreate the container to apply new image/mount settings:"
    echo "  docker rm -f $PG_CONTAINER_NAME"
    echo "  # optional for clean start: docker volume rm $PG_VOLUME_NAME"
    exit 1
  fi

  existing_mounts="$(docker inspect -f '{{range .Mounts}}{{.Destination}} {{end}}' "$PG_CONTAINER_NAME" 2>/dev/null || true)"
  if [[ -n "$existing_mounts" && "$existing_mounts" != *"$PG_VOLUME_MOUNT"* ]]; then
    echo "Existing container mount mismatch."
    echo "  mounts:   $existing_mounts"
    echo "  expected: $PG_VOLUME_MOUNT"
    echo "Recreate the container to apply new mount settings:"
    echo "  docker rm -f $PG_CONTAINER_NAME"
    echo "  # optional for clean start: docker volume rm $PG_VOLUME_NAME"
    exit 1
  fi
fi

if [[ -z "$container_state" ]]; then
  echo "Starting new PostgreSQL container: ${PG_CONTAINER_NAME}"
  docker run -d \
    --name "$PG_CONTAINER_NAME" \
    -e POSTGRES_DB="$LOCAL_DB_NAME" \
    -e POSTGRES_USER="$PG_SUPERUSER" \
    -e POSTGRES_PASSWORD="$PG_SUPERUSER_PASSWORD" \
    -p "${PG_PORT}:5432" \
    -v "${PG_VOLUME_NAME}:${PG_VOLUME_MOUNT}" \
    "$PG_IMAGE" >/dev/null
elif [[ "$container_state" != "running" ]]; then
  echo "Starting existing PostgreSQL container: ${PG_CONTAINER_NAME}"
  docker start "$PG_CONTAINER_NAME" >/dev/null
fi

echo "Waiting for PostgreSQL container to be ready..."
ready=0
for _ in {1..60}; do
  current_state="$(docker inspect -f '{{.State.Status}}' "$PG_CONTAINER_NAME" 2>/dev/null || true)"
  case "$current_state" in
    running)
      # Prefer the app database readiness because POSTGRES_DB initializes this database.
      if docker exec "$PG_CONTAINER_NAME" \
        pg_isready -U "$PG_SUPERUSER" -d "$LOCAL_DB_NAME" >/dev/null 2>&1; then
        ready=1
        break
      fi

      # Fallback to maintenance DB readiness so we can create LOCAL_DB_NAME if needed.
      if docker exec "$PG_CONTAINER_NAME" \
        pg_isready -U "$PG_SUPERUSER" -d template1 >/dev/null 2>&1; then
        ready=1
        break
      fi
      ;;
    created|restarting)
      ;;
    exited|dead)
      echo "PostgreSQL container exited during startup."
      echo "Container state: $current_state"
      echo "Recent container logs:"
      startup_logs="$(docker logs --tail 80 "$PG_CONTAINER_NAME" 2>&1 || true)"
      echo "$startup_logs"
      if grep -q "unused mount/volume" <<<"$startup_logs"; then
        echo ""
        echo "Detected PostgreSQL 18 mount/data-layout mismatch."
        echo "Recreate the container and volume, then run the script again."
      fi
      exit 1
      ;;
    *)
      ;;
  esac

  sleep 1
done

if [[ "$ready" -ne 1 ]]; then
  echo "PostgreSQL container did not become ready in time."
  echo "Container state: $(docker inspect -f '{{.State.Status}}' "$PG_CONTAINER_NAME" 2>/dev/null || echo 'unknown')"
  echo "Recent container logs:"
  timeout_logs="$(docker logs --tail 40 "$PG_CONTAINER_NAME" 2>&1 || true)"
  echo "$timeout_logs"
  if grep -q "unused mount/volume" <<<"$timeout_logs"; then
    echo ""
    echo "Detected PostgreSQL 18 mount/data-layout mismatch."
    echo "Recreate the container and volume, then run the script again."
  fi
  exit 1
fi

if ! docker exec "$PG_CONTAINER_NAME" psql -U "$PG_SUPERUSER" -d template1 -tAc "SELECT 1 FROM pg_database WHERE datname='${LOCAL_DB_NAME}'" | grep -q 1; then
  echo "Creating missing database: ${LOCAL_DB_NAME}"
  docker exec "$PG_CONTAINER_NAME" psql -U "$PG_SUPERUSER" -d template1 -v ON_ERROR_STOP=1 \
    -c "CREATE DATABASE ${LOCAL_DB_NAME};"
fi

echo "Applying base schema: $SCHEMA_FILE"
APP_USER_PASSWORD="$APP_USER_PASSWORD" python3 - "$SCHEMA_FILE" <<'PY' | docker exec -i "$PG_CONTAINER_NAME" psql -U "$PG_SUPERUSER" -d "$LOCAL_DB_NAME" -v ON_ERROR_STOP=1
import os
import pathlib
import sys

schema_path = pathlib.Path(sys.argv[1])
password = os.environ["APP_USER_PASSWORD"].replace("'", "''")
schema_sql = schema_path.read_text()
sys.stdout.write(schema_sql.replace("$APP_USER_PASSWORD", password))
PY

echo "Granting CONNECT on ${LOCAL_DB_NAME} to bbb_bff"
docker exec "$PG_CONTAINER_NAME" psql -U "$PG_SUPERUSER" -d template1 \
  -v ON_ERROR_STOP=1 \
  -c "GRANT CONNECT ON DATABASE \"${LOCAL_DB_NAME}\" TO bbb_bff;"

echo "Local PostgreSQL setup complete."
echo "DATABASE_URL=postgres://${PG_SUPERUSER}:${PG_SUPERUSER_PASSWORD}@localhost:${PG_PORT}/${LOCAL_DB_NAME}"
