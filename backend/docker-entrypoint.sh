#!/bin/sh
set -e
echo "[backend] prisma migrate deploy"
npx prisma migrate deploy
echo "[backend] seed (idempotent)"
node dist/seed.mjs
echo "[backend] start"
exec node dist/main.mjs
