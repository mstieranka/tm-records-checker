import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { resolveSync } from 'bun';

const sqlite = new Database(resolveSync('./data/sqlite.db', process.cwd()), {
  create: false,
  readwrite: true,
});
export const db = drizzle(sqlite);
git