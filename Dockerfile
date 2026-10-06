# syntax=docker/dockerfile:1.7
# App Next.js (output: "standalone") — Node 24 LTS, pnpm via corepack, usuário não-root.

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1 \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN apk add --no-cache libc6-compat && corepack enable
WORKDIR /app

# 1) Dependências (camada cacheada enquanto o lockfile não muda)
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

# 2) Build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Nenhum segredo é necessário no build: as variáveis são lidas em runtime.
RUN pnpm build

# 3) Runtime mínimo
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
# Migrações SQL do Drizzle: aplicadas pelo próprio app no boot (instrumentation.ts).
COPY --from=build --chown=nextjs:nodejs /app/drizzle ./drizzle

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1

# server.js é o servidor mínimo gerado pelo próprio Next no modo standalone
# (equivalente ao `next start`, sem precisar de node_modules completo).
CMD ["node", "server.js"]
