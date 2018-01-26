module.exports = {
	bridge: {
		IPs: ["127.0.0.1", "::1"] // Exclusively accept withdrawal API calls from these IPs
	},
	mongo: {
		URL: "mongodb://localhost:27017/"
	},
	server: {
		port: 5000
	}
};
