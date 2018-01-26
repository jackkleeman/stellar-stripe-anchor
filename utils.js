const uid = require("uid");

const storeAddress = async (stellarAddress, deposits, res, tries = 0) => {
	const paymentReference = uid(8);
	try {
		await deposits.insertOne({
			paymentReference: paymentReference,
			address: stellarAddress
		});
		res.send({ paymentReference });
	} catch (e) {
		if (e.name == "MongoError" && e.code == 11000) {
			// duplicate paymentReference, try again
			if (tries > 5) {
				console.log(
					"Received 5 duplicate reference errors, something is wrong. Reference:",
					paymentReference
				);
				res.status(500).end();
				return;
			}
			return await storeAddress(stellarAddress, deposits, res, tries + 1);
		} else {
			console.log("Unknown mongo error, code:", e.code);
			res.status(500).end();
			return;
		}
	}
};

const storeWithdraw = async (body, withdrawals, res) => {
	try {
		await withdrawals.insertOne({
			operationID: body.id,
			from: body.from,
			route: body.route,
			amount: body.amount,
			asset_code: body.asset_code,
			asset_issuer: body.asset_issuer,
			memo_type: body.memo_type,
			memo: body.memo,
			data: body.data,
			transaction_id: transaction_id
		});
		res.send({ paymentReference });
	} catch (e) {
		if (e.name == "MongoError" && e.code == 11000) {
			// duplicate paymentReference, try again
			if (tries > 5) {
				console.log(
					"Received 5 duplicate reference errors, something is wrong. Reference:",
					paymentReference
				);
				res.status(500).end();
				return;
			}
			return await storeAddress(stellarAddress, deposits, res, tries + 1);
		} else {
			console.log("Unknown mongo error, code:", e.code);
			res.status(500).end();
			return;
		}
	}
};

module.exports = { storeAddress };
