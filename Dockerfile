# Production image, use full debian instead of slim to ensure all dependencies
FROM node:18-bullseye AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    REPLICATE_API_TOKEN=""

# Install system dependencies and ffmpeg
RUN set -ex && \
    # Update package lists
    apt-get update && \
    # Install required packages
    apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    build-essential \
    ca-certificates && \
    # Clean up
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    # Verify ffmpeg installation
    echo "Verifying ffmpeg installation..." && \
    ffmpeg -version && \
    which ffmpeg > /usr/local/bin/ffmpeg-path && \
    # Create symlink and set permissions
    ln -sf $(cat /usr/local/bin/ffmpeg-path) /usr/local/bin/ffmpeg && \
    chmod 755 /usr/local/bin/ffmpeg && \
    # Additional verification
    echo "FFmpeg location:" && \
    ls -l /usr/local/bin/ffmpeg && \
    echo "FFmpeg version:" && \
    /usr/local/bin/ffmpeg -version

# Set PATH and other environment variables
ENV PATH="/usr/local/bin:${PATH}" \
    FFMPEG_PATH="/usr/local/bin/ffmpeg"

# Create app user and set permissions
RUN set -ex && \
    # Create user and group
    groupadd -r -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nextjs && \
    # Set directory permissions
    mkdir -p /app /tmp && \
    chown -R nextjs:nodejs /app /tmp && \
    chmod 1777 /tmp && \
    # Set ffmpeg permissions
    chown root:nodejs /usr/local/bin/ffmpeg && \
    chmod 755 /usr/local/bin/ffmpeg && \
    # Verify permissions
    ls -la /usr/local/bin/ffmpeg

# Copy and install dependencies
COPY --chown=nextjs:nodejs package*.json ./
RUN set -ex && \
    npm ci --include=dev && \
    # Verify ffmpeg is still accessible
    echo "Verifying ffmpeg after npm install:" && \
    /usr/local/bin/ffmpeg -version

# Copy application code
COPY --chown=nextjs:nodejs . .

# Build the application
RUN set -ex && \
    npm run build && \
    # Verify ffmpeg after build
    echo "Verifying ffmpeg after build:" && \
    /usr/local/bin/ffmpeg -version

# Prepare standalone build
RUN set -ex && \
    cp -R .next/standalone/* . && \
    mkdir -p public && \
    cp -R .next/static public/ && \
    rm -rf .next/standalone && \
    # Final verification
    echo "Final ffmpeg verification:" && \
    /usr/local/bin/ffmpeg -version

# Switch to non-root user
USER nextjs

# Final verification as nextjs user
RUN set -ex && \
    echo "Final ffmpeg verification as nextjs user:" && \
    /usr/local/bin/ffmpeg -version && \
    which ffmpeg && \
    echo "All verifications passed!"

EXPOSE 3000

# Healthcheck to verify ffmpeg
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /usr/local/bin/ffmpeg -version || exit 1

CMD ["node", "server.js"]
