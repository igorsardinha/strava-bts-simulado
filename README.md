# Simulado de Triatlo BTS

![Logo do Projeto](assets/logo_bts.png)

Um aplicativo web para gerenciar e classificar atividades de triatlo do Strava, incluindo natação, ciclismo, corrida e as transições entre elas. O sistema permite que os atletas se conectem com suas contas do Strava, visualizem suas atividades, e acompanhem um ranking em tempo real. Um painel administrativo dedicado oferece controle total sobre as configurações e os dados do simulado.

## 🚀 Funcionalidades

-   **Conexão Segura com o Strava:** Atletas podem se conectar com suas contas usando a API oficial do Strava.
-   **Ranking em Tempo Real:** Visualização de rankings para natação, ciclismo, corrida e um ranking geral, com a opção de filtrar por uma data de evento específica.
-   **Cronômetro Administrativo:** Uma ferramenta de cronômetro exclusiva para administradores, que registra o tempo das baterias e o sincroniza em tempo real com a página principal.
-   **Painel de Administração:** Uma interface segura para gerenciar atividades, configurar o ranking, e monitorar os dados do cronômetro.
-   **Visualização Detalhada:** Detalhes de cada atividade, incluindo ritmo e frequência cardíaca, em um layout expansível.
-   **Exportação de Dados:** Capacidade de exportar o ranking para um arquivo CSV (Excel).

## 🛠️ Instalação e Configuração

Para rodar este projeto, você precisará ter o Node.js e o npm instalados.

1.  **Clone o Repositório:**
    ```bash
    git clone [https://github.com/seu-usuario/seu-repositorio.git](https://github.com/seu-usuario/seu-repositorio.git)
    cd seu-repositorio
    ```

2.  **Instale as Dependências:**
    ```bash
    npm install
    ```

3.  **Configuração do Strava:**
    * Crie uma aplicação em [Strava Developers](https://www.strava.com/settings/api).
    * Defina o **"Authorization Callback Domain"** para `localhost:3000` (ou o URL público que você está usando).
    * Copie o seu `Client ID` e `Client Secret`.

4.  **Configuração de Ambiente:**
    * Crie um arquivo chamado `.env` na raiz do projeto.
    * Adicione suas chaves de API e outras configurações:
    ```
    STRAVA_CLIENT_ID=SEU_CLIENT_ID_AQUI
    STRAVA_CLIENT_SECRET=SEU_CLIENT_SECRET_AQUI
    SESSION_SECRET=UMA_CHAVE_SECRETA_ALEATORIA
    ADMIN_USERNAME=admin
    ADMIN_PASSWORD=sua_senha_aqui
    REDIRECT_URI=http://localhost:3000/api/strava/callback
    ```
    * **Importante:** Se você estiver usando o `ngrok` para testar em dispositivos móveis, atualize `REDIRECT_URI` com o URL gerado pelo `ngrok`.

5.  **Inicialize os Bancos de Dados:**
    * A aplicação usa dois arquivos de banco de dados locais: `db.json` e `db.stopwatch.json`. Eles serão criados automaticamente na primeira vez que o servidor for iniciado.

## 🚀 Como Rodar o Projeto

Para iniciar o servidor, use o comando:

```bash
npm start
```

O aplicativo estará disponível em `http://localhost:3000`.

## 🔒 Acesso ao Painel Administrativo

Para acessar o painel de administração, vá para `http://localhost:3000/admin.html` e use as credenciais que você definiu no seu arquivo `.env`.

---

## 🤝 Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para abrir uma _issue_ ou enviar um _pull request_.
