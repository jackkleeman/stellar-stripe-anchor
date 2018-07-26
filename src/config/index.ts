// tslint:disable-next-line:no-var-requires
import { IConfig } from './config.interface';
import { config } from './dotenv.config';

config();

export const Config: IConfig = {
  STRIPE_SECTRET_KEY: process.env.STRIPE_SECTRET_KEY,
  STRIPE_CONNECT_CLIENT_ID: process.env.STRIPE_CONNECT_CLIENT_ID,
  ISSUER_ID: process.env.ISSUER_ID,
  ISSUER_SEED: process.env.ISSUER_SEED,
  BRIDGE_IPS: process.env.BRIDGE_IPS.split(' '),
  BRIDGE_PAY_ENDPOINT: process.env.BRIDGE_PAY_ENDPOINT,
  BRIDGE_PORT: process.env.BRIDGE_PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_TYPE: process.env.DATABASE_TYPE,
  HORIZON_URL: process.env.HORIZON_URL,
  NETWORK_PASSPHRASE: process.env.NETWORK_PASSPHRASE,
  WITHDRAW_ENDPOINT: process.env.WITHDRAW_ENDPOINT,
  ENV: process.env.NODE_ENV
};
