import { BasicApi } from './basicApi';
import { Notifier } from './notifier';
import { OAuthApi } from './oauthApi';
import { TmxMap } from './tmxApi';

export interface Records {
  [mapName: string]: {
    position?: number;
    username: string;
    time: number;
  }[];
}

const readRecordsFile = async () => {
  try {
    const file = Bun.file('records.json');
    const records = await file.text();
    return JSON.parse(records) as Records;
  } catch (e) {
    console.error('Error reading records.json', e);
    return undefined;
  }
};

const writeRecordsFile = async (records: Records) => {
  return await Bun.write('records.json', JSON.stringify(records));
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

let changeCounter = 0;
export const sendRecordsUpdate = async (
  newRecords: Records,
  notifier?: Notifier
) => {
  const fileRecords = await readRecordsFile();
  const diff = getNewRecords(fileRecords, newRecords);
  if (Object.keys(diff).length > 0) {
    let message = 'Found new records:\n';
    for (const [mapName, records] of Object.entries(diff)) {
      message += `=> ${mapName}\n`;
      for (const record of records) {
        message += `${record?.position}. ${record.username} - ${record.time}\n`;
      }
      message += '\n';
    }
    console.log(message);
    notifier?.sendMessage('New TM records', message);
    writeRecordsFile(newRecords);
    changeCounter = 0;
  } else {
    console.log('No changes detected');
    changeCounter++;
    if (changeCounter >= 10) {
      notifier?.sendMessage(
        'No new TM records',
        'No changes detected in last 10 tries'
      );
      changeCounter = 0;
    }
  }
};

export const getRecords = async (
  map: TmxMap,
  basicApi: BasicApi,
  oauthApi: OAuthApi
) => {
  const leaderboard = await basicApi.getLeaderboard(map.TrackUID);
  const rawRecords = leaderboard.tops.at(0)?.top ?? [];
  const accountIds = rawRecords.map((item) => item.accountId);
  const displayNames = await oauthApi.getDisplayNames(accountIds);
  return rawRecords.map((rec, idx) => {
    return {
      position: idx + 1,
      username: displayNames[rec.accountId] ?? 'unknown',
      time: rec.score / 1000,
    };
  });
};
