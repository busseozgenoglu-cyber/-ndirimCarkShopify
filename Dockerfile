FROM node:20-alpine

EXPOSE 3000
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Shopify CLI çalışma zamanında gerekmez.
RUN npm remove @shopify/cli 2>/dev/null || true

COPY . .
RUN npm run build

CMD ["npm", "run", "docker-start"]
