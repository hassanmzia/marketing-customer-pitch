# ============================================
# React Frontend - Multi-stage Dockerfile
# ============================================

# ── Stage 1: Build the React application ─────
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build arguments for environment variables
ARG REACT_APP_BFF_URL
ARG REACT_APP_API_URL

ENV REACT_APP_BFF_URL=${REACT_APP_BFF_URL} \
    REACT_APP_API_URL=${REACT_APP_API_URL}

# Copy package files first for better layer caching
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install && npm cache clean --force

# Copy application source
COPY . .

# Build the React application (Vite outputs to dist/)
RUN npm run build

# ── Stage 2: Serve with Nginx ────────────────
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Remove default nginx configuration
RUN rm -rf /etc/nginx/conf.d/*

# Copy the built React app to nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose the frontend port
EXPOSE 3064

# Start nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
