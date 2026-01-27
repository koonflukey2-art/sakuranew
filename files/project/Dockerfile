# syntax=docker/dockerfile:1.5

############################
# deps: install node_modules (include dev deps for prisma)
############################
FROM node:20-bookworm AS deps
WORKDIR /app

ENV NODE_ENV=development
ENV npm_config_loglevel=warn
ENV npm_config_fund=false
ENV npm_config_audit=false

# Build tools (เผื่อมี native modules อื่นๆ)
RUN set -eux; \
    sed -i -E 's|http://deb.debian.org|https://deb.debian.org|g; s|http://security.debian.org|https://security.debian.org|g' /etc/apt/sources.list /etc/apt/sources.list.d/*.list /etc/apt/sources.list.d/*.sources 2>/dev/null || true; \
    apt-get -o Acquire::ForceIPv4=true update && apt-get install -y --no-install-recommends \
    ca-certificates openssl \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma

# ติดตั้งตาม lockfile (รวม devDeps เพื่อให้ prisma อยู่ใน node_modules)
RUN npm ci --include=optional --no-audit --no-fund

# เพิ่ม sharp wasm เพื่อหลบปัญหา CPU x86-64-v2 ของ sharp native


############################
# build: next build + prisma generate
############################
FROM node:20-bookworm AS build
WORKDIR /app

ENV NODE_ENV=development
ENV npm_config_loglevel=warn
ENV npm_config_fund=false
ENV npm_config_audit=false
ENV NEXT_TELEMETRY_DISABLED=1

RUN set -eux; \
    sed -i -E 's|http://deb.debian.org|https://deb.debian.org|g; s|http://security.debian.org|https://security.debian.org|g' /etc/apt/sources.list /etc/apt/sources.list.d/*.list /etc/apt/sources.list.d/*.sources 2>/dev/null || true; \
    apt-get -o Acquire::ForceIPv4=true update && apt-get install -y --no-install-recommends \
    ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY prisma ./prisma
COPY . .

RUN npx prisma generate
RUN NODE_ENV=production npm run build

############################
# runner: minimal runtime
############################
FROM node:20-bookworm AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

RUN set -eux; \
    sed -i -E 's|http://deb.debian.org|https://deb.debian.org|g; s|http://security.debian.org|https://security.debian.org|g' /etc/apt/sources.list /etc/apt/sources.list.d/*.list /etc/apt/sources.list.d/*.sources 2>/dev/null || true; \
    apt-get -o Acquire::ForceIPv4=true update && apt-get install -y --no-install-recommends \
    ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

# Next.js standalone output
COPY --from=build /app/public ./public
# Prisma files (schema/migrations + engines)
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

# deps for prisma seed/scripts
COPY --from=build /app/node_modules ./node_modules

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

RUN groupadd -g 1001 app && useradd -m -u 1001 -g app app \
  && mkdir -p /data/uploads /data/uploads/statements \
  && chown -R app:app /app /data/uploads

USER app

EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]
