import { db } from '~/models/database';
import { maps, players, records } from '~/models/schema';
import { getConfig } from './config.server';
import { getTmxMaps } from './tmxApi';
import { getPlayerNames } from './oauthApi';
import { getRecords } from './basicApi';
import { ExtractTablesWithRelations, eq, sql } from 'drizzle-orm';
import { SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import { sendRecordsNotification } from './notifier';
import { sleep } from '~/utils';

export async function refetchTmxMaps() {
  const tmxMaps = await getTmxMaps(
    getConfig().api.tmx.searchParams,
    getConfig().api.userAgent
  );
  await db
    .insert(maps)
    .values(
      tmxMaps.map((map) => ({
        tmxId: map.TrackID,
        tmxName: map.Name,
        ingameId: map.TrackUID,
        ingameName: map.GbxMapName,
        authorTimeMs: map.AuthorTime,
        uploadedAt: map.UploadedAt,
        updatedAt: map.UpdatedAt,
      }))
    )
    .onConflictDoUpdate({
      target: maps.tmxId,
      set: {
        tmxName: sql`excluded.tmx_name`,
        ingameId: sql`excluded.ingame_id`,
        ingameName: sql`excluded.ingame_name`,
        authorTimeMs: sql`excluded.author_time_ms`,
        uploadedAt: sql`excluded.uploaded_at`,
        updatedAt: sql`excluded.updated_at`,
      },
      where: sql`${maps.updatedAt} > excluded.updated_at`,
    });
}

export interface RecordUpdate {
  playerName: string;
  timeMs: number;
  timestamp: string;
  position: number;
}

export type UpdatedRecords = {
  [mapName: string]: RecordUpdate[];
};

export async function refetchRecords() {
  const updatedRecords: UpdatedRecords = {};
  const mapList = await db
    .select({ id: maps.ingameId, name: maps.tmxName })
    .from(maps);
  const now = new Date().toISOString();
  for await (const map of mapList) {
    try {
      const apiRecords = await getRecords(
        map.id,
        getConfig().api.tmBasic,
        getConfig().api.userAgent
      );
      await db.transaction(async (tx) => {
        await tx
          .insert(records)
          .values(
            apiRecords.map((record) => ({
              mapId: map.id,
              playerId: record.accountId,
              timeMs: record.score,
              timestamp: now,
            }))
          )
          .onConflictDoUpdate({
            target: [records.mapId, records.playerId],
            set: {
              timeMs: sql`excluded.time_ms`,
              timestamp: sql`excluded.timestamp`,
            },
            where: sql`${records.timeMs} > excluded.time_ms`,
          });
        await fetchPlayersWithNoName(tx);

        // set list of updated records to return for this map
        const newRecords = await tx
          .select({
            playerName: players.name,
            timeMs: records.timeMs,
            timestamp: records.timestamp,
            position: sql<number>`(select count(*) from records rc where rc.map_id = ${records.mapId} and rc.time_ms <= ${records.timeMs})`,
          })
          .from(records)
          .innerJoin(players, eq(records.playerId, players.id))
          .where(
            sql`${records.mapId} = ${map.id} and ${records.timestamp} = ${now}`
          );
        if (newRecords.length > 0) {
          updatedRecords[map.name] = newRecords;
        }
      });
    } catch (e: any) {
      if (e instanceof Error) {
        console.error(`Failed to refetch records for ${map.id}: ${e.message}`);
      } else if (e instanceof Response) {
        console.error(
          `Failed to refetch records for ${map.id}: ${e.statusText}`
        );
      }
      continue;
    }
  }
  sendRecordsNotification(updatedRecords, getConfig().notifications);
}

async function fetchPlayersWithNoName(
  tx?: SQLiteTransaction<
    'sync',
    void,
    Record<string, never>,
    ExtractTablesWithRelations<Record<string, never>>
  >
) {
  const accountList = await (tx ?? db)
    .select({ id: records.playerId })
    .from(records)
    .leftJoin(players, eq(records.playerId, players.id))
    .where(sql`${players.name} IS NULL`);
  for await (const playerList of getPlayerNames(
    accountList.flatMap((p) => (p.id === null ? [] : p.id)),
    getConfig().api.tmOauth
  )) {
    await (tx ?? db)
      .insert(players)
      .values(playerList)
      .onConflictDoUpdate({
        target: players.id,
        set: {
          name: sql`excluded.name`,
        },
      });
  }
}

export async function refetchPlayers() {
  // max 50 players per request, so we need to do multiple requests
  const accountList = await db.select({ id: players.id }).from(players);
  await db.transaction(async (tx) => {
    for await (const playerList of getPlayerNames(
      accountList.map((p) => p.id),
      getConfig().api.tmOauth
    )) {
      await tx
        .insert(players)
        .values(playerList)
        .onConflictDoUpdate({
          target: players.id,
          set: {
            name: sql`excluded.name`,
          },
        });
    }
  });
}

export interface Task {
  name: string;
  task: () => Promise<void>;
  cron: string;
  polling: boolean;
}

export const tasks: Task[] = [
  {
    name: 'RefetchMaps',
    task: refetchTmxMaps,
    cron: '0 23 * * *', // every day at 11pm
    polling: false,
  },
  {
    name: 'RefetchRecords',
    task: refetchRecords,
    cron: '0 6,12,18,0 * * *', // every day every 6 hours
    polling: false,
  },
  {
    name: 'RefetchPlayers',
    task: refetchPlayers,
    cron: '0 0 * * 5', // every Friday at midnight
    polling: false,
  },
];

export async function pollTask(task: Task, pollPeriod: number) {
  while (true) {
    await task.task();
    if (!task.polling) {
      console.log('Polling end detected for', task.name);
      break;
    }
    await sleep(pollPeriod);
  }
}
