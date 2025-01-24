FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Add build dependencies
RUN apk add --no-cache libc6-compat

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

# Install ffmpeg and verify installation
RUN apk update && \
    apk add --no-cache ffmpeg && \
    ffmpeg -version && \
    which ffmpeg && \
    ln -sf $(which ffmpeg) /usr/local/bin/ffmpeg && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app

# Update PATH to include ffmpeg
ENV PATH="/usr/local/bin:/usr/bin:${PATH}"

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create and set permissions for .next directory
RUN mkdir -p .next && \
    chown -R nextjs:nodejs .next && \
    chmod -R 755 .next

# Switch to non-root user
USER nextjs

# Verify ffmpeg is accessible to nextjs user
RUN ffmpeg -version

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
