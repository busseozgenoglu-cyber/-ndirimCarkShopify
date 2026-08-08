# ── 1. Aşama: derleme (devDependencies dahil tüm paketler gerekli) ──────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
# Hem dependencies hem devDependencies yüklenir (vite, react-router/dev, vite-tsconfig-paths …)
RUN npm ci && npm cache clean --force

COPY . .
RUN npm run build       # vite build + react-router build

# prisma generate çalıştırılır ki client dist'e dahil olsun
RUN npx prisma generate

# ── 2. Aşama: çalışma zamanı (yalnızca production bağımlılıkları) ────────────
FROM node:20-alpine AS runner

EXPOSE 3000
WORKDIR /app

ENV NODE_ENV=production

# Yalnızca production bağımlılıkları
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Derleme çıktısını ve Prisma client'ı kopyala
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Uygulama kaynak dosyaları (prisma migrate deploy için schema gerekli)
COPY prisma ./prisma
COPY app/shopify.server.js ./app/shopify.server.js
COPY app/db.server.js ./app/db.server.js
COPY react-router.config.js ./react-router.config.js
COPY shopify.app.toml ./shopify.app.toml
COPY public* ./public/

CMD ["npm", "run", "docker-start"]
