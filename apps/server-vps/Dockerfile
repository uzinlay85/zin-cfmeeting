# ==========================================
# Stage 1: Build Web App
# ==========================================
FROM node:20-alpine AS web-builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
RUN npm ci --workspace=apps/web

COPY apps/web ./apps/web
RUN npm run build -w apps/web

# ==========================================
# Stage 2: Build VPS Server
# ==========================================
FROM node:20-alpine AS server-builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server-vps/package.json ./apps/server-vps/
RUN npm ci --workspace=apps/server-vps

COPY apps/server-vps ./apps/server-vps
RUN npm run build -w apps/server-vps

# ==========================================
# Stage 3: Production Runner
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV STATIC_DIR=/app/public
ENV RECORDINGS_DIR=/app/recordings

COPY package.json package-lock.json ./
COPY apps/server-vps/package.json ./apps/server-vps/
RUN npm ci --omit=dev --workspace=apps/server-vps

# Copy built server and static web assets
COPY --from=server-builder /app/apps/server-vps/dist ./apps/server-vps/dist
COPY --from=web-builder /app/apps/web/dist ./public

# Create recordings storage directory
RUN mkdir -p /app/recordings

EXPOSE 3000

CMD ["node", "apps/server-vps/dist/index.js"]
