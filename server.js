const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const session = require("express-session"); // NOVO: Importa o pacote de sessão

dotenv.config();

const stravaRoutes = require("./routes/strava");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// NOVO: Configuração da sessão
app.use(
	session({
		secret: process.env.SESSION_SECRET || "chave-secreta-padrao",
		resave: false,
		saveUninitialized: true,
		cookie: { secure: false }, // Use `secure: true` em ambiente de produção com HTTPS
	})
);

app.use("/api/strava", stravaRoutes);
app.use("/api/admin", adminRoutes);

app.listen(PORT, () => {
	console.log(`Servidor rodando em http://localhost:${PORT}`);
});
