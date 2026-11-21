import "server-only";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

export type DB = PgliteDatabase<typeof schema>;

/**
 * Local development and tests run Postgres inside the process (PGlite).
 * `TABYL_DB_DIR` picks the data folder; `memory://` gives a throwaway database.
 * At deploy this module is swapped for a postgres-js client with the same schema.
 */
async function open(dataDir: string): Promise<DB> {
  if (!dataDir.startsWith("memory://")) mkdirSync(path.dirname(dataDir), { recursive: true });
  const client = await PGlite.create({ dataDir, extensions: { pg_trgm } });
  await client.exec("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

const g = globalThis as unknown as { __tabylDb?: Promise<DB> };

export function getDb(): Promise<DB> {
  if (!g.__tabylDb) {
    const dir = process.env.TABYL_DB_DIR ?? path.join(process.cwd(), ".data", "pglite");
    g.__tabylDb = open(dir).catch((e) => {
      g.__tabylDb = undefined; // retry on the next request instead of caching the failure
      throw e;
    });
  }
  return g.__tabylDb;
}

/** A fresh in-memory database, for tests. */
export function openTestDb(): Promise<DB> {
  return open("memory://");
}
