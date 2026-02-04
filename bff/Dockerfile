# ============================================
# Node.js BFF (Backend-for-Frontend) - Dockerfile
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install all dependencies (including dev for TypeScript compilation)
RUN npm install && npm cache clean --force

# Copy application source
COPY . .

# Build TypeScript to JavaScript
RUN npx tsc

# ── Production stage ─────────────────────────
FROM node:20-alpine AS production

# Install curl/wget for health checks
RUN apk add --no-cache curl wget

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --only=production && npm cache clean --force

# Copy compiled JavaScript from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

USER appuser

# Expose the BFF port
EXPOSE 4064

# Start the BFF server
CMD ["node", "dist/index.js"]
