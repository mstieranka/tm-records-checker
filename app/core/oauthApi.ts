import { isTimeClose } from '~/utils';

export interface OauthData {
  clientId: string;
  clientSecret: string;
}

interface TMOAuthToken {
  accessToken: string;
  expiresAt: number;
}

export async function* getPlayerNames(
  accountIds: string[],
  oauthData: OauthData
) {
  // split into chunks of 50 due to API limitations
  const chunks = [];
  for (let i = 0; i < accountIds.length; i += 50) {
    chunks.push(accountIds.slice(i, i + 50));
  }
  for (const chunk of chunks.filter((c) => c.length > 0)) {
    yield getDisplayNames(chunk, oauthData);
  }
}

let currentAuth: TMOAuthToken | undefined;

async function refreshAuth(oauthData: OauthData) {
  if (!currentAuth || isTimeClose(currentAuth.expiresAt)) {
    const response = await fetch(
      'https://api.trackmania.com/api/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=client_credentials&client_id=${oauthData.clientId}&client_secret=${oauthData.clientSecret}`,
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

    currentAuth = {
      accessToken: auth.access_token,
      expiresAt: Date.now() + auth.expires_in * 1000,
    };
  }
}

async function getDisplayNames(accountIds: string[], oauthData: OauthData) {
  await refreshAuth(oauthData);

  const response = await fetch(
    'https://api.trackmania.com/api/display-names?accountId[]=' +
      accountIds.join('&accountId[]='),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + currentAuth?.accessToken,
      },
    }
  );
  if (!response.ok) {
    throw new Error('Failed to retrieve display names: ' + response.statusText);
  }

  const map = (await response.json()) as Record<string, string>;
  return Object.entries(map).map(([accountId, displayName]) => ({
    id: accountId,
    name: displayName,
  }));
}
