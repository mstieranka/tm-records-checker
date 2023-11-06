import { Config } from './config';
import { isTimeClose } from './utils';

interface TMOAuthToken {
  accessToken: string;
  expiresAt: number;
}

export class OAuthApi {
  constructor(config: Config) {
    this.config = config;
  }

  private config: Config;
  private auth: TMOAuthToken | undefined;
  private accountNames: Record<string, string> = {};

  private async getAccountIds(accountIds: string[]) {
    const obj: Record<string, string> = {};
    for (const accountId of accountIds) {
      obj[accountId] = accountId;
    }
    return obj;
  }

  private async refreshAuth() {
    if (!this.config.tmOAuth) {
      throw new Error('tmOAuth not configured');
    }
    if (!this.auth || isTimeClose(this.auth.expiresAt)) {
      const response = await fetch(
        'https://api.trackmania.com/api/access_token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `grant_type=client_credentials&client_id=${this.config.tmOAuth.clientId}&client_secret=${this.config.tmOAuth.clientSecret}`,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to refresh OAuth token: ' + response.statusText);
      }

      const auth = (await response.json()) as {
        access_token: string;
        expires_in: number;
      };

      if (!auth.access_token) {
        throw new Error('Failed to refresh OAuth token');
      }

      this.auth = {
        accessToken: auth.access_token,
        expiresAt: Date.now() + auth.expires_in * 1000,
      };
    }
  }

  async getDisplayNames(accountIds: string[]) {
    if (!this.config.tmOAuth) {
      return this.getAccountIds(accountIds);
    }
    await this.refreshAuth();

    const missingDisplayNames = [];
    const displayNames: Record<string, string> = {};
    for (const accountId of accountIds) {
      if (!this.accountNames[accountId]) {
        missingDisplayNames.push(accountId);
      } else {
        displayNames[accountId] = this.accountNames[accountId];
      }
    }

    const response = await fetch(
      'https://api.trackmania.com/api/display-names?accountId[]=' +
        missingDisplayNames.join('&accountId[]='),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + this.auth?.accessToken,
        },
      }
    );
    if (!response.ok) {
      throw new Error(
        'Failed to retrieve display names: ' + response.statusText
      );
    }
    const newNames = (await response.json()) as Record<string, string>;

    // set all missing display names
    for (const [id, name] of Object.entries(newNames)) {
      this.accountNames[id] = name;
      displayNames[id] = name;
    }

    return displayNames;
  }
}
