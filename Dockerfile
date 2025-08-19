# --- Etapa de Build ---
FROM node:18 AS builder
WORKDIR /app
COPY package.json package.json
COPY package-lock.json package-lock.json
COPY .env .env
COPY ./public/assets ./public/assets
RUN npm install
COPY . .

# --- Etapa de Produção ---
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
COPY --from=builder /app/package-lock.json .
COPY --from=builder /app/.env .
COPY --from=builder /app/public ./public
COPY --from=builder /app/assets ./assets

EXPOSE 3000
USER node
CMD ["npm", "start"]