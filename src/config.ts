import { BasicAuthData } from './basicApi';
import { TmxSearchOptions } from './tmxApi';

export interface Config {
  tmxSearchOptions: TmxSearchOptions;
  pushbulletAuthKey?: string;
  tmAuth: BasicAuthData;
  userAgent: string;
  tmOAuth?: {
    clientId: string;
    clientSecret: string;
  };
}

export const readConfigFile = async () => {
  const file = Bun.file('config.json');
  if (!file.exists()) {
    throw new Error('config.json not found');
  }
  const configText = await file.text();
  const config = JSON.parse(configText) as Partial<Config>;
  if (!config.userAgent) {
    config.userAgent =
      'tm-records-checker / https://github.com/mstieranka/tm-records-checker';
  }
  return config as Config;
};
