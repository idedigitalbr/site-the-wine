FROM node:22-alpine AS deps

WORKDIR /app/next-app
COPY next-app/package.json next-app/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app/next-app
COPY --from=deps /app/next-app/node_modules ./node_modules
COPY next-app/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/next-app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/next-app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/next-app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/next-app/scripts/migrate-local.mjs ./next-app/scripts/migrate-local.mjs
COPY --chown=nextjs:nodejs database/migrations ./database/migrations

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
