const express = require("express");
const bodyParser = require("body-parser");
const config = require("./serverConfig.js");
const utils = require("./utils.js");
const Log = require("log");
const log = new Log("info");


const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const port = process.env.PORT || config.server.port || 5000;
const DEV = process.env.NODE_ENV === "development";
const PROD = !DEV;
const TEST = typeof global.it === 'function' // detect mocha

const stripe = TEST ? require("stripe")(config.testStripe.secretKey) : require("stripe")(config.stripe.secretKey)

app.post("/api/deposit", (req, res) => {
	if (
		!req.body.stellarAddress ||
		req.body.stellarAddress.length !== 56 ||
		!req.body.token ||
		!req.body.token.id ||
		!req.body.centAmount ||
		req.body.centAmount < 1000 ||
		req.body.centAmount > 100000000
	) {
		res.status(400).send({ message: "Invalid input" });
		return;
	}
	log.info(
		"Processing a deposit to address:",
		req.body.stellarAddress,
		"with amount:",
		req.body.centAmount,
		"from card token:",
		req.body.token.id
	);
	// First auth charge, but do not capture until money is sent via Stellar.
	const charge = stripe.charges
		.create({
			amount: req.body.centAmount,
			currency: "usd",
			source: req.body.token.id,
			receipt_email: req.body.token.email,
			statement_descriptor: "Stellar USD deposit",
			description: req.body.stellarAddress,
			capture: false
		})
		.then(charge => {
			log.info(
				"Successfully created charge:",
				charge.id,
				"from card token:",
				req.body.token.id
			);
			let centAmountMinusFees = utils.depositAmountMinusFees(
				req.body.centAmount
			);
			let amountMinusFees = centAmountMinusFees / 100;
			return Promise.all([
				charge.id,
				utils.bridgePay(
					charge.id,
					amountMinusFees,
					req.body.stellarAddress
				)
			]);
		})
		.then(([chargeID, txid]) => {
			log.info(
				"Successfully paid via bridge to:",
				req.body.stellarAddress,
				"from charge:",
				chargeID
			);
			return Promise.all([txid, stripe.charges.capture(chargeID)]);
		})
		.then(([txid, charge]) => {
			log.info("Successfully captured charge:", charge.id);
			res.send({
				transactionID: txid
			});
		})
		.catch(err => {
			log.alert("Failed to process deposit with message:", err.message);
			res.status(500).send({ message: err.message });
		});

	// utils.storeAddress(req.body.stellarAddress, deposits, res);
});

app.post("/api/connect", (req, res) => {
	if (!req.body.authCode || req.body.authCode.length !== 35) {
		res.status(400).send({ message: "Invalid input" });
		return;
	}
	log.debug("Processing a new connection");
	utils
		.getConnectToken(req.body.authCode)
		.then(accountID => {
			return Promise.all([accountID, utils.getLoginLink(accountID)]);
		})
		.then(([accountID, loginLink]) => {
			log.info("Successfully made connection with reference", accountID);
			res.send({ reference: accountID, loginLink });
		})
		.catch(err => {
			log.error("Failed to connect new user with message:", err.message);
			res.status(500).send({ message: err.message });
		});
});

app.post("/api/withdraw", (req, res) => {
	if (!config.bridge.IPs.includes(req.ip)) {
		log.warning("Unknown IP calling withdraw:", req.ip);
		res.status(403).end();
		return;
	}
	if (!utils.validWithdraw(req.body)) {
		log.error("Invalid parameters calling withdraw:", req.body);
		res.status(400).end();
		return;
	}

	log.debug("Processing a new withdrawal");
	let centAmount = Math.floor(parseFloat(req.body.amount) * 100);
	let amountMinusFees = utils.withdrawalAmountMinusFees(centAmount);
	utils
		.payUser(req.body.memo, amountMinusFees, req.body.transaction_id, {
			transactionID: req.body.transaction_id,
			from: req.body.from
		})
		.then(transfer => {
			log.info(
				"Successfully paid out withdrawal to: ",
				req.body.memo,
				"with stripe id:",
				transfer.id,
				"from: ",
				req.body.from,
				"in transaction:",
				req.body.transaction_id
			);
			res.status(200).end();
		})
		.catch(err => {
			log.alert(
				"Failed to pay out withdrawal. This will not be retried automatically. Message:",
				err.message
			);
			res.status(500).end(); // WARN bridge won't actually retry on this, but this may change soon
		});
});

if (PROD) {
	app.use(
		express.static("client/build", {
			setHeaders: function(res, path, stat) {
				if (path.endsWith(".well-known/stellar.toml"))
					res.set("Access-Control-Allow-Origin", "*");
			}
		})
	);
}

if (TEST) {
	app.enable("trust proxy"); // needed to spoof IPs in tests
}

module.exports = app.listen(port, () =>
	console.log(`Listening on port ${port}`)
);
