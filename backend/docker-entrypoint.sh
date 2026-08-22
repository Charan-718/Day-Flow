#!/bin/sh
set -e

echo "Waiting briefly for Postgres..."
sleep 2

echo "Running migrations..."
npx prisma migrate deploy

if [ "${RUN_SEED_ON_START}" = "true" ]; then
  echo "Running seed (reference data + bootstrap)..."
  if ! npx tsx prisma/seed.ts; then
    echo "WARNING: seed failed — starting API anyway"
  fi
else
  echo "Skipping seed (RUN_SEED_ON_START is not true)"
fi

echo "Starting API..."
exec node dist/server.js
