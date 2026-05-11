/**
 * This script migrates data from the existing SQLite database to the new PostgreSQL database.
 * It reads all records from the SQLite database and inserts them into the PostgreSQL database,
 * while handling potential conflicts (e.g., duplicate entries) gracefully.
 *
 * To run this script, use the command: `bun run db:migrate-data`
 *
 * Note: Ensure that the PostgreSQL database is set up and the connection URL is correctly configured
 * in the environment variables before running this script.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import { Database } from "bun:sqlite";
import postgres from "postgres";
import { maps, players, records } from "./app/models/schema";

const sqliteDb = new Database("./data/sqlite.db", { readonly: true });
const pgClient = postgres(process.env.DATABASE_URL!, { max: 1 });
const pgDb = drizzle(pgClient);

try {
  const allMaps = sqliteDb
    .prepare(
      `SELECT ingame_id AS "ingameId", ingame_name AS "ingameName", tmx_id AS "tmxId",
              tmx_name AS "tmxName", author_time_ms AS "authorTimeMs",
              uploaded_at AS "uploadedAt", updated_at AS "updatedAt" FROM maps`,
    )
    .all() as (typeof maps.$inferInsert)[];
  if (allMaps.length > 0) {
    await pgDb.insert(maps).values(allMaps).onConflictDoNothing({ target: maps.ingameId });
    console.log(`Migrated ${allMaps.length} maps`);
  }

  const allPlayers = sqliteDb
    .prepare("SELECT * FROM players")
    .all() as (typeof players.$inferInsert)[];
  if (allPlayers.length > 0) {
    await pgDb.insert(players).values(allPlayers).onConflictDoNothing({ target: players.id });
    console.log(`Migrated ${allPlayers.length} players`);
  }

  const allRecords = sqliteDb
    .prepare(
      `SELECT id, map_id AS "mapId", player_id AS "playerId",
              time_ms AS "timeMs", timestamp FROM records`,
    )
    .all() as (typeof records.$inferInsert & { id: number })[];
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < allRecords.length; i += BATCH) {
    const values = allRecords.slice(i, i + BATCH).map(({ id: _id, ...rest }) => rest);
    await pgDb
      .insert(records)
      .values(values)
      .onConflictDoNothing({ target: [records.mapId, records.playerId] });
    inserted += values.length;
  }
  console.log(`Migrated ${inserted} records`);

  console.log("Data migration complete");
} catch (err) {
  console.error("Data migration failed:", err);
  process.exit(1);
} finally {
  await pgClient.end();
  sqliteDb.close();
}
