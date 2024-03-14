// import { BasicAuthData } from './basicApi';
import { BasicAuthData } from './basicApi.types';
import { NotificationsConfig } from './notifier';
import { OauthData } from './oauthApi';
import { TmxApiConfig } from './tmxApi';

export interface ApiConfig {
  tmx: TmxApiConfig;
  tmBasic: BasicAuthData;
  tmOauth: OauthData;
  userAgent: string;
}
export interface GithubAuthConfig {
  clientId: string;
  clientSecret: string;
  allowedUsers: string[];
}

export interface Config {
  baseUrl: string;
  api: ApiConfig;
  githubAuth: GithubAuthConfig;
  notifications: NotificationsConfig;
}

const validateConfig = (config: Partial<Config>) => {
  if (!config.api) {
    throw new Error('api config missing');
  }
  if (!config.api.tmx) {
    throw new Error('tmx config missing');
  }
  if (!config.api.tmx.searchParams) {
    throw new Error('tmx searchParams missing');
  }
  if (!config.api.tmx.searchParams.userId) {
    throw new Error('tmx userId missing');
  }
  if (!config.api.tmBasic) {
    throw new Error('tmBasic config missing');
  }
  if (!config.api.tmBasic.email) {
    throw new Error('tmBasic email missing');
  }
  if (!config.api.tmBasic.password) {
    throw new Error('tmBasic password missing');
  }
  if (!config.api.tmOauth) {
    throw new Error('tmOauth config missing');
  }
  if (!config.api.tmOauth.clientId) {
    throw new Error('tmOauth clientId missing');
  }
  if (!config.api.tmOauth.clientSecret) {
    throw new Error('tmOauth clientSecret missing');
  }
  if (!config.api.userAgent) {
    throw new Error('userAgent missing');
  }
  if (!config.githubAuth) {
    throw new Error('githubAuth config missing');
  }
  if (!config.githubAuth.clientId) {
    throw new Error('githubAuth clientId missing');
  }
  if (!config.githubAuth.clientSecret) {
    throw new Error('githubAuth clientSecret missing');
  }
  if (!config.baseUrl) {
    throw new Error('baseUrl missing');
  }
  if (!config.githubAuth.allowedUsers) {
    throw new Error('githubAuth allowedUsers missing');
  }
  if (!config.notifications) {
    throw new Error('notifications config missing');
  }
  if (
    config.notifications.ntfy &&
    !config.notifications.emptyCountBeforeNotify
  ) {
    throw new Error('notifications emptyCountBeforeNotify missing');
  }
  return config as Config;
};

export const reloadConfig = async () => {
  const file = Bun.file('config.json');
  if (!file.exists()) {
    throw new Error('config.json not found');
  }
  const configText = await file.text();
  const config = JSON.parse(configText) as Partial<Config>;
  return validateConfig(config);
};

let _config: Config | null = await reloadConfig();
export const getConfig = () => {
  if (!_config) {
    throw new Error('Config not loaded');
  }
  return _config;
};

export const saveConfig = async (config: Config) => {
  await Bun.write(Bun.file('config.json'), JSON.stringify(config, null, 2));
  _config = config;
  return config;
};
