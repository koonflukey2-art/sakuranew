#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  attempt=1
  max=3
  while [ $attempt -le $max ]; do
    echo "Running prisma migrate deploy (attempt ${attempt}/${max})..."
    if npx prisma migrate deploy; then
      break
    fi
    if [ $attempt -ge $max ]; then
      echo "Migration failed after ${max} attempts. Continuing without blocking startup."
      break
    fi
    delay=$((attempt * 10))
    echo "Retrying migration in ${delay}s..."
    sleep $delay
    attempt=$((attempt + 1))
  done
else
  echo "Skipping prisma migrate deploy (RUN_MIGRATIONS=${RUN_MIGRATIONS})."
fi

exec "$@"
