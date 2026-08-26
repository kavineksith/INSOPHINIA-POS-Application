# ═══════════════════════════════════════════════════════════════
# INSOPHINIA POS — Web Application Container
# Multi-stage build: deps -> builder -> runner (small final image)
# ═══════════════════════════════════════════════════════════════

# ---- Stage 1: install dependencies ----
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ---- Stage 2: build the app ----
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma needs a DATABASE_URL to generate the client, a dummy value is fine at build time.
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db"
ENV DIRECT_URL="postgresql://user:password@localhost:5432/db"
ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate
RUN npm run build

# ---- Stage 3: production runtime ----
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for defense in depth
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Next.js "standalone" output copies only what's needed to run
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

# Entrypoint runs pending migrations, then starts the server
COPY docker/scripts/web-entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh && chown nextjs:nodejs /app/entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "server.js"]
