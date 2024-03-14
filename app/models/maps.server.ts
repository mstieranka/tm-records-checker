import { desc, eq, sql } from 'drizzle-orm';
import { db } from '~/models/database';
import { maps, players, records } from '~/models/schema';

export const getMaps = async () => {
  return await db
    .select({
      ingameId: maps.ingameId,
      ingameName: maps.ingameName,
      tmxId: maps.tmxId,
      tmxName: maps.tmxName,
      uploadedAt: maps.uploadedAt,
      updatedAt: maps.updatedAt,
      authorTimeMs: maps.authorTimeMs,
      worldRecordTimeMs: sql<number>`cast(min(${records.timeMs}) as integer)`,
      worldRecordPlayerName: sql<string>`(select ${players.name} from ${players} where ${players.id} = (select ${records.playerId} from ${records} where ${records.mapId} = ${maps.ingameId} order by ${records.timeMs} limit 1))`,
    })
    .from(maps)
    .leftJoin(records, eq(maps.ingameId, records.mapId))
    .leftJoin(players, eq(records.playerId, players.id))
    .groupBy(maps.ingameId)
    .orderBy(desc(maps.uploadedAt));
};

export const getMapInfo = async (ingameId: string) => {
  const map = await db
    .select()
    .from(maps)
    .where(eq(maps.ingameId, ingameId))
    .limit(1);

  if (map.length === 0) {
    return null;
  }

  const recordList = await db
    .select({
      timeMs: records.timeMs,
      playerName: players.name,
      timestamp: records.timestamp,
    })
    .from(records)
    .innerJoin(players, eq(records.playerId, players.id))
    .where(eq(records.mapId, ingameId))
    .orderBy(records.timeMs);

  return {
    ...map[0],
    records: recordList,
  };
};
