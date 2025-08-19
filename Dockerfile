# --- Etapa de Build ---
# Usa uma imagem do Node.js para instalar as dependências
FROM node:18 AS builder

# Define o diretório de trabalho
WORKDIR /app

# CORRIGIDO: Copia os arquivos de dependência de forma explícita
COPY package.json package.json
COPY package-lock.json package-lock.json

# Instala as dependências
RUN npm install

# Copia o restante dos arquivos do projeto
COPY . .

# --- Etapa de Produção ---
# Usa uma imagem mais leve do Node.js para a imagem final
FROM node:18-alpine

# Define o diretório de trabalho
WORKDIR /app

# Copia as dependências e arquivos de configuração da etapa de build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
COPY --from=builder /app/package-lock.json .

# Copia as pastas de rotas e o frontend
COPY --from=builder /app/routes ./routes
COPY --from=builder /app/public ./public
COPY --from=builder /app/assets ./assets

# Expõe a porta que a aplicação irá usar
EXPOSE 3000

# Executa o aplicativo como um usuário não-root por segurança
USER node

# Define o comando para iniciar a aplicação
CMD ["npm", "start"]