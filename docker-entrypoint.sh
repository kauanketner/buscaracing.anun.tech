#!/bin/sh
set -e

# Persistent volume for SQLite + uploads + fotos
DATA_DIR="${DATA_DIR:-/data}"
mkdir -p "$DATA_DIR/uploads" "$DATA_DIR/fotos"

DB_PATH="${DB_PATH:-$DATA_DIR/buscaracing.db}"
if [ ! -f "$DB_PATH" ]; then
  echo "[entrypoint] Banco novo em $DB_PATH — sera inicializado no primeiro acesso"
else
  echo "[entrypoint] Usando banco existente em $DB_PATH"
fi

export DB_PATH
export DATA_DIR

# Next.js standalone entrypoint
exec node server.js
