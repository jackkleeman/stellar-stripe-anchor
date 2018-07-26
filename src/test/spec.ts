/* tslint:disable:only-arrow-functions */
import * as crypto from 'crypto';
import 'mocha';
import * as should from 'should';
import * as supertest from 'supertest';
import { Config } from '../config';
import { app } from '../server';
import { StellarSdk, stellarServer } from '../services/stellar-server';
import { stripe } from '../services/stripe';

const testWorkingCard = 'tok_visa';
const testAddress = 'GCTFDNFXP6GKUGR6QAPBIBGLXVMA5V6BXLCIS2MIUB6CGLYQ2QXRMLXL';
const testSecret = 'SCKIPCRQ4FXRRGOWKMJEC43UG7RWJ2G2QLU3D4WKUBCRL7QNBW5RVA7J';
const token = { id: testWorkingCard, email: 'jack@example.com' };

async function verifyTx(
  txID: any,
  from: any,
  to: any,
  amount: any,
  issuerID: any,
  assetCode: any
) {
  const ops = await stellarServer
    .operations()
    .forTransaction(txID)
    .call();
  should.exist(ops.records);
  should.exist(ops.records[0]);
  const op: any = ops.records[0];
  should.exist(op.from);
  should.exist(op.to);
  should.exist(op.amount);
  should.exist(op.asset_issuer);
  should.exist(op.asset_code);
  op.from.should.equal(from);
  op.to.should.equal(to);
  op.amount.should.equal(amount);
  op.asset_issuer.should.equal(issuerID);
}

describe('deposits', function() {
  it('allows trust', function() {
    this.timeout(8000);
    return supertest(app)
      .post('/api/allow-trust')
      .send({
        source: testAddress,
        sourceSeed: testSecret,
        trustor: Config.ISSUER_ID,
        assetCode: 'USD',
        limit: '1000000'
      })
      .expect(200);
  });
  it('accepts and pays deposit', function() {
    this.timeout(10000);
    const centAmount = 100000; // $1000

    return supertest(app)
      .post('/api/deposit')
      .send({ token, centAmount, stellarAddress: testAddress })
      .expect(200)
      .then((res: any) => {
        should.exist(res.body.transactionID);
        res.body.transactionID.length.should.equal(64);
        return verifyTx(
          res.body.transactionID,
          Config.ISSUER_ID,
          testAddress,
          '970.7000000',
          Config.ISSUER_ID,
          'USD'
        );
      });
  });
  it('rejects low amount', function() {
    this.timeout(8000);
    const centAmount = 950; // $9.50
    return supertest(app)
      .post('/api/deposit')
      .send({ token, centAmount, stellarAddress: testAddress })
      .expect(400);
  });
  it('rejects high amount', function() {
    this.timeout(8000);
    const centAmount = 100000001; // $1000000.01
    return supertest(app)
      .post('/api/deposit')
      .send({ token, centAmount, stellarAddress: testAddress })
      .expect(400);
  });
  it('rejects invalid address', function() {
    this.timeout(8000);
    const centAmount = 1000; // $10
    return supertest(app)
      .post('/api/deposit')
      .send({ token, centAmount, stellarAddress: testAddress + 'A' })
      .expect(400);
  });
  it('rejects invalid token', function() {
    this.timeout(8000);
    const centAmount = 1000; // $10
    const brokenToken = { ...token };
    brokenToken.id = brokenToken.id + 'a';
    return supertest(app)
      .post('/api/deposit')
      .send({ token: brokenToken, centAmount, stellarAddress: testAddress })
      .expect(500);
  });
});

async function checkBalance(account: any, centAmount: any) {
  const balance = await stripe.balance.retrieve({
    stripe_account: account
  });
  should.exist(balance);
  should.exist(balance.pending);
  should.exist(balance.available[0]);
  const amount: any = balance.available[0].amount;
  amount.should.equal(centAmount);
}

describe('withdrawal endpoint', function() {
  var testAccount: any;
  beforeEach(async function() {
    this.timeout(10000);
    const createAndFund = [
      await stripe.accounts
        .create({
          type: 'custom',
          country: 'US'
        })
        .then((account: any) => {
          testAccount = account.id;
        }),

      await stripe.charges.create({
        amount: 1000000,
        currency: 'usd',
        source: testWorkingCard,
        receipt_email: token.email,
        statement_descriptor: 'Fund test account',
        description: 'Enable withdrawal'
      })
    ];
    return createAndFund;
  });

  it('allows withdrawal', function() {
    this.timeout(10000);
    const txID = crypto.randomBytes(32).toString('hex');
    console.log('stripe test account', testAccount);

    return supertest(app)
      .post('/api/withdraw')
      .send({
        id: 50,
        from: testAddress,
        amount: '20.0000000',
        asset_code: 'USD',
        asset_issuer: Config.ISSUER_ID,
        memo_type: 'text',
        memo: testAccount,
        transaction_id: txID
      })
      .expect(200)
      .then(() => {
        return checkBalance(testAccount, 1735);
      });
  });

  it('rejects low amount', function() {
    const txID = crypto.randomBytes(32).toString('hex');

    return supertest(app)
      .post('/api/withdraw')
      .send({
        id: 50,
        from: testAddress,
        amount: '9.5000000',
        asset_code: 'USD',
        asset_issuer: Config.ISSUER_ID,
        memo_type: 'text',
        memo: testAccount,
        transaction_id: txID
      })
      .expect(400);
  });

  it('rejects invalid from', function() {
    const txID = crypto.randomBytes(32).toString('hex');

    return supertest(app)
      .post('/api/withdraw')
      .send({
        id: 50,
        from: testAddress + 'A',
        amount: '20.0000000',
        asset_code: 'USD',
        asset_issuer: Config.ISSUER_ID,
        memo_type: 'text',
        memo: testAccount,
        transaction_id: txID
      })
      .expect(400);
  });

  it('rejects invalid asset code', function() {
    const txID = crypto.randomBytes(32).toString('hex');

    return supertest(app)
      .post('/api/withdraw')
      .send({
        id: 50,
        from: testAddress,
        amount: '20.0000000',
        asset_code: 'USDP',
        asset_issuer: Config.ISSUER_ID,
        memo_type: 'text',
        memo: testAccount,
        transaction_id: txID
      })
      .expect(400);
  });

  it('rejects invalid issuer', function() {
    const txID = crypto.randomBytes(32).toString('hex');

    return supertest(app)
      .post('/api/withdraw')
      .send({
        id: 50,
        from: testAddress,
        amount: '20.0000000',
        asset_code: 'USD',
        asset_issuer: Config.ISSUER_ID + 'A',
        memo_type: 'text',
        memo: testAccount,
        transaction_id: txID
      })
      .expect(400);
  });

  it('rejects invalid memo type', function() {
    const txID = crypto.randomBytes(32).toString('hex');

    return supertest(app)
      .post('/api/withdraw')
      .send({
        id: 50,
        from: testAddress,
        amount: '20.0000000',
        asset_code: 'USD',
        asset_issuer: Config.ISSUER_ID,
        memo_type: 'textA',
        memo: testAccount,
        transaction_id: txID
      })
      .expect(400);
  });

  it('rejects no memo', function() {
    const txID = crypto.randomBytes(32).toString('hex');

    return supertest(app)
      .post('/api/withdraw')
      .send({
        id: 50,
        from: testAddress,
        amount: '20.0000000',
        asset_code: 'USD',
        asset_issuer: Config.ISSUER_ID,
        memo_type: 'text',
        memo: '',
        transaction_id: txID
      })
      .expect(400);
  });

  it('rejects invalid memo', function() {
    const txID = crypto.randomBytes(32).toString('hex');

    return supertest(app)
      .post('/api/withdraw')
      .send({
        id: 50,
        from: testAddress,
        amount: '20.0000000',
        asset_code: 'USD',
        asset_issuer: Config.ISSUER_ID,
        memo_type: 'text',
        memo: 'invalid',
        transaction_id: txID
      })
      .expect(400);
  });

  it('rejects invalid txID', function() {
    return supertest(app)
      .post('/api/withdraw')
      .send({
        id: 50,
        from: testAddress,
        amount: '20.0000000',
        asset_code: 'USD',
        asset_issuer: Config.ISSUER_ID,
        memo_type: 'text',
        memo: testAccount,
        transaction_id: 'invalid'
      })
      .expect(400);
  });

  it('rejects unknown ip', function() {
    const txID = crypto.randomBytes(32).toString('hex');

    return supertest(app)
      .post('/api/withdraw')
      .set('X-Forwarded-For', '192.168.2.1')
      .send({
        id: 50,
        from: testAddress,
        amount: '20.0000000',
        asset_code: 'USD',
        asset_issuer: Config.ISSUER_ID,
        memo_type: 'text',
        memo: testAccount,
        transaction_id: txID
      })
      .expect(403);
  });

  it('rejects unknown account', function() {
    const txID = crypto.randomBytes(32).toString('hex');

    return supertest(app)
      .post('/api/withdraw')
      .send({
        id: 50,
        from: testAddress,
        amount: '20.0000000',
        asset_code: 'USD',
        asset_issuer: Config.ISSUER_ID,
        memo_type: 'text',
        memo: 'acct_1BrTvMFoGNO2UhNA',
        transaction_id: txID
      })
      .expect(500);
  });
});

async function payStellar(
  fromSeed: any,
  toID: any,
  amount: any,
  issuerID: any,
  assetCode: any,
  memoText?: any
) {
  let memo;
  if (memoText) {
    memo = StellarSdk.Memo.text(memoText);
  }
  const asset = new StellarSdk.Asset(assetCode, issuerID);
  const fromKeys = StellarSdk.Keypair.fromSecret(fromSeed);
  const sender = await stellarServer.loadAccount(fromKeys.publicKey());
  const transaction = new StellarSdk.TransactionBuilder(sender, { memo })
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
}

describe('withdrawal via bridge', function() {
  var testAccount: any;

  beforeEach(async function() {
    this.timeout(10000);
    const createAndFund = [
      await stripe.accounts
        .create({
          type: 'custom',
          country: 'US'
        })
        .then((account: any) => {
          testAccount = account.id;
        }),

      await stripe.charges.create({
        amount: 1000000,
        currency: 'usd',
        source: testWorkingCard,
        receipt_email: token.email,
        statement_descriptor: 'Fund test account',
        description: 'Enable withdrawal'
      })
    ];
    return createAndFund;
  });

  it('accepts valid withdrawal via bridge', function() {
    this.timeout(10000);
    return payStellar(
      testSecret,
      Config.ISSUER_ID,
      '20.0000000',
      Config.ISSUER_ID,
      'USD',
      testAccount
    ).then(async () => {
      await new Promise(resolve => setTimeout(resolve, 3000)); // this may be flaky
      return checkBalance(testAccount, 1735);
    });
  });

  it('rejects withdrawal via bridge with no memo', function() {
    this.timeout(10000);
    return payStellar(
      testSecret,
      Config.ISSUER_ID,
      '20.0000000',
      Config.ISSUER_ID,
      'USD'
    ).then(async () => {
      await new Promise(resolve => setTimeout(resolve, 3000)); // this may be flaky
      return checkBalance(testAccount, 0);
    });
  });

  it('rejects withdrawal via bridge with invalid memo', function() {
    this.timeout(10000);
    return payStellar(
      testSecret,
      Config.ISSUER_ID,
      '20.0000000',
      Config.ISSUER_ID,
      'USD',
      'abcd'
    ).then(async () => {
      await new Promise(resolve => setTimeout(resolve, 3000)); // this may be flaky
      return checkBalance(testAccount, 0);
    });
  });
});

describe('connect', function() {
  it('rejects invalid authCode', function() {
    return supertest(app)
      .post('/api/connect')
      .send({
        authCode: 'abc'
      })
      .expect(400);
  });

  it('rejects expired or wrong authCode', function() {
    return supertest(app)
      .post('/api/connect')
      .send({
        authCode: 'ac_CEXr1EO9TiWYhELGoH0HoMk7abvkPx06'
      })
      .expect(500);
  });
});

describe('static', function() {
  it('hosts stellar.toml', function() {
    return supertest(app)
      .get('/.well-known/stellar.toml')
      .expect(200)
      .expect('Access-Control-Allow-Origin', '*');
  });
});
