# ---------- Stage 1: Build ----------
FROM node:20-alpine AS builder
ARG NEXT_PUBLIC_BACKEND_BASE_URL
ARG NEXT_PUBLIC_ADMIN_KEY
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit

# Copy project
COPY . .

# Build environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_BACKEND_BASE_URL=${NEXT_PUBLIC_BACKEND_BASE_URL}
ENV NEXT_PUBLIC_ADMIN_KEY=${NEXT_PUBLIC_ADMIN_KEY}

# Build the app
RUN npm run build

# ---------- Stage 2: Runtime ----------
FROM node:20-alpine AS runner
ARG NEXT_PUBLIC_BACKEND_BASE_URL
ARG NEXT_PUBLIC_ADMIN_KEY
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_BACKEND_BASE_URL=${NEXT_PUBLIC_BACKEND_BASE_URL}
ENV NEXT_PUBLIC_ADMIN_KEY=${NEXT_PUBLIC_ADMIN_KEY}

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.ts ./

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
CMD ["npm", "start"]
