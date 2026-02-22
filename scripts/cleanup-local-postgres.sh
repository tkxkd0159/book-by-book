#!/usr/bin/env bash
set -euo pipefail

PG_CONTAINER_NAME="${PG_CONTAINER_NAME:-book-by-book-postgres}"
PG_VOLUME_NAME="${PG_VOLUME_NAME:-${PG_CONTAINER_NAME}-data}"
REMOVE_VOLUME="${REMOVE_VOLUME:-1}"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required but not installed."
  exit 1
fi

container_exists="$(docker ps -a --filter "name=^/${PG_CONTAINER_NAME}$" --format "{{.Names}}")"
container_volumes=""

if [[ -n "$container_exists" ]]; then
  container_volumes="$(docker inspect -f '{{range .Mounts}}{{if eq .Type "volume"}}{{.Name}} {{end}}{{end}}' "$PG_CONTAINER_NAME" 2>/dev/null || true)"
  echo "Removing container: $PG_CONTAINER_NAME"
  docker rm -f "$PG_CONTAINER_NAME" >/dev/null
else
  echo "Container not found: $PG_CONTAINER_NAME"
fi

if [[ "$REMOVE_VOLUME" != "1" ]]; then
  echo "Skipping volume removal (REMOVE_VOLUME=$REMOVE_VOLUME)."
  exit 0
fi

removed_any=0
seen_volumes=""

for volume in $container_volumes "$PG_VOLUME_NAME"; do
  if [[ -z "$volume" ]]; then
    continue
  fi

  case " $seen_volumes " in
    *" $volume "*)
      continue
      ;;
  esac
  seen_volumes="$seen_volumes $volume"

  if docker volume inspect "$volume" >/dev/null 2>&1; then
    echo "Removing volume: $volume"
    docker volume rm "$volume" >/dev/null
    removed_any=1
  fi
done

if [[ "$removed_any" -eq 0 ]]; then
  echo "No matching Docker volume found to remove."
fi

echo "Local PostgreSQL cleanup complete."
