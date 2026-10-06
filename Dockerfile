# syntax=docker/dockerfile:1.7
# App Next.js (output: "standalone") — Node 24 LTS, pnpm via corepack, usuário não-root.
# A imagem é construída no CI e publicada no GHCR; o Coolify só a executa.

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
# Exceções públicas, embutidas no JS do navegador: versão e DSN do Sentry.
ARG APP_VERSION=dev
ARG NEXT_PUBLIC_SENTRY_DSN=
ENV NEXT_PUBLIC_APP_VERSION=$APP_VERSION \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
RUN pnpm build && pnpm build:migrate

# 3) Runtime mínimo
FROM node:24-alpine AS runner
WORKDIR /app
ARG APP_VERSION=dev
ENV NODE_ENV=production \
    APP_VERSION=$APP_VERSION \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
# Migrador empacotado + SQL do Drizzle. NÃO rodam no boot: o job de deploy executa
#   echo "<url do migrator>" | docker run --rm -i <imagem>
#     sh -c 'read -r DATABASE_URL && export DATABASE_URL && exec node migrate.mjs'
# (veja .github/workflows/deploy.yml)
COPY --from=build --chown=nextjs:nodejs /app/dist/migrate.mjs ./migrate.mjs
COPY --from=build --chown=nextjs:nodejs /app/drizzle ./drizzle

USER nextjs
EXPOSE 3000

# Só o processo (sem banco): uma queda do Postgres não deve derrubar o app em loop.
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1

# server.js é o servidor mínimo gerado pelo próprio Next no modo standalone
# (equivalente ao `next start`, sem precisar de node_modules completo).
CMD ["node", "server.js"]
