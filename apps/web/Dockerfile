# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root package files for monorepo install
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/

# Install all deps (monorepo root)
RUN npm ci --workspace=@paper2notebook/web

# Copy web source
COPY apps/web/ ./apps/web/

# Build Next.js (standalone output)
WORKDIR /app/apps/web
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
