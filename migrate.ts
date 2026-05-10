import { migrate } from "drizzle-orm/bun-sqlite/migrator";

import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const dbFilePath = "./data/sqlite.db";

try {
  mkdirSync(dirname(dbFilePath), { recursive: true });
  const sqlite = new Database(dbFilePath);
  const db = drizzle(sqlite);
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migration complete");
} catch (err) {
  console.error("Error migrating database:", err);
  process.exit(1);
}
