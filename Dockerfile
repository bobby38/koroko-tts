# syntax=docker/dockerfile:1

# Production image
FROM node:18-slim AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Install system dependencies and ffmpeg
RUN set -ex && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    build-essential && \
    rm -rf /var/lib/apt/lists/* && \
    echo "Verifying ffmpeg installation..." && \
    ffmpeg -version && \
    which ffmpeg > /usr/local/bin/ffmpeg-path && \
    cat /usr/local/bin/ffmpeg-path && \
    ln -sf $(cat /usr/local/bin/ffmpeg-path) /usr/local/bin/ffmpeg && \
    chmod +x /usr/local/bin/ffmpeg

# Set PATH and other environment variables
ENV PATH="/usr/local/bin:${PATH}" \
    FFMPEG_PATH="/usr/local/bin/ffmpeg"

# Create app user
RUN set -ex && \
    groupadd -r -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nextjs && \
    chown -R nextjs:nodejs /app && \
    # Ensure ffmpeg is accessible to nextjs user
    chown root:nodejs /usr/local/bin/ffmpeg && \
    chmod 755 /usr/local/bin/ffmpeg

# Install dependencies
COPY package.json package-lock.json ./
RUN set -ex && \
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
