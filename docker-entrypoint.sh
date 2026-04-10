#!/bin/sh
set -e

# Garante que as pastas de upload existam no volume persistente (/data)
DATA_DIR="${DATA_DIR:-/data}"
mkdir -p "$DATA_DIR/uploads" "$DATA_DIR/fotos"

# Se DB_PATH for definido, cria um symlink para que o server.js encontre o banco
if [ -n "$DB_PATH" ]; then
  # Cria o diretório pai se não existir
  mkdir -p "$(dirname "$DB_PATH")"
  # Se o banco ainda não existe no destino, o server.js irá criá-lo via initDb()
  # Aponta o arquivo do projeto para o volume externo
  if [ ! -f "$DB_PATH" ]; then
    echo "[entrypoint] Banco novo em $DB_PATH — será inicializado pelo server.js"
  else
    echo "[entrypoint] Usando banco existente em $DB_PATH"
  fi
  # Cria symlink somente se o destino for diferente do padrão
  ln -sf "$DB_PATH" /app/buscaracing.db 2>/dev/null || true
fi

exec node server.js
