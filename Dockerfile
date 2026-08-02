# --- Build stage -------------------------------------------------------
FROM node:22-slim AS build
WORKDIR /app

# System deps for better-sqlite3's native build (falls back to source
# build if no prebuilt binary matches this platform/arch).
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Runtime stage -------------------------------------------------------
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# SQLite data lives on a volume (see docker-compose.yml) so it survives
# container rebuilds/redeploys.
RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "dist/server.cjs"]
