var request = require("supertest");
var should = require("should");

var StellarSdk = require("stellar-sdk");
StellarSdk.Network.useTestNetwork();
var stellarServer = new StellarSdk.Server(
  "https://horizon-testnet.stellar.org"
);
const config = require("../serverConfig.js");
const stripe = require("stripe")(config.testStripe.secretKey);

const testWorkingCard = "tok_bypassPending";
const testAddress = "GALA4KQCML27U5MJCBMR4HEQZAAN24OWVGZIY2EACA4N7S32EJ7VV52D";
const testSecret = "SBDOPGPSIXW3TH3TA6CEAKIX4H2JYBUVGAEH5WEMVFCLKJDMV6QMYVPH";
const token = { id: testWorkingCard, email: "jack@example.com" };

var crypto = require("crypto");

verifyTx = async (txID, from, to, amount, issuerID, assetCode) => {
  let ops = await stellarServer
    .operations()
    .forTransaction(txID)
    .call();
  should.exist(ops.records);
  should.exist(ops.records[0]);
  let op = ops.records[0];
  should.exist(op.from);
  should.exist(op.to);
  should.exist(op.amount);
  should.exist(op.asset_issuer);
  should.exist(op.asset_code);
  op.from.should.equal(from);
  op.to.should.equal(to);
  op.amount.should.equal(amount);
  op.asset_issuer.should.equal(issuerID);
};

describe("deposits", function() {
  var server;
  beforeEach(function() {
    delete require.cache[require.resolve("../server")];
    server = require("../server");
  });
  afterEach(function() {
    server.close();
  });
  it("accepts and pays deposit", function() {
    this.timeout(8000);
    centAmount = 100000; // $1000

    return request(server)
      .post("/api/deposit")
      .send({ token, centAmount, stellarAddress: testAddress })
      .expect(200)
      .then(res => {
        should.exist(res.body.transactionID);
        res.body.transactionID.length.should.equal(64);
        return verifyTx(
          res.body.transactionID,
          config.bridge.issuerID,
          testAddress,
          "970.7000000",
          config.bridge.issuerID,
          "USD"
        );
      });
  });
  it("rejects low amount", () => {
    centAmount = 950; // $9.50
    return request(server)
      .post("/api/deposit")
      .send({ token, centAmount, stellarAddress: testAddress })
      .expect(400);
  });
  it("rejects high amount", () => {
    centAmount = 100000001; // $1000000.01
    return request(server)
      .post("/api/deposit")
      .send({ token, centAmount, stellarAddress: testAddress })
      .expect(400);
  });
  it("rejects invalid address", () => {
    centAmount = 1000; // $10
    return request(server)
      .post("/api/deposit")
      .send({ token, centAmount, stellarAddress: testAddress + "A" })
      .expect(400);
  });
  it("rejects invalid token", function() {
    this.timeout(5000);
    centAmount = 1000; // $10
    let brokenToken = Object.assign({}, token);
    brokenToken.id = brokenToken.id + "a";
    return request(server)
      .post("/api/deposit")
      .send({ token: brokenToken, centAmount, stellarAddress: testAddress })
      .expect(500);
  });
});

checkBalance = async (account, centAmount) => {
  let balance = await stripe.balance.retrieve({
    stripe_account: account
  });
  should.exist(balance);
  should.exist(balance.pending);
  should.exist(balance.available[0]);
  balance.available[0].amount.should.equal(centAmount);
};

describe("withdrawal endpoint", function() {
  var server;
  var testAccount;
  before(function() {
    this.timeout(3000);
    return stripe.accounts
      .create({
        type: "custom",
        country: "US"
      })
      .then(account => {
        testAccount = account.id;
      });
  });
  beforeEach(function() {
    delete require.cache[require.resolve("../server")];
    server = require("../server");
  });
  afterEach(function() {
    server.close();
  });

  it("allows withdrawal", function() {
    this.timeout(10000);
    const txID = crypto.randomBytes(32).toString("hex");

    return request(server)
      .post("/api/withdraw")
      .send({
        id: 50,
        from: testAddress,
        amount: "20.0000000",
        asset_code: "USD",
        asset_issuer: config.bridge.issuerID,
        memo_type: "text",
        memo: testAccount,
        transaction_id: txID
      })
      .expect(200)
      .then(() => {
        return checkBalance(testAccount, 1735);
      });
  });

  it("rejects low amount", function() {
    this.timeout(10000);
    const txID = crypto.randomBytes(32).toString("hex");

    return request(server)
      .post("/api/withdraw")
      .send({
        id: 50,
        from: testAddress,
        amount: "9.5000000",
        asset_code: "USD",
        asset_issuer: config.bridge.issuerID,
        memo_type: "text",
        memo: testAccount,
        transaction_id: txID
      })
      .expect(400);
  });

  it("rejects invalid from", function() {
    this.timeout(10000);
    const txID = crypto.randomBytes(32).toString("hex");

    return request(server)
      .post("/api/withdraw")
      .send({
        id: 50,
        from: testAddress + "A",
        amount: "20.0000000",
        asset_code: "USD",
        asset_issuer: config.bridge.issuerID,
        memo_type: "text",
        memo: testAccount,
        transaction_id: txID
      })
      .expect(400);
  });

  it("rejects invalid asset code", function() {
    this.timeout(10000);
    const txID = crypto.randomBytes(32).toString("hex");

    return request(server)
      .post("/api/withdraw")
      .send({
        id: 50,
        from: testAddress,
        amount: "20.0000000",
        asset_code: "USDP",
        asset_issuer: config.bridge.issuerID,
        memo_type: "text",
        memo: testAccount,
        transaction_id: txID
      })
      .expect(400);
  });

  it("rejects invalid issuer", function() {
    this.timeout(10000);
    const txID = crypto.randomBytes(32).toString("hex");

    return request(server)
      .post("/api/withdraw")
      .send({
        id: 50,
        from: testAddress,
        amount: "20.0000000",
        asset_code: "USD",
        asset_issuer: config.bridge.issuerID + "A",
        memo_type: "text",
        memo: testAccount,
        transaction_id: txID
      })
      .expect(400);
  });

  it("rejects invalid memo type", function() {
    this.timeout(10000);
    const txID = crypto.randomBytes(32).toString("hex");

    return request(server)
      .post("/api/withdraw")
      .send({
        id: 50,
        from: testAddress,
        amount: "20.0000000",
        asset_code: "USD",
        asset_issuer: config.bridge.issuerID,
        memo_type: "textA",
        memo: testAccount,
        transaction_id: txID
      })
      .expect(400);
  });

  it("rejects no memo", function() {
    this.timeout(10000);
    const txID = crypto.randomBytes(32).toString("hex");

    return request(server)
      .post("/api/withdraw")
      .send({
        id: 50,
        from: testAddress,
        amount: "20.0000000",
        asset_code: "USD",
        asset_issuer: config.bridge.issuerID,
        memo_type: "text",
        memo: "",
        transaction_id: txID
      })
      .expect(400);
  });

  it("rejects invalid memo", function() {
    this.timeout(10000);
    const txID = crypto.randomBytes(32).toString("hex");

    return request(server)
      .post("/api/withdraw")
      .send({
        id: 50,
        from: testAddress,
        amount: "20.0000000",
        asset_code: "USD",
        asset_issuer: config.bridge.issuerID,
        memo_type: "text",
        memo: "invalid",
        transaction_id: txID
      })
      .expect(400);
  });

  it("rejects invalid txID", function() {
    this.timeout(10000);
    const txID = crypto.randomBytes(32).toString("hex");

    return request(server)
      .post("/api/withdraw")
      .send({
        id: 50,
        from: testAddress,
        amount: "20.0000000",
        asset_code: "USD",
        asset_issuer: config.bridge.issuerID,
        memo_type: "text",
        memo: testAccount,
        transaction_id: "invalid"
      })
      .expect(400);
  });

  it("rejects unknown ip", function() {
    this.timeout(10000);
    const txID = crypto.randomBytes(32).toString("hex");

    return request(server)
      .post("/api/withdraw")
      .set("X-Forwarded-For", "192.168.2.1")
      .send({
        id: 50,
        from: testAddress,
        amount: "20.0000000",
        asset_code: "USD",
        asset_issuer: config.bridge.issuerID,
        memo_type: "text",
        memo: testAccount,
        transaction_id: txID
      })
      .expect(403);
  });

  it("rejects unknown account", function() {
    this.timeout(10000);
    const txID = crypto.randomBytes(32).toString("hex");

    return request(server)
      .post("/api/withdraw")
      .send({
        id: 50,
        from: testAddress,
        amount: "20.0000000",
        asset_code: "USD",
        asset_issuer: config.bridge.issuerID,
        memo_type: "text",
        memo: "acct_1BrTvMFoGNO2UhNA",
        transaction_id: txID
      })
      .expect(500);
  });
});

payStellar = async (fromSeed, toID, amount, issuerID, assetCode, memoText) => {
  let memo;
  if (memoText) memo = StellarSdk.Memo.text(memoText);
  var asset = new StellarSdk.Asset(assetCode, issuerID);
  var fromKeys = StellarSdk.Keypair.fromSecret(fromSeed);
  let sender = await stellarServer.loadAccount(fromKeys.publicKey());
  var transaction = new StellarSdk.TransactionBuilder(sender, { memo })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: toID,
        asset,
        amount
      })
    )
    .build();
  transaction.sign(fromKeys);
  await stellarServer.submitTransaction(transaction);
};

describe("withdrawal via bridge", function() {
  var server;
  var testAccount;

  beforeEach(function() {
    this.timeout(3000);
    delete require.cache[require.resolve("../server")];
    server = require("../server");
    return stripe.accounts
      .create({
        type: "custom",
        country: "US"
      })
      .then(account => {
        testAccount = account.id;
      });
  });
  afterEach(function() {
    server.close();
  });

  it("accepts valid withdrawal via bridge", function() {
    this.timeout(15000);
    return payStellar(
      testSecret,
      config.bridge.issuerID,
      "20.0000000",
      config.bridge.issuerID,
      "USD",
      testAccount
    ).then(async () => {
      await new Promise(resolve => setTimeout(resolve, 3000)); // this may be flaky
      return checkBalance(testAccount, 1735);
    });
  });

  it("rejects withdrawal via bridge with no memo", function() {
    this.timeout(15000);
    return payStellar(
      testSecret,
      config.bridge.issuerID,
      "20.0000000",
      config.bridge.issuerID,
      "USD"
    ).then(async () => {
      await new Promise(resolve => setTimeout(resolve, 3000)); // this may be flaky
      return checkBalance(testAccount, 0);
    });
  });

  it("rejects withdrawal via bridge with invalid memo", function() {
    this.timeout(15000);
    return payStellar(
      testSecret,
      config.bridge.issuerID,
      "20.0000000",
      config.bridge.issuerID,
      "USD",
      "abcd"
    ).then(async () => {
      await new Promise(resolve => setTimeout(resolve, 3000)); // this may be flaky
      return checkBalance(testAccount, 0);
    });
  });
});

describe("connect", function() {
  var server;

  beforeEach(function() {
    delete require.cache[require.resolve("../server")];
    server = require("../server");
  });
  afterEach(function() {
    server.close();
  });

  it("rejects invalid authCode", () => {
    return request(server)
      .post("/api/connect")
      .send({
        authCode: "abc"
      })
      .expect(400);
  });

  it("rejects expired or wrong authCode", () => {
    return request(server)
      .post("/api/connect")
      .send({
        authCode: "ac_CEXr1EO9TiWYhELGoH0HoMk7abvkPx06"
      })
      .expect(500);
  });
});

describe("static", function() {
  var server;

  beforeEach(function() {
    delete require.cache[require.resolve("../server")];
    server = require("../server");
  });
  afterEach(function() {
    server.close();
  });

  it("hosts stellar.toml", () => {
    return request(server)
      .get("/.well-known/stellar.toml")
      .expect(200)
      .expect("Access-Control-Allow-Origin", "*");
  });
});
