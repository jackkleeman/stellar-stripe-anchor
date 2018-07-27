import StellarSdkLibrary = require('stellar-sdk');

import { Config } from '../config';

if (Config.ENV === 'production') {
  StellarSdkLibrary.Network.usePublicNetwork();
} else {
  StellarSdkLibrary.Network.useTestNetwork();
}

export const stellarServer = new StellarSdkLibrary.Server(Config.HORIZON_URL);
export const StellarSdk = StellarSdkLibrary;
