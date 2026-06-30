# lifestreak Dockerfile — multi-stage Vite PWA build + nginx serve
# Stage 1: build the Vite SPA into dist/
# Stage 2: serve dist/ via nginx

# ─── Stage 1: build ─────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY pnpm-lock.yaml* ./
RUN \
  if [ -f pnpm-lock.yaml ]; then \
    corepack enable && corepack prepare pnpm@latest --activate && \
    pnpm install --frozen-lockfile; \
  else \
    npm install --no-audit --no-fund --include=dev; \
  fi

COPY . .
RUN npm run build

# ─── Stage 2: serve ─────────────────────────────────────────────────────
FROM nginx:alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]