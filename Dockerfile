# --- Etapa de Build ---
# Usa uma imagem do Node.js para instalar as dependências
FROM node:18 AS builder

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependência
COPY package*.json ./

# Instala as dependências, incluindo as de desenvolvimento
# A flag --production aqui não é usada, pois precisamos das devDependencies para o build
RUN npm install

# Copia o restante dos arquivos do projeto
COPY . .

# --- Etapa de Produção ---
# Usa uma imagem mais leve do Node.js para a imagem final
FROM node:18-alpine

# Define o diretório de trabalho
WORKDIR /app

# Copia as dependências da etapa de build, mas apenas as de produção
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .

# Copia o código da sua aplicação
COPY --from=builder /app/server.js .
COPY --from=builder /app/routes ./routes
COPY --from=builder /app/public ./public
COPY --from=builder /app/assets ./assets

# Expõe a porta que a aplicação irá usar
EXPOSE 3000

# Executa o aplicativo como um usuário não-root por segurança
USER node

# Define o comando para iniciar a aplicação
CMD ["npm", "start"]