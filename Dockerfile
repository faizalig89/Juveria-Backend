# syntax=docker/dockerfile:1

# ---------- Build stage ----------
FROM node:24-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm ci

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src

RUN npx prisma generate
RUN npm run build

# ---------- Production stage ----------
FROM node:24-bookworm-slim AS production

ENV NODE_ENV=production
ENV PORT=4000

# Java is required by the official PINT-AE Schematron engine.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openjdk-21-jre-headless ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm ci --omit=dev \
    && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY tools/saxon ./tools/saxon
COPY pint-ae/1.4.4 ./pint-ae/1.4.4

# Local uploads are intentionally not copied.
# Production document storage must be persistent/external.

RUN groupadd --system juveria \
    && useradd --system --gid juveria --create-home juveria \
    && chown -R juveria:juveria /app

USER juveria

EXPOSE 4000

CMD ["node", "dist/main.js"]
