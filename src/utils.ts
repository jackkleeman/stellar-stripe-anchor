import * as request from 'request-promise-native';
import { Config } from './config';
import { stripe } from './services/stripe';

export const validWithdraw = (body: any) => {
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
  if (body.from.length !== 56) {
    return false;
  }
  if (parseFloat(body.amount) < 10.0) {
    return false;
  }
  if (body.asset_code !== 'USD') {
    return false;
  }
  if (body.asset_issuer !== Config.ISSUER_ID) {
    return false;
  }
  if (body.memo_type !== 'text') {
    return false;
  }
  if (body.memo.length !== 21) {
    return false;
  }
  if (!body.memo.startsWith('acct_')) {
    return false;
  }
  if (body.transaction_id.length !== 64) {
    return false;
  }

  return true;
};

export const getConnectToken = async (authCode: any) => {
  const options = {
    method: 'POST',
    url: 'https://connect.stripe.com/oauth/token',
    formData: {
      client_secret: Config.STRIPE_SECTRET_KEY,
      code: authCode,
      grant_type: 'authorization_code'
    },
    json: true,
    resolveWithFullResponse: true,
    simple: false
  };
  const response: any = await request(options);
  if (response.statusCode !== 200) {
    throw response.body.error_description;
  }

  return response.body.stripe_user_id;
};

export const getLoginLink = async (accountID: any) => {
  const { url } = await (stripe.accounts as any).createLoginLink(accountID);
  return url;
};

export const payUser = async (
  accountID: string,
  centAmount: number,
  idempotencyKey: string,
  metadata = {}
) => {
  const transfer = await stripe.transfers.create(
    {
      amount: centAmount,
      currency: 'usd',
      destination: accountID,
      metadata
    },
    {
      idempotency_key: idempotencyKey // currently using stellar txid as idempotency
    }
  );
  return transfer;
};

export const depositAmountMinusFees = (amount: number) => {
  return Math.floor(amount * 0.971) - 30; // 2.9% + $0.30
};

export const withdrawalAmountMinusFees = (amount: number) => {
  return Math.floor(amount * 0.98) - 225; // 2% + $2.25
};

export const bridgePay = async (
  uniqueID: any,
  amount: any,
  stellarAddress: any
) => {
  const options = {
    method: 'POST',
    url: Config.BRIDGE_PAY_ENDPOINT,
    formData: {
      id: uniqueID,
      source: Config.ISSUER_SEED, // by passing this we avoid needing to set it in bridge config
      destination: stellarAddress,
      amount,
      asset_code: 'USD',
      asset_issuer: Config.ISSUER_ID
    },
    json: true,
    resolveWithFullResponse: true, // we need statuscode
    simple: false // dont reject on bad status
  };
  const response = await request(options);
  if (response.statusCode !== 200) {
    throw Error(response.body.message);
  }

  return response.body.hash;
};
