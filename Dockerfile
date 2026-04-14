# syntax=docker/dockerfile:1
# ----------------------------------------------------------------------
# Busca Racing — Next.js (standalone) + better-sqlite3
# ----------------------------------------------------------------------

FROM node:20-alpine AS deps
WORKDIR /app
# better-sqlite3 needs native build tools
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN npm ci

# ----------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ----------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATA_DIR=/data
ENV DB_PATH=/data/buscaracing.db

# Standalone output copies only what the app needs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Native module: better-sqlite3 prebuilt binding and its dependencies
# (standalone output does not bundle these because of serverComponentsExternalPackages)
COPY --from=builder /app/node_modules/better-sqlite3    ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/bindings          ./node_modules/bindings
COPY --from=builder /app/node_modules/file-uri-to-path  ./node_modules/file-uri-to-path

# sharp (image conversion to WebP) — marked as external, so we ship it
# explicitly. Prebuilt musl binary lives under node_modules/@img/*.
COPY --from=builder /app/node_modules/sharp         ./node_modules/sharp
COPY --from=builder /app/node_modules/@img          ./node_modules/@img
COPY --from=builder /app/node_modules/detect-libc   ./node_modules/detect-libc
COPY --from=builder /app/node_modules/semver        ./node_modules/semver

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    mkdir -p /data/uploads /data/fotos

# Run as root so the existing /data volume (owned by root from the
# previous Express deployment) remains writable. The container is
# behind Caddy and never exposes root to the network.

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
