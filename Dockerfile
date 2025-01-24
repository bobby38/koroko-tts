# syntax=docker/dockerfile:1

# Base stage with minimal dependencies
FROM node:18-slim AS base

# Dependencies stage for npm packages
FROM base AS deps
WORKDIR /app

# Install build essentials
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    build-essential && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci

# Builder stage for Next.js
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Final production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Install ffmpeg and verify it works
RUN set -ex; \
    apt-get update; \
    apt-get install -y --no-install-recommends ffmpeg; \
    rm -rf /var/lib/apt/lists/*; \
    ffmpeg -version; \
    which ffmpeg

# Create app user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --gid nodejs nextjs && \
    chown -R nextjs:nodejs /app

# Copy app files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Set up directories and permissions
RUN mkdir -p /tmp && \
    chown -R nextjs:nodejs /tmp && \
    chmod 1777 /tmp && \
    mkdir -p .next && \
    chown -R nextjs:nodejs .next && \
    chmod 755 .next

# Switch to non-root user
USER nextjs

# Final verification that ffmpeg is accessible to nextjs user
RUN ffmpeg -version || (echo "ffmpeg not accessible to nextjs user" && exit 1)

EXPOSE 3000

CMD ["node", "server.js"]
