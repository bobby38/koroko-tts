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
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install ffmpeg in production stage
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/* && \
    ln -sf /usr/bin/ffmpeg /bin/ffmpeg && \
    ln -sf /usr/bin/ffmpeg /usr/local/bin/ffmpeg && \
    chmod 755 /usr/bin/ffmpeg && \
    chmod 755 /bin/ffmpeg && \
    chmod 755 /usr/local/bin/ffmpeg && \
    echo "FFmpeg installed at:" && which ffmpeg && \
    echo "FFmpeg version:" && ffmpeg -version

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
    chmod -R 777 /tmp && \
    echo "Directory permissions:" && \
    ls -la /usr/bin/ffmpeg && \
    ls -la /bin/ffmpeg && \
    ls -la /usr/local/bin/ffmpeg

# Switch to non-root user
USER nextjs

# Set PATH for nextjs user
ENV PATH="/usr/local/bin:/usr/bin:/bin:${PATH}"

# Verify ffmpeg is accessible to nextjs user
RUN echo "Testing ffmpeg as nextjs user:" && \
    which ffmpeg && \
    ffmpeg -version

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
