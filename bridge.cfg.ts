const fs = require('fs');
import { Config } from './src/config';

const lines = [
  `port = ${Config.BRIDGE_PORT}`,
  `horizon = "${Config.HORIZON_URL}"`,
  `network_passphrase = "${Config.NETWORK_PASSPHRASE}"`,
  '[[assets]]',
  'code = "USD"',
  `issuer = "${Config.ISSUER_ID}"`,
  '[database]',
  `type = "${Config.DATABASE_TYPE}"`,
  `url = "${Config.DATABASE_URL}"`,
  '[accounts]',
  `receiving_account_id = "${Config.ISSUER_ID}"`,
  '[callbacks]',
  `receive =  "${Config.WITHDRAW_ENDPOINT}"`
];
const lineBreak = '\n';

const bridgeCfgContent = lines.join(lineBreak);
const bridgeCfgPath = 'bridge.cfg';

fs.writeFile(bridgeCfgPath, bridgeCfgContent, (err: any) => {
  if (err) {
    throw err;
  }

  console.log(
    'The bridge config file was succesfully generated from your environment variables!'
  );
});
