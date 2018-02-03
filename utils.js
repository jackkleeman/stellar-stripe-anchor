const config = require("./serverConfig.js");
var request = require("request-promise-native");
const TEST = typeof global.it === 'function' // detect mocha

const stripe = TEST ? require("stripe")(config.testStripe.secretKey) : require("stripe")(config.stripe.secretKey)

const validWithdraw = body => {
	if (
		!(
			body.id &&
			body.from &&
			body.amount &&
			body.asset_code &&
			body.asset_issuer &&
			body.memo_type &&
			body.memo &&
			body.transaction_id
		)
	) {
		return false;
	}
	if (body.from.length !== 56) return false;
	if (parseFloat(body.amount) < 10.00) return false;
	if (body.asset_code !== "USD") return false;
	if (body.asset_issuer !== config.bridge.issuerID) return false;
	if (body.memo_type !== "text") return false;
	if (body.memo.length !== 21) return false;
	if (!body.memo.startsWith("acct_")) return false;
	if (body.transaction_id.length !== 64) return false;

	return true;
};

getConnectToken = async authCode => {
	var options = {
		method: "POST",
		url: "https://connect.stripe.com/oauth/token",
		formData: {
			grant_type: "authorization_code",
			code: authCode,
			client_secret: config.stripe.secretKey
		},
		json: true,
		resolveWithFullResponse: true,
		simple: false
	};
	response = await request(options);
	if (response.statusCode !== 200) {
		throw Error(response.body.error_description);
	}

	return response.body.stripe_user_id;
};

getLoginLink = async accountID => {
	res = await stripe.accounts.createLoginLink(accountID);
	return res.url;
};

payUser = async (accountID, centAmount, idempotencyKey, metadata = {}) => {
	const transfer = await stripe.transfers.create(
		{
			amount: centAmount,
			currency: "usd",
			destination: accountID,
			metadata
		},
		{
			idempotency_key: idempotencyKey // currently using stellar txid as idempotency
		}
	);
	return transfer;
};

depositAmountMinusFees = amount => {
	return Math.floor(amount * 0.971) - 30; // 2.9% + $0.30
};

withdrawalAmountMinusFees = amount => {
	return Math.floor(amount * 0.98) - 225; // 2% + $2.25
};

const bridgePay = async (uniqueID, amount, stellarAddress) => {
	var options = {
		method: "POST",
		url: config.bridge.payEndpoint,
		formData: {
			id: uniqueID,
			source: config.bridge.issuerSeed, // by passing this we avoid needing to set it in bridge config
			destination: stellarAddress,
			amount,
			asset_code: "USD",
			asset_issuer: config.bridge.issuerID
		},
		json: true,
		resolveWithFullResponse: true, // we need statuscode
		simple: false // dont reject on bad status
	};
	response = await request(options);
	if (response.statusCode !== 200) {
		throw Error(response.body.message);
	}

	return response.body.hash;
};

module.exports = {
	validWithdraw,
	getConnectToken,
	getLoginLink,
	payUser,
	depositAmountMinusFees,
	withdrawalAmountMinusFees,
	bridgePay
};
