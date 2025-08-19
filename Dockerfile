# -----------------------------
# Etapa 1 - Build
# -----------------------------
FROM node:20-alpine AS builder

# Define diretório de trabalho
WORKDIR /app

# Copia apenas arquivos essenciais para instalar dependências
COPY package*.json ./

# Instala dependências em modo produção
RUN npm ci --only=production

# -----------------------------
# Etapa 2 - Runtime
# -----------------------------
FROM node:20-alpine

# Diretório da aplicação
WORKDIR /app

# Copia dependências já instaladas da etapa anterior
COPY --from=builder /app/node_modules ./node_modules

# Copia o restante dos arquivos
COPY . .

# Porta exposta pela aplicação
EXPOSE 3000

# Variável de ambiente (ajuste conforme necessário)
ENV NODE_ENV=production

# Comando para iniciar a aplicação
CMD ["node", "server.js"]
