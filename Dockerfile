# ============================================
# DOCKERFILE — Gestion Panneaux (Next.js 14)
# Version optimisée — évite le chown -R (cause erreur 137)
# ============================================

# ============================================
# ÉTAPE 1 — Dépendances
# ============================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma

# Installer AUSSI les devDependencies (tailwindcss, typescript, etc.)
RUN npm ci --include=dev --no-audit --no-fund


# ============================================
# ÉTAPE 2 — Build
# ============================================
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

COPY . .

RUN npx prisma generate

ARG BUILD_VERSION=unknown
RUN echo "🔧 BUILD_VERSION=${BUILD_VERSION}" && \
    if [ -f public/service-worker.js ]; then \
      sed -i "s|const CACHE_VERSION = .*;|const CACHE_VERSION = 'panneaux-${BUILD_VERSION}';|" public/service-worker.js && \
      echo "✅ CACHE_VERSION injectée"; \
    fi

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build


# ============================================
# ÉTAPE 3 — Runtime
# ============================================
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl curl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# ✅ COPY avec --chown : permissions correctes dès la copie
#    (plus rapide que chown -R après coup)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json

# next.config.js peut être .js, .ts ou .mjs — on utilise un wildcard
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js* ./

# ✅ Plus de `RUN chown -R nextjs:nodejs /app` — supprimé car inutile

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Healthcheck pour que Coolify détecte mieux l'état du conteneur
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["npm", "run", "start"]