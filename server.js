const express = require("express");
const bodyParser = require("body-parser");
const config = require("./serverConfig.js");
const utils = require("./utils.js");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const port = process.env.PORT || config.server.port || 5000;

var MongoClient = require("mongodb").MongoClient;

MongoClient.connect(config.mongo.URL, (err, database) => {
	if (err) throw err;
	const db = database.db('payments')
	const deposits = db.collection("deposits");
	const withdrawals = db.collection("withdrawals");
	deposits.createIndex({ "paymentReference": 1 }, { unique: true });
	withdrawals.createIndex({ "operationID": 1 }, { unique: true });

	app.post("/api/deposit", (req, res) => {
		if (!req.body.stellarAddress || req.body.stellarAddress.length === 0) {
			res.status(400).end();
			return;
		}
		utils.storeAddress(req.body.stellarAddress, deposits, res);
	});

	app.post("/api/withdraw", (req, res) => {
		if (!config.bridge.IPs.includes(req.ip)) {
			console.log("Unknown IP calling withdraw:", req.ip);
			res.status(403).end();
			return;
		}
		if (!utils.validWithdraw(req.body)) {
			console.log("Invalid parameters calling withdraw:", req.body);
			res.status(400).end();
			return;
		}
		withdrawals.find({"operationID": req.body.id}).toArray((err, docs) => {
			if (err) {
				console.log('Error looking for existing payment:', err)
				res.status(500).end();
				return
			}

			if (docs.length > 0) {
				res.status(200).end();
				return
			}

			utils.storeWithdraw(req.body, withdrawals, res)
		})
	});

	app.listen(port, () => console.log(`Listening on port ${port}`));
});
