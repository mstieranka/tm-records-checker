import { asc, desc, eq, sql } from 'drizzle-orm';
import { db } from './database';
import { maps, players, records } from './schema';

export async function getLatestRecords() {
  return await db
    .select({
      id: records.id,
      mapName: maps.tmxName,
      mapId: records.mapId,
      position: sql<number>`row_number() over (partition by ${records.mapId} order by ${records.timeMs})`,
      playerName: players.name,
      timeMs: records.timeMs,
      timestamp: records.timestamp,
    })
    .from(records)
    .innerJoin(maps, eq(records.mapId, maps.ingameId))
    .innerJoin(players, eq(records.playerId, players.id))
    .orderBy(desc(records.timestamp), asc(maps.tmxName), asc(records.timeMs))
    .limit(100);
}
