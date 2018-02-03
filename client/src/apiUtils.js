const deposit = async (token, stellarAddress, centAmount) => {
	var data = { token, stellarAddress, centAmount };
	console.log('y')
	const response = await fetch("/api/deposit", {
		method: "POST",
		body: JSON.stringify(data),
		headers: new Headers({
			"Content-Type": "application/json"
		})
	});
	console.log('x')
	const body = await response.json();
	console.log('a')
	if (response.status !== 200) throw new Error(body.message);
	console.log('ab')

	if (!body.transactionID) throw new Error('No transactionID returned');
	console.log('abc')
	return body.transactionID
};

const connect = async (authCode) => {
	var data = { authCode };
	const response = await fetch("/api/connect", {
		method: "POST",
		body: JSON.stringify(data),
		headers: new Headers({
			"Content-Type": "application/json"
		})
	});
	const body = await response.json();
	if (response.status !== 200) throw Error(body.message);

	if (!body.reference) throw Error('No withdrawal reference returned');
	if (!body.loginLink) throw Error('No login link returned');
	console.log(body.loginLink)
	return [body.reference, body.loginLink]
};

export { deposit, connect };
