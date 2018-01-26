const deposit = async stellarAddress => {
	var data = { stellarAddress };
	const response = await fetch("/api/deposit", {
		method: "POST",
		body: JSON.stringify(data),
		headers: new Headers({
			"Content-Type": "application/json"
		})
	});
	const body = await response.json();

	if (response.status !== 200) throw Error(body.message);

	return body.paymentReference;
};

export { deposit };
