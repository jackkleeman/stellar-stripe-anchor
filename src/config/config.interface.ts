export interface IConfig {
  STRIPE_SECTRET_KEY: string;
  STRIPE_CONNECT_CLIENT_ID: string;
  ISSUER_ID: string;
  ISSUER_SEED: string;
  BRIDGE_IPS: string[];
  BRIDGE_PAY_ENDPOINT: string;
  BRIDGE_PORT: string;
  DATABASE_URL: string;
  DATABASE_TYPE: string;
  HORIZON_URL: string;
  NETWORK_PASSPHRASE: string;
  WITHDRAW_ENDPOINT: string;
  ENV: string;
}
