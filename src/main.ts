import { BasicApi } from './basicApi';
import { Config, readConfigFile } from './config';
import { Notifier } from './notifier';
import { OAuthApi } from './oauthApi';
import { Records, getRecords, sendRecordsUpdate } from './records';
import { TmxApi } from './tmxApi';
import {
  DEFAULT_ERROR_WAIT_TIME,
  MAX_ERROR_WAIT_TIME,
  WAIT_TIME,
  sleep,
} from './utils';

let notifier: Notifier | undefined;
let config: Config;
const loadConfig = async () => {
  config = await readConfigFile();
  if (!config.tmAuth) {
    throw new Error('Expected "tmAuth" property in "config.json"');
  }
  if (!config.tmxSearchOptions) {
    throw new Error('Expected "tmxSearchOptions" property in "config.json"');
  }
  if (config.pushbulletAuthKey) {
    notifier = new Notifier(config);
  } else {
    console.info(
      'PushBullet auth key not provided, messages will only be sent to stdout'
    );
  }
};

const main = async () => {
  let errorWaitTime = DEFAULT_ERROR_WAIT_TIME;

  await loadConfig();
  const basicApi = new BasicApi(config);
  const oauthApi = new OAuthApi(config);
  const tmxApi = new TmxApi(config);

  while (true) {
    try {
      const tmxMaps = await tmxApi.getTmxMaps();
      let records: Records = {};
      for (const map of tmxMaps) {
        records[map.Name] = await getRecords(map, basicApi, oauthApi);
      }
      await sendRecordsUpdate(records, notifier);
      await sleep(WAIT_TIME);
    } catch (e) {
      console.error('Resetting due to an error:\n', e);
      await sleep(errorWaitTime);
      if (errorWaitTime < MAX_ERROR_WAIT_TIME) {
        errorWaitTime *= 2;
      } else {
        notifier?.sendMessage(
          'TM records error',
          e instanceof Error ? e.toString() : 'Unknown error'
        );
      }
    }
  }
};

main();
