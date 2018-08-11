import * as bodyParser from 'body-parser';
import * as express from 'express';
import { Config } from './config';
import {
  bridgePay,
  depositAmountMinusFees,
  getConnectToken,
  getLoginLink,
  payUser,
  validWithdraw,
  withdrawalAmountMinusFees
} from './utils';

import { StellarSdk, stellarServer } from './services/stellar-server';
import { stripe } from './services/stripe';

export const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const port = 5000;

app.post('/api/deposit', (req, res) => {
  if (
    !req.body.stellarAddress ||
    req.body.stellarAddress.length !== 56 ||
    !req.body.token ||
    !req.body.token.id ||
    !req.body.centAmount ||
    req.body.centAmount < 1000 ||
    req.body.centAmount > 100000000
  ) {
    res.status(400).send({ message: 'Invalid input' });
    return;
  }
  console.info(
    'Processing a deposit to address:',
    req.body.stellarAddress,
    'with amount:',
    req.body.centAmount,
    'from card token:',
    req.body.token.id
  );
  // First auth charge, but do not capture until money is sent via Stellar.
  stripe.charges
    .create({
      amount: req.body.centAmount,
      currency: 'usd',
      source: req.body.token.id,
      receipt_email: req.body.token.email,
      statement_descriptor: 'Stellar USD deposit',
      description: req.body.stellarAddress,
      capture: false
    })
    .then(charge => {
      console.info(
        'Successfully created charge:',
        charge.id,
        'from card token:',
        req.body.token.id
      );
      const centAmountMinusFees = depositAmountMinusFees(req.body.centAmount);
      const amountMinusFees = centAmountMinusFees / 100;
      return Promise.all([
        charge.id,
        bridgePay(charge.id, amountMinusFees, req.body.stellarAddress)
      ]);
    })
    .then(([chargeID, txid]) => {
      console.info(
        'Successfully paid via bridge to:',
        req.body.stellarAddress,
        'from charge:',
        chargeID
      );
      return Promise.all([txid, stripe.charges.capture(chargeID)]);
    })
    .then(([txid, charge]) => {
      console.info('Successfully captured charge:', charge.id);
      res.send({
        transactionID: txid
      });
    })
    .catch(err => {
      console.info('Failed to process deposit with message:', err.message);
      res.status(500).send({ message: err.message });
    });

  // utils.storeAddress(req.body.stellarAddress, deposits, res);
});

app.post('/api/connect', (req, res) => {
  if (!req.body.authCode || req.body.authCode.length !== 35) {
    res.status(400).send({ message: 'Invalid input' });
    return;
  }
  console.info('Processing a new connection');
  getConnectToken(req.body.authCode)
    .then(accountID => {
      return Promise.all([accountID, getLoginLink(accountID)]);
    })
    .then(([accountID, loginLink]) => {
      console.info('Successfully made connection with reference', accountID);
      res.send({ reference: accountID, loginLink });
    })
    .catch(err => {
      console.error('Failed to connect new user with message:', err.message);
      res.status(500).send({ message: err.message });
    });
});

app.post('/api/withdraw', (req, res) => {
  if (!Config.BRIDGE_IPS.includes(req.ip)) {
    console.info('Unknown IP calling withdraw:', req.ip);
    res.status(403).end();
    return;
  }
  if (!validWithdraw(req.body)) {
    console.error('Invalid parameters calling withdraw:', req.body);
    res.status(400).end();
    return;
  }

  console.info('Processing a new withdrawal');
  const centAmount = Math.floor(parseFloat(req.body.amount) * 100);
  const amountMinusFees = withdrawalAmountMinusFees(centAmount);
  payUser(req.body.memo, amountMinusFees, req.body.transaction_id, {
    transactionID: req.body.transaction_id,
    from: req.body.from
  })
    .then(transfer => {
      console.info(
        'Successfully paid out withdrawal to: ',
        req.body.memo,
        'with stripe id:',
        transfer.id,
        'from: ',
        req.body.from,
        'in transaction:',
        req.body.transaction_id
      );
      res.status(200).end();
    })
    .catch(err => {
      console.error(
        'Failed to pay out withdrawal. This will not be retried automatically. Message:',
        err.message
      );
      res.status(500).end(); // WARN bridge won't actually retry on this, but this may change soon
    });
});

app.post('/api/allow-trust', async (req, res) => {
  if (
    !req.body.source ||
    !req.body.sourceSeed ||
    !req.body.trustor ||
    !req.body.assetCode ||
    !req.body.limit
  ) {
    res.status(400).send({ message: 'Invalid input' });
    return;
  }
  console.info(
    'Source:',
    req.body.source,
    'allowing trust:',
    req.body.trustor,
    'with asset code:',
    req.body.assetCode,
    'with a limit:',
    req.body.limit
  );

  const account = await stellarServer.loadAccount(req.body.source);
  const asset = new StellarSdk.Asset(req.body.assetCode, req.body.trustor);

  const transaction = new StellarSdk.TransactionBuilder(account)
    .addOperation(
      StellarSdk.Operation.changeTrust({
        asset,
        limit: req.body.limit
      })
    )
    .build();

  transaction.sign(StellarSdk.Keypair.fromSecret(req.body.sourceSeed)); // sign the transaction

  try {
    await stellarServer.submitTransaction(transaction);
    res.status(200).end();
  } catch (e) {
    res.status(400).send(e);
  }
});

if (Config.ENV !== 'development') {
  app.use(
    express.static('client/build', {
      setHeaders(res, path, stat) {
        if (path.endsWith('.well-known/stellar.toml')) {
          res.set('Access-Control-Allow-Origin', '*');
        }
      }
    })
  );
}

if (Config.ENV === 'test') {
  app.enable('trust proxy'); // needed to spoof IPs in tests
}

app.listen(port, () => console.log(`Listening on port ${port}`));
