module.exports = {
	bridge: {
		IPs: ["::ffff:127.0.0.1", "::1"], // Exclusively accept withdrawal API calls from these IPs
		payEndpoint: "http://127.0.0.1:8006/payment",
		// this value also exists in clientConfig, public/.well-known/stellar.toml, bridge.cfg
		issuerID: "GDHFQWX2S7J7UNV4VGRRKS7L7KW5FLKCXYR6VV32PTBDYNPNBARPKUPG",
		issuerSeed: "SDSXMPRUCPQYNETHUB3BZO7UNK52QSDRLM2THUQ37IAGXYDQSLHJNGEY"
	},
	server: {
		port: 5000
	},
	stripe: {
		secretKey: "",
		connectClientID: ""
	},
	testStripe: {
		secretKey: "",
		connectClientID: ""
	}
};
