# lifestreak Dockerfile — multi-stage Vite PWA build + nginx serve
# Stage 1: build the Vite SPA into dist/
# Stage 2: serve dist/ via nginx

# ─── Stage 1: build ─────────────────────────────────────────────────────
FROM node:22.22.0-alpine@sha256:e4bf2a82ad0a4037d28035ae71529873c069b13eb0455466ae0bc13363826e34 AS build

ARG LIFESTREAK_BUILD_REVISION=unknown
ENV LIFESTREAK_BUILD_REVISION=$LIFESTREAK_BUILD_REVISION

WORKDIR /app

COPY package*.json ./
COPY .npmrc .nvmrc .node-version ./
COPY scripts/check-toolchain.mjs ./scripts/check-toolchain.mjs
RUN npm install --global npm@11.17.0 \
  && npm run toolchain:check \
  && npm ci --no-audit --no-fund --include=dev

COPY . .
RUN npm run build

# ─── Stage 2: serve ─────────────────────────────────────────────────────
FROM nginx:alpine-slim@sha256:f761b94f2cb9e8e05e2943d5f773609596113ef69b54e2433a996d109a8f78b7 AS production

RUN apk add --no-cache --upgrade \
  libcrypto3=3.5.8-r0 \
  libssl3=3.5.8-r0

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Give Docker and the VPS operator a meaningful application-level health signal.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://127.0.0.1/ | grep -q '<title>LifeStreak' || exit 1

CMD ["nginx", "-g", "daemon off;"]
