import { error } from 'console';
import { readFile, writeFile } from 'fs/promises';
import { decodeJwt } from 'jose';

interface Config {
  tmxSearchOptions: TmxSearchOptions;
  pushbulletAuthKey?: string;
  tmAuth: AuthData;
}

interface TmxSearchOptions {
  tmxUsername?: string;
}

interface TmxMap extends Object {
  GbxMapName: string;
  Name: string;
  TrackUID: string;
}

interface AuthData {
  email: string;
  password: string;
}

interface TmSessionResponse {
  platformType: 'uplay';
  ticket: string;
  twoFactorAuthenticationTicket: string;
  profileId: string;
  userId: string;
  nameOnPlatform: string;
  environment: string;
  expiration: string;
  spaceId: string;
  clientIp: string;
  clientIpCountry: string;
  serverTime: string;
  sessionId: string;
  sessionKey: string;
  rememberMeTicket: string;
}

interface TmAuthToken {
  accessToken: string;
  accessTokenExpiry: number;
  refreshToken: string;
  refreshTokenExpiry: number;
}

interface TmLeaderboardItem {
  accountId: string;
  zoneId: string;
  zoneName: string;
  position: number;
  score: number;
}

interface TmLeaderboardZone {
  zoneId: string;
  zoneName: string;
  top: TmLeaderboardItem[];
}

interface TmLeaderboard {
  groupUid: string;
  mapUid: string;
  tops: TmLeaderboardZone[];
}

interface TmDisplayNameItem {
  accountId: string;
  displayName: string;
  timestamp: string;
}

const TMX_API = {
  baseUrl: 'https://trackmania.exchange',
  searchLimit: 100,
  searchUrl: (options: TmxSearchOptions) => {
    let url = `${TMX_API.baseUrl}/mapsearch2/search?api=on&limit=${TMX_API.searchLimit}`;
    if (options.tmxUsername) {
      url += `&author=${options.tmxUsername}`;
    }
    return url;
  },
} as const;

const TM_API = {
  sessionUrl: 'https://public-ubiservices.ubi.com/v3/profiles/sessions',
  authUrl:
    'https://prod.trackmania.core.nadeo.online/v2/authentication/token/ubiservices',
  refreshUrl:
    'https://prod.trackmania.core.nadeo.online/v2/authentication/token/refresh',
  leaderboardsUrl: (mapUid: string) =>
    `https://live-services.trackmania.nadeo.live/api/token/leaderboard/group/Personal_Best/map/${mapUid}/top?length=10&onlyWorld=true&offset=0`,
  displayNamesUrl: (accountIds: string[]) =>
    `https://prod.trackmania.core.nadeo.online/accounts/displayNames/?accountIdList=${accountIds.join(
      ','
    )}`,
};

const FETCH_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent':
    'tm-records-checker (runs every 24h) / https://github.com/mstieranka/tm-records-checker / matej@stieranka.eu',
} as HeadersInit;

const fetchJson = async <T>(input: RequestInfo, init?: RequestInit) => {
  const response = await fetch(input, init);
  if (!response.ok) throw response;
  return (await response.json()) as T;
};

const getTmAuthToken = async (authTicket: string, audience: string) => {
  const auth = await fetchJson<
    TmAuthToken & {
      accessTokenExpiry?: number;
      refreshTokenExpiry?: number;
    }
  >(TM_API.authUrl, {
    method: 'POST',
    body: JSON.stringify({ audience }),
    headers: {
      ...FETCH_HEADERS,
      Authorization: 'ubi_v1 t=' + authTicket,
    },
  }).catch((status) => {
    console.error('Request failed with status ', status);
    return undefined;
  });
  if (!auth) return auth;
  auth.accessTokenExpiry = (decodeJwt(auth.accessToken).exp ?? 0) * 1000;
  auth.refreshTokenExpiry = (decodeJwt(auth.refreshToken).exp ?? 0) * 1000;
  return auth as TmAuthToken;
};

const getSession = async (authData: AuthData) => {
  if (!authData) return undefined;

  const session = await fetchJson<TmSessionResponse>(TM_API.sessionUrl, {
    method: 'POST',
    headers: {
      ...FETCH_HEADERS,
      'Ubi-AppId': '86263886-327a-4328-ac69-527f0d20a237',
      Authorization:
        'Basic ' +
        Buffer.from(`${authData.email}:${authData.password}`, 'utf-8').toString(
          'base64'
        ),
    },
  }).catch((status) => {
    console.error('Request failed with status ', status);
    return undefined;
  });
  return session;
};

interface Records {
  [mapName: string]: {
    position?: number;
    username: string;
    time: number;
  }[];
}

const readRecordsFile = async () => {
  return await readFile('records.json')
    .then((res) => JSON.parse(res.toString('utf-8')) as Records)
    .catch(() => {
      console.info('records.json not found');
      return undefined;
    });
};

const writeRecordsFile = async (records: Records) => {
  return await writeFile('records.json', JSON.stringify(records));
};

const readConfigFile = async () => {
  return await readFile('config.json')
    .then((res) => JSON.parse(res.toString('utf-8')) as Config)
    .catch(() => {
      console.info('config.json not found');
      return undefined;
    });
};

const getMapList = async (searchOptions: TmxSearchOptions) => {
  console.log('Retrieving map list', searchOptions);
  const mapListResponse = await fetch(TMX_API.searchUrl(searchOptions), {
    headers: FETCH_HEADERS,
  });
  const mapList: { results: TmxMap[]; totalItemCount: number } =
    await mapListResponse.json();
  if (mapList.results.length < mapList.totalItemCount) {
    console.error('Did not retrieve all maps, will work with less');
  }

  console.log(`Received map list with ${mapList.results.length} items`);
  return mapList;
};

const getNewRecords = (
  oldRecords: Records | undefined,
  newRecords: Records
) => {
  if (!oldRecords) return newRecords;

  let diff = {} as Records;

  const oldMaps = Object.keys(oldRecords);
  for (const newMap of Object.keys(newRecords)) {
    // check for new map
    if (!oldMaps.includes(newMap)) {
      diff[newMap] = newRecords[newMap];
      continue;
    }
    // check for new record
    const newMapRecords = newRecords[newMap];
    const oldMapRecords = oldRecords[newMap];
    for (const record of newMapRecords) {
      if (
        !oldMapRecords.find(
          (el) => el.time === record.time && el.username && record.username
        )
      ) {
        diff[newMap] = [...(diff[newMap] ?? []), record];
      }
    }
  }

  return diff;
};

const sleep = async (timeoutMs: number) => {
  console.log('Waiting for ' + timeoutMs / 60 / 1000 + ' minutes');
  await new Promise((resolve) => setTimeout(resolve, timeoutMs));
};

const WAIT_TIME = 24 * 60 * 60 * 1000;
const MAX_ERROR_WAIT_TIME = WAIT_TIME;
const DEFAULT_ERROR_WAIT_TIME = 30 * 1000;
(async () => {
  // load config
  const config = await readConfigFile();
  if (!config) {
    console.error('Expected "config.json"');
    return;
  }
  if (!config.tmAuth) {
    console.error('Expected "tmAuth" property in "config.json"');
    return;
  }
  if (!config.tmxSearchOptions) {
    console.error('Expected "tmxSearchOptions" property in "config.json"');
    return;
  }
  if (!config.pushbulletAuthKey) {
    console.info(
      'PushBullet auth key not provided, messages will only be sent to stdout'
    );
  }

  const PushBullet = await import('pushbullet').then(
    (module) => module.default
  );
  const pusher = config.pushbulletAuthKey
    ? new PushBullet(config.pushbulletAuthKey)
    : undefined;
  const sendMessage = async (message: string) => {
    if (!pusher) return;
    const devices = await pusher
      .devices()
      .then((res) => res.json())
      .then((res) => res.devices);

    for (const device of devices) {
      const iden = device.iden;
      if (iden === undefined) {
        console.log('Device identificator unknown, trying next');
        continue;
      }
      pusher.note(iden, 'New TM Records', message);
    }
  };
  let session: TmSessionResponse | undefined;
  let nadeoToken: TmAuthToken | undefined;
  let nadeoLiveToken: TmAuthToken | undefined;

  let errorWaitTime = DEFAULT_ERROR_WAIT_TIME;
  let noChangeCounter = 0;
  while (true) {
    // get new refresh token
    session = await getSession(config.tmAuth);
    if (!session?.ticket) {
      console.error('Session start failed, exiting...');
      return;
    }
    console.log('Got session ticket');

    nadeoToken = await getTmAuthToken(session.ticket, 'NadeoServices');
    if (!nadeoToken) {
      console.error('Token acquiry failed, exiting...');
      return;
    }
    console.log('Got NadeoServices token');

    nadeoLiveToken = await getTmAuthToken(session.ticket, 'NadeoLiveServices');
    if (!nadeoLiveToken) {
      console.error('Token acquiry failed, exiting...');
      return;
    }
    console.log('Got NadeoLiveServices token');

    while (true) {
      while (nadeoLiveToken?.accessTokenExpiry ?? 0 > Date.now()) {
        try {
          const mapList = await getMapList(config.tmxSearchOptions);
          let records: { [key: string]: any } = {};
          for (const map of mapList.results) {
            // get map records
            const leaderboard = await fetchJson<TmLeaderboard>(
              TM_API.leaderboardsUrl(map.TrackUID),
              {
                headers: {
                  ...FETCH_HEADERS,
                  Authorization: 'nadeo_v1 t=' + nadeoLiveToken?.accessToken,
                },
              }
            );
            const rawRecords = leaderboard.tops.at(0)?.top ?? [];
            // get usernames for accountIds in leaderboard
            const accountIds = rawRecords.map((item) => item.accountId);
            const displayNames = await fetchJson<TmDisplayNameItem[]>(
              TM_API.displayNamesUrl(accountIds),
              {
                headers: {
                  ...FETCH_HEADERS,
                  Authorization: 'nadeo_v1 t=' + nadeoToken?.accessToken,
                },
              }
            ).then((arr) => {
              const result = new Map<string, string>();
              arr.forEach((acc) => result.set(acc.accountId, acc.displayName));
              return result;
            });
            // create records data structure from leaderboard
            records[map.Name] = rawRecords.map((rec, idx) => {
              return {
                position: idx + 1,
                username: displayNames.get(rec.accountId) ?? 'unknown',
                time: rec.score / 1000,
              };
            });
          }
          // compare to last result cached in file
          const fileRecords = await readRecordsFile();
          const diff = getNewRecords(fileRecords, records);
          // if there are changes, notify and save new version
          if (Object.keys(diff).length) {
            let message = 'Found new records:\n';
            for (const [mapName, records] of Object.entries(diff)) {
              message += `=> ${mapName}\n`;
              for (const record of records) {
                message += `${record?.position}. ${record.username} - ${record.time}\n`;
              }
              message += '\n';
            }
            console.log(message);
            sendMessage(message);
            writeRecordsFile(records);
            noChangeCounter = 0;
          } else {
            console.log('No changes detected');
			noChangeCounter++;
			if (noChangeCounter >= 10) {
				sendMessage('No changes detected in last 10 tries');
				noChangeCounter = 0;
			}
          }
          errorWaitTime = DEFAULT_ERROR_WAIT_TIME;
          await sleep(WAIT_TIME);
        } catch (e) {
          console.error('Resetting due to an error', e);
          session = undefined;
          nadeoToken = undefined;
          nadeoLiveToken = undefined;
          await sleep(errorWaitTime);
          if (errorWaitTime < MAX_ERROR_WAIT_TIME) {
            errorWaitTime *= 2;
          } else {
          	sendMessage('Max error wait time exceeded');
          }
          break;
        }
      }
      if (
        !nadeoLiveToken?.refreshToken ||
        (nadeoLiveToken?.refreshTokenExpiry ?? 0 < Date.now())
      ) {
        break;
      }
      // get new access token
      nadeoLiveToken = await getTmAuthToken(
        nadeoLiveToken.refreshToken,
        'NadeoLiveServices'
      );
    }
  }
})();
