FROM node:20-alpine

WORKDIR /app

# Instala dependências nativas para sqlite3
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci --production

COPY . .

# Remove DB local (será montado como volume em produção)
RUN rm -f buscaracing.db buscaracing.db-shm buscaracing.db-wal

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
