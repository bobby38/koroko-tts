# syntax=docker/dockerfile:1
FROM node:18-slim AS base

# Install dependencies only when needed
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

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables
ENV NEXT_TELEMETRY_DISABLED 1

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
LABEL stage=runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install and verify ffmpeg in production stage
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/* && \
    echo "Verifying ffmpeg installation:" && \
    which ffmpeg && \
    ffmpeg -version && \
    echo "FFmpeg installation verified"

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs && \
    chown -R nextjs:nodejs /app

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create and set permissions for directories
RUN mkdir -p .next /tmp && \
    chown -R nextjs:nodejs .next && \
    chmod -R 755 .next && \
    chown -R nextjs:nodejs /tmp && \
    chmod -R 777 /tmp

# Switch to non-root user
USER nextjs

# Verify ffmpeg is accessible to nextjs user
RUN echo "Verifying ffmpeg as nextjs user:" && \
    which ffmpeg && \
    ffmpeg -version

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
