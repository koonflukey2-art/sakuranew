#!/usr/bin/env bash
set -euo pipefail

log() {
  printf "\n==> %s\n" "$*"
}

fail() {
  printf "\nERROR: %s\n" "$*" >&2
  exit 1
}

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

log "Starting VPS deploy in ${ROOT_DIR}"

log "Preflight checks"
command -v git >/dev/null 2>&1 || fail "git is required but not installed"
command -v docker >/dev/null 2>&1 || fail "docker is required but not installed"
docker compose version >/dev/null 2>&1 || fail "docker compose is required but not installed"

required_env_vars=(
  POSTGRES_PASSWORD
  NEXTAUTH_URL
  NEXTAUTH_SECRET
  AUTH_SECRET
)

missing_env_vars=()
for var in "${required_env_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    missing_env_vars+=("$var")
  fi
done

if (( ${#missing_env_vars[@]} > 0 )); then
  fail "Missing required environment variables: ${missing_env_vars[*]}"
fi

log "Disk space (df -h)"
df -h

log "Memory (free -h)"
free -h

cd "$ROOT_DIR"

log "Fetching latest git refs"
git fetch origin

if [[ -n "${DEPLOY_ROLLBACK_SHA:-}" ]]; then
  log "Rollback mode: resetting to ${DEPLOY_ROLLBACK_SHA}"
  git rev-parse --verify "${DEPLOY_ROLLBACK_SHA}" >/dev/null
  git reset --hard "${DEPLOY_ROLLBACK_SHA}"
else
  log "Resetting to origin/main"
  git reset --hard origin/main
fi

log "Pulling container images"
docker compose pull

log "Building containers"
docker compose build --pull

log "Starting containers"
docker compose up -d

log "Container status"
docker compose ps

log "Recent logs"
docker compose logs --tail=100

log "Deploy complete"
