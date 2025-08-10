const express = require("express");
const axios = require("axios");
const fs = require("fs").promises;

const router = express.Router();
const dbPath = "./db.json";

const stravaClientId = process.env.STRAVA_CLIENT_ID;
const stravaClientSecret = process.env.STRAVA_CLIENT_SECRET;
const redirectUri = "http://localhost:3000/api/strava/callback";

const readDb = async () => {
	try {
		const data = await fs.readFile(dbPath, "utf8");
		const db = JSON.parse(data);
		if (!db || !Array.isArray(db.users)) {
			return {
				users: [],
				activities: [],
				config: {},
				stopwatchData: [],
				realTimeStopwatch: {},
			};
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
		if (!db.realTimeStopwatch) {
			db.realTimeStopwatch = {};
		}
		return db;
	} catch (error) {
		if (error.code === "ENOENT" || error instanceof SyntaxError) {
			console.log(
				"Arquivo db.json não encontrado ou inválido. Criando um novo."
			);
			return {
				users: [],
				activities: [],
				config: {},
				stopwatchData: [],
				realTimeStopwatch: {},
			};
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

const getActiveUser = async (req) => {
	const db = await readDb();
	if (req.session.userId) {
		return db.users.find((user) => user.id === req.session.userId);
	}
	return null;
};

router.post("/stopwatch/reset", async (req, res) => {
	let db = await readDb();
	db.realTimeStopwatch = {};
	await saveDb(db);
	res.status(200).json({ message: "Cronômetro zerado com sucesso." });
});

router.post("/stopwatch/real-time-state", async (req, res) => {
	const db = await readDb();
	const activeUser = await getActiveUser(req);
	if (activeUser) {
		db.realTimeStopwatch = {
			userId: activeUser.id,
			elapsedTime: req.body.elapsedTime,
			isRunning: req.body.isRunning,
			laps: req.body.laps,
			lastSaved: Date.now(),
		};
		await saveDb(db);
		res
			.status(200)
			.json({ message: "Estado em tempo real salvo com sucesso." });
	} else {
		res.status(401).json({ message: "Nenhum usuário ativo para salvar." });
	}
});

router.get("/stopwatch/real-time-state", async (req, res) => {
	const db = await readDb();
	if (db.realTimeStopwatch && db.realTimeStopwatch.elapsedTime !== undefined) {
		res.json(db.realTimeStopwatch);
	} else {
		res.status(404).json({ message: "Nenhum cronômetro ativo." });
	}
});

router.post("/stopwatch/save", async (req, res) => {
	const stopwatchData = req.body;
	let db = await readDb();

	if (req.session.userId) {
		stopwatchData.userId = req.session.userId;
		db.stopwatchData.push(stopwatchData);
		await saveDb(db);
		res
			.status(200)
			.json({ message: "Dados do cronômetro salvos com sucesso." });
	} else {
		res.status(401).json({ message: "Nenhum usuário ativo na sessão." });
	}
});

router.get("/status", async (req, res) => {
	const activeUser = await getActiveUser(req);
	if (activeUser) {
		res.json({ status: "connected" });
	} else {
		res.json({ status: "disconnected" });
	}
});

router.get("/user", async (req, res) => {
	const activeUser = await getActiveUser(req);
	if (activeUser) {
		res.json({
			name: activeUser.name,
			profile_photo: activeUser.profile_photo,
		});
	} else {
		res.status(404).json({ message: "Nenhum usuário ativo." });
	}
});

router.get("/saved-activities", async (req, res) => {
	const db = await readDb();
	const activeUser = await getActiveUser(req);
	if (activeUser) {
		const userActivities = db.activities.filter(
			(activity) => activity.athlete.id === activeUser.id
		);
		res.json({ activities: userActivities, configDate: db.config.rankingDate });
	} else {
		res.json({ activities: [], configDate: null });
	}
});

router.get("/leaderboard", async (req, res) => {
	const db = await readDb();

	let activitiesToRank = db.activities;
	if (db.config.rankingDate) {
		const date = db.config.rankingDate;
		activitiesToRank = activitiesToRank.filter((activity) =>
			activity.start_date_local.startsWith(date)
		);
	}

	const athleteIdsInRanking = [
		...new Set(activitiesToRank.map((activity) => activity.athlete.id)),
	];
	const rankedUsers = db.users.filter((user) =>
		athleteIdsInRanking.includes(user.id)
	);

	const userData = rankedUsers.map((user) => {
		const userActivities = activitiesToRank.filter(
			(activity) => activity.athlete.id === user.id
		);

		const rideActivities = userActivities.filter(
			(activity) => activity.type === "Ride"
		);
		const runActivities = userActivities.filter(
			(activity) => activity.type === "Run"
		);
		const swimActivities = userActivities.filter(
			(activity) => activity.type === "Swim"
		);
		let transitionActivities = [];
		if (db.config.considerTransition) {
			transitionActivities = userActivities.filter(
				(activity) => activity.type === "Transition"
			);
		}

		const totalRideTime = rideActivities.reduce(
			(sum, activity) => sum + activity.moving_time,
			0
		);
		const totalRunTime = runActivities.reduce(
			(sum, activity) => sum + activity.moving_time,
			0
		);
		const totalSwimTime = swimActivities.reduce(
			(sum, activity) => sum + activity.moving_time,
			0
		);
		const totalTransitionTime = transitionActivities.reduce(
			(sum, activity) => sum + activity.moving_time,
			0
		);

		const totalRideDistance = rideActivities.reduce(
			(sum, activity) => sum + activity.distance,
			0
		);
		const totalRunDistance = runActivities.reduce(
			(sum, activity) => sum + activity.distance,
			0
		);
		const totalSwimDistance = swimActivities.reduce(
			(sum, activity) => sum + activity.distance,
			0
		);

		const totalCombinedTime =
			totalRideTime + totalRunTime + totalSwimTime + totalTransitionTime;

		return {
			name: user.name,
			profile_photo: user.profile_photo,
			start_time:
				userActivities.length > 0
					? new Date(userActivities[0].start_date_local)
							.toTimeString()
							.slice(0, 5)
					: "N/A",
			total_ride_time: totalRideTime,
			total_run_time: totalRunTime,
			total_swim_time: totalSwimTime,
			total_transition_time: totalTransitionTime,
			total_ride_distance: totalRideDistance,
			total_run_distance: totalRunDistance,
			total_swim_distance: totalSwimDistance,
			total_combined_time: totalCombinedTime,
		};
	});

	const combinedRanking = [...userData].sort(
		(a, b) => a.total_combined_time - b.total_combined_time
	);
	const cyclingRanking = [...userData].sort(
		(a, b) => a.total_ride_time - b.total_ride_time
	);
	const runningRanking = [...userData].sort(
		(a, b) => a.total_run_time - b.total_run_time
	);
	const swimmingRanking = [...userData].sort(
		(a, b) => a.total_swim_time - b.total_swim_time
	);

	res.json({
		combined: combinedRanking,
		cycling: cyclingRanking,
		running: runningRanking,
		swimming: swimmingRanking,
		config: db.config.rankingDate,
		considerTransition: db.config.considerTransition || false,
	});
});

router.get("/activity/:id", async (req, res) => {
	const db = await readDb();
	const foundActivity = db.activities.find(
		(activity) => activity.id.toString() === req.params.id
	);

	if (foundActivity) {
		res.json(foundActivity);
	} else {
		res.status(404).json({ message: "Atividade não encontrada." });
	}
});

router.get("/update-all-activities", async (req, res) => {
	let db = await readDb();
	const allUsers = db.users;

	for (const user of allUsers) {
		try {
			if (user.access_token) {
				const activitiesResponse = await axios.get(
					"https://www.strava.com/api/v3/athlete/activities",
					{
						headers: {
							Authorization: `Bearer ${user.access_token}`,
						},
						params: {
							per_page: 200,
						},
					}
				);

				const userActivities = activitiesResponse.data;

				const processedActivities = [];
				let lastActivityType = null;

				for (const activity of userActivities) {
					if (
						activity.type === "Workout" &&
						(lastActivityType === "Swim" || lastActivityType === "Ride")
					) {
						activity.type = "Transition";
					}
					processedActivities.push(activity);
					if (["Swim", "Ride", "Run", "Transition"].includes(activity.type)) {
						lastActivityType = activity.type;
					}
				}

				db.activities = db.activities
					.filter((activity) => activity.athlete.id !== user.id)
					.concat(processedActivities);
				await saveDb(db);
				console.log(`Atividades do usuário ${user.name} atualizadas.`);
			}
		} catch (error) {
			console.error(
				`Erro ao buscar atividades para o usuário ${user.name}:`,
				error.response?.data || error.message
			);
		}
	}

	res.json({
		message: "Todas as atividades foram atualizadas com sucesso.",
	});
});

router.get("/disconnect", async (req, res) => {
	req.session.destroy();
	res.json({ message: "Desconectado com sucesso." });
});

router.get("/auth", (req, res) => {
	// CORRIGIDO: Não destrói a sessão aqui
	const scope = "read,activity:read_all";
	const stravaAuthUrl = `https://www.strava.com/oauth/authorize?client_id=${stravaClientId}&response_type=code&redirect_uri=${redirectUri}&scope=${scope}`;
	res.redirect(stravaAuthUrl);
});

router.get("/callback", async (req, res) => {
	const { code } = req.query;

	if (!code) {
		return res.status(400).send("Código de autorização não recebido.");
	}

	try {
		const response = await axios.post(
			"https://www.strava.com/oauth/token",
			null,
			{
				params: {
					client_id: stravaClientId,
					client_secret: stravaClientSecret,
					code: code,
					grant_type: "authorization_code",
				},
			}
		);

		const { access_token, refresh_token, athlete } = response.data;

		let db = await readDb();
		const existingUser = db.users.find((u) => u.id === athlete.id);

		if (existingUser) {
			existingUser.access_token = access_token;
			existingUser.refresh_token = refresh_token;
		} else {
			const newUser = {
				id: athlete.id,
				name: `${athlete.firstname} ${athlete.lastname}`,
				profile_photo: athlete.profile_medium,
				access_token,
				refresh_token,
			};
			db.users.push(newUser);
		}

		req.session.userId = athlete.id;
		await saveDb(db);
		res.redirect("/");
	} catch (error) {
		console.error(
			"Erro na autenticação do Strava:",
			error.response?.data || error.message
		);
		res.status(500).send("Erro ao autenticar com o Strava.");
	}
});

router.get("/activities", async (req, res) => {
	const db = await readDb();
	const activeUser = await getActiveUser(req);

	if (!activeUser) {
		return res
			.status(404)
			.json({ message: "Nenhum usuário ativo encontrado." });
	}

	try {
		const activitiesResponse = await axios.get(
			"https://www.strava.com/api/v3/athlete/activities",
			{
				headers: {
					Authorization: `Bearer ${activeUser.access_token}`,
				},
				params: {
					per_page: 10,
				},
			}
		);

		const userActivities = activitiesResponse.data;

		const processedActivities = [];
		let lastActivityType = null;

		for (const activity of userActivities) {
			if (
				activity.type === "Workout" &&
				(lastActivityType === "Swim" || lastActivityType === "Ride")
			) {
				activity.type = "Transition";
			}
			processedActivities.push(activity);
			if (["Swim", "Ride", "Run", "Transition"].includes(activity.type)) {
				lastActivityType = activity.type;
			}
		}

		db.activities = db.activities
			.filter((activity) => activity.athlete.id !== activeUser.id)
			.concat(processedActivities);
		await saveDb(db);

		res.json({
			message: "Atividades obtidas e salvas com sucesso.",
			data: processedActivities,
		});
	} catch (error) {
		console.error(
			"Erro ao buscar atividades:",
			error.response?.data || error.message
		);
		res
			.status(500)
			.json({
				message:
					"Erro ao buscar as atividades do atleta. O token pode ter expirado ou o escopo não foi suficiente.",
			});
	}
});

module.exports = router;
