# lifestreak Dockerfile — multi-stage Vite PWA build + nginx serve
# Stage 1: build the Vite SPA into dist/
# Stage 2: serve dist/ via nginx

# ─── Stage 1: build ─────────────────────────────────────────────────────
FROM node:26.8.1-alpine@sha256:2d984a15c9b54fd0aeb608b8e0d0d83529eb34d2966db27a1fb4f1edc3d298a3 AS build

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
FROM nginx:alpine-slim@sha256:1870de6d59aafee152589b64404556d2535922cdd998e6dac1c4888c938ed8f9 AS production

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
