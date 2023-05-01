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
    'tm-records-checker (runs every once in a while); matej@stieranka.eu',
} as HeadersInit;

const fetchJson = async <T>(input: RequestInfo, init?: RequestInit) => {
  return (await (await fetch(input, init)).json()) as T;
};

const fetchTmAuthToken = async (authTicket: string, audience: string) => {
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
  });
  auth.accessTokenExpiry = (decodeJwt(auth.accessToken).exp ?? 0) * 1000;
  auth.refreshTokenExpiry = (decodeJwt(auth.refreshToken).exp ?? 0) * 1000;
  return auth as TmAuthToken;
};

const getTmAuthToken = async (
  authData: AuthData,
  audience: 'NadeoServices' | 'NadeoLiveServices' | 'NadeoClubServices'
) => {
  if (!authData) return;

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
  });
  return fetchTmAuthToken(session.ticket, audience);
};

interface Records {
  [mapName: string]: {
    position?: number;
    username: string;
    time: number;
  }[];
}

const readRecordsFile = async () => {
  const recordsFile = await readFile('records.json');
  return JSON.parse(recordsFile.toString('utf-8')) as Records;
};

const writeRecordsFile = async (records: Records) => {
  return await writeFile('records.json', JSON.stringify(records));
};

const readConfigFile = async () => {
  const configFile = await readFile('config.json');
  return JSON.parse(configFile.toString('utf-8')) as Config;
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

const getNewRecords = (oldRecords: Records, newRecords: Records) => {
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

const WAIT_TIME = 24 * 60 * 60 * 1000;
(async () => {
  // load config
  const config = await readConfigFile();
  if (!config.tmAuth) {
    console.error('Expected "tmAuth" property in "config.json"');
  }
  if (!config.tmxSearchOptions) {
    console.error('Expected "tmxSearchOptions" property in "config.json"');
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

  let nadeoLiveToken: TmAuthToken | undefined = undefined;
  let nadeoToken: TmAuthToken | undefined = undefined;
  while (true) {
    // get new refresh token
    nadeoLiveToken = await getTmAuthToken(config.tmAuth, 'NadeoLiveServices');
    nadeoToken = await getTmAuthToken(config.tmAuth, 'NadeoServices');
    console.log('Got Nadeo TM API tokens', nadeoLiveToken, nadeoToken);
    while (true) {
      while (nadeoLiveToken?.accessTokenExpiry ?? 0 > Date.now()) {
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
        } else {
          console.log('No changes detected');
        }

        console.log('Waiting for ' + WAIT_TIME / 60 / 60 / 1000 + ' hours');
        await new Promise((resolve) => setTimeout(resolve, WAIT_TIME));
      }
      if (
        !nadeoLiveToken?.refreshToken ||
        (nadeoLiveToken?.refreshTokenExpiry ?? 0 < Date.now())
      ) {
        break;
      }
      // get new access token
      nadeoLiveToken = await fetchTmAuthToken(
        nadeoLiveToken.refreshToken,
        'NadeoLiveServices'
      );
    }
  }
})();
