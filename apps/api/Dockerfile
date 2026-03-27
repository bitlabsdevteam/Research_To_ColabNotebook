# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root package files for monorepo install
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/

# Install all deps (monorepo root)
RUN npm ci --workspace=@paper2notebook/api

# Copy API source
COPY apps/api/ ./apps/api/

# Build NestJS
WORKDIR /app/apps/api
RUN npx nest build

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy root package files and install production deps only
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
RUN npm ci --workspace=@paper2notebook/api --omit=dev && npm cache clean --force

# Copy built output
COPY --from=builder /app/apps/api/dist ./dist

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

USER nestjs

EXPOSE 3001

CMD ["node", "dist/main"]
