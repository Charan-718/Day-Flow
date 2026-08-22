#!/bin/sh
set -e

echo "Waiting briefly for Postgres..."
sleep 2

echo "Running migrations..."
npx prisma migrate deploy

echo "Seeding database..."
npx tsx prisma/seed.ts

echo "Starting API..."
exec node dist/server.js
