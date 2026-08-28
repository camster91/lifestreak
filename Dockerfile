# lifestreak Dockerfile — multi-stage Vite PWA build + nginx serve
# Stage 1: build the Vite SPA into dist/
# Stage 2: serve dist/ via nginx

# ─── Stage 1: build ─────────────────────────────────────────────────────
FROM node:22.22.0-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY .npmrc .nvmrc .node-version ./
RUN npm install --global npm@11.17.0 \
  && npm run toolchain:check \
  && npm ci --no-audit --no-fund --include=dev

COPY . .
RUN npm run build

# ─── Stage 2: serve ─────────────────────────────────────────────────────
FROM nginx:alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Give Docker and the VPS operator a meaningful application-level health signal.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://127.0.0.1/ | grep -q '<title>LifeStreak</title>' || exit 1

CMD ["nginx", "-g", "daemon off;"]
