import { migrate } from 'drizzle-orm/bun-sqlite/migrator';

import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { file } from 'bun';
import { accessSync, constants } from 'node:fs';

const dbFilePath = './data/sqlite.db';
const dbFile = file(dbFilePath);
if (!(await dbFile.exists())) {
  console.log('Database file does not exist, creating...');
}
try {
  accessSync(dbFilePath, constants.R_OK | constants.W_OK);
  const sqlite = new Database('./data/sqlite.db');
  const db = drizzle(sqlite);
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migration complete');
} catch (err) {
  console.error('Error migrating database:', err);
  process.exit(1);
}
