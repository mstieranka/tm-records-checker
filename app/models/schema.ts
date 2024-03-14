import { int, text, sqliteTable, unique } from 'drizzle-orm/sqlite-core';

export const maps = sqliteTable(
  'maps',
  {
    ingameId: text('ingame_id').notNull().primaryKey(),
    ingameName: text('ingame_name').notNull(),
    tmxId: int('tmx_id').notNull(),
    tmxName: text('tmx_name').notNull(),
    authorTimeMs: int('author_time_ms').notNull(),
    uploadedAt: text('uploaded_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    unique_tmx: unique().on(t.tmxId),
  })
);

export const records = sqliteTable(
  'records',
  {
    id: int('id').notNull().primaryKey({ autoIncrement: true }),
    mapId: text('map_id')
      .notNull()
      .references(() => maps.ingameId),
    playerId: text('player_id')
      .references(() => players.id)
      .notNull(),
    timeMs: int('time_ms').notNull(),
    timestamp: text('timestamp').notNull(),
  },
  (t) => ({
    unique_player_map: unique().on(t.mapId, t.playerId),
    unique_player_map_time: unique().on(t.mapId, t.playerId, t.timeMs),
  })
);

export const players = sqliteTable('players', {
  id: text('id').notNull().primaryKey(),
  name: text('name').notNull(),
});
