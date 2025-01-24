# syntax=docker/dockerfile:1

# Production image
FROM node:18-slim AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Install ffmpeg first and verify installation
RUN set -ex && \
    apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/* && \
    echo "Verifying ffmpeg installation..." && \
    ffmpeg -version && \
    which ffmpeg && \
    echo "FFmpeg verified in runner stage"

# Create app user
RUN set -ex && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --gid nodejs nextjs && \
    chown -R nextjs:nodejs /app

# Install dependencies
COPY package.json package-lock.json ./
RUN set -ex && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    build-essential && \
    npm ci && \
    rm -rf /var/lib/apt/lists/* && \
    echo "Verifying ffmpeg still accessible..." && \
    ffmpeg -version

# Build the application
COPY . .
RUN set -ex && \
    npm run build && \
    echo "Verifying ffmpeg after build..." && \
    ffmpeg -version

# Prepare standalone build
RUN set -ex && \
    cp -R .next/standalone/* . && \
    cp -R .next/static .next/static && \
    rm -rf .next/standalone && \
    echo "Verifying ffmpeg after build copy..." && \
    ffmpeg -version

# Set up directories and permissions
RUN set -ex && \
    mkdir -p /tmp && \
    chown -R nextjs:nodejs /tmp && \
    chmod 1777 /tmp && \
    mkdir -p .next && \
    chown -R nextjs:nodejs .next && \
    chmod 755 .next && \
    echo "Directory permissions:" && \
    ls -la /tmp && \
    ls -la .next

# Switch to non-root user
USER nextjs

# Final verification as nextjs user
RUN set -ex && \
    echo "Final ffmpeg verification as nextjs user:" && \
    ffmpeg -version && \
    which ffmpeg && \
    echo "All verifications passed!"

EXPOSE 3000

# Healthcheck to verify ffmpeg
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD ffmpeg -version || exit 1

CMD ["node", "server.js"]
