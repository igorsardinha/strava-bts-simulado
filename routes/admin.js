const express = require("express");
const fs = require("fs").promises;
const router = express.Router();
const dbPath = "./db.json";
const adminUsername = process.env.ADMIN_USERNAME;
const adminPassword = process.env.ADMIN_PASSWORD;

// Middleware de autenticação
const isAuthenticated = (req, res, next) => {
	if (req.session.isAuthenticated) {
		next();
	} else {
		res.status(401).json({ message: "Não autorizado. Por favor, faça login." });
	}
};

const readDb = async () => {
	try {
		const data = await fs.readFile(dbPath, "utf8");
		const db = JSON.parse(data);
		if (!db || !Array.isArray(db.users)) {
			return { users: [], activities: [], config: {}, stopwatchData: [] };
		}
		if (!Array.isArray(db.activities)) {
			db.activities = [];
		}
		if (!db.config) {
			db.config = {};
		}
		if (!db.stopwatchData) {
			db.stopwatchData = [];
		}
		return db;
	} catch (error) {
		if (error.code === "ENOENT" || error instanceof SyntaxError) {
			console.log(
				"Arquivo db.json não encontrado ou inválido. Criando um novo."
			);
			return { users: [], activities: [], config: {}, stopwatchData: [] };
		}
		console.error("Erro ao ler db.json:", error);
		return { users: [], activities: [] };
	}
};

const saveDb = async (data) => {
	try {
		await fs.writeFile(dbPath, JSON.stringify(data, null, 2), "utf8");
	} catch (error) {
		console.error("Erro ao salvar db.json:", error);
	}
};

router.post("/login", (req, res) => {
	const { username, password } = req.body;
	if (username === adminUsername && password === adminPassword) {
		req.session.isAuthenticated = true;
		res.status(200).json({ message: "Login bem-sucedido!" });
	} else {
		res.status(401).json({ message: "Credenciais inválidas." });
	}
});

router.get("/logout", (req, res) => {
	req.session.destroy();
	res.status(200).json({ message: "Logout bem-sucedido." });
});

router.get("/status", (req, res) => {
	if (req.session.isAuthenticated) {
		res.status(200).json({ status: "authenticated" });
	} else {
		res.status(200).json({ status: "unauthenticated" });
	}
});

router.use(isAuthenticated);

router.post("/config/ranking-date", async (req, res) => {
	const { date, considerTransition } = req.body;
	const db = await readDb();
	db.config.rankingDate = date;
	db.config.considerTransition = considerTransition;
	await saveDb(db);
	res.status(200).json({ message: "Configuração de data salva com sucesso." });
});

router.delete("/config/ranking-date", async (req, res) => {
	const db = await readDb();
	delete db.config.rankingDate;
	await saveDb(db);
	res.status(200).json({ message: "Filtro de data removido com sucesso." });
});

// Endpoint para buscar dados do cronômetro
router.get("/stopwatch-data", async (req, res) => {
	const db = await readDb();
	const stopwatchDataWithUser = db.stopwatchData.map((data) => {
		const user = db.users.find((u) => u.id === data.userId);
		return {
			...data,
			userName: user ? user.name : "Usuário Desconhecido",
		};
	});
	res.json(stopwatchDataWithUser);
});

// Endpoint para excluir todos os dados do cronômetro
router.delete("/stopwatch-data/all", async (req, res) => {
	let db = await readDb();
	db.stopwatchData = [];
	await saveDb(db);
	res
		.status(200)
		.json({
			message: "Todos os dados do cronômetro foram excluídos com sucesso.",
		});
});

router.get("/users", async (req, res) => {
	const db = await readDb();
	res.json(db.users);
});

router.get("/activities", async (req, res) => {
	const { date, limit, athleteId } = req.query;
	const db = await readDb();
	let filteredActivities = [...db.activities];

	if (athleteId) {
		filteredActivities = filteredActivities.filter(
			(activity) => activity.athlete.id.toString() === athleteId
		);
	}

	if (date) {
		filteredActivities = filteredActivities.filter((activity) =>
			activity.start_date_local.startsWith(date)
		);
	}

	if (limit) {
		filteredActivities = filteredActivities.slice(0, parseInt(limit));
	}

	const enrichedActivities = filteredActivities.map((activity) => {
		const athlete = db.users.find((user) => user.id === activity.athlete.id);
		return {
			...activity,
			athlete: {
				...activity.athlete,
				firstname: athlete ? athlete.name.split(" ")[0] : "Desconhecido",
				lastname: athlete ? athlete.name.split(" ")[1] : "",
			},
		};
	});

	res.json(enrichedActivities);
});

router.delete("/activity/:id", async (req, res) => {
	const activityId = req.params.id;
	let db = await readDb();
	const initialLength = db.activities.length;
	db.activities = db.activities.filter(
		(activity) => activity.id.toString() !== activityId
	);

	if (db.activities.length < initialLength) {
		await saveDb(db);
		res.status(200).json({ message: "Atividade excluída com sucesso." });
	} else {
		res.status(404).json({ message: "Atividade não encontrada." });
	}
});

router.delete("/activities/all", async (req, res) => {
	let db = await readDb();
	db.activities = [];
	await saveDb(db);
	res
		.status(200)
		.json({ message: "Todas as atividades foram excluídas com sucesso." });
});

router.put("/activity/:id", async (req, res) => {
	const activityId = req.params.id;
	const { name, distance, moving_time } = req.body;
	let db = await readDb();
	const activityToUpdate = db.activities.find(
		(activity) => activity.id.toString() === activityId
	);

	if (activityToUpdate) {
		activityToUpdate.name = name;
		activityToUpdate.distance = parseFloat(distance);
		activityToUpdate.moving_time = parseInt(moving_time);
		await saveDb(db);
		res.status(200).json({ message: "Atividade atualizada com sucesso." });
	} else {
		res.status(404).json({ message: "Atividade não encontrada." });
	}
});

module.exports = router;
