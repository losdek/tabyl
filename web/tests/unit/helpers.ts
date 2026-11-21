import { sql } from "drizzle-orm";
import { openTestDb, type DB } from "@/db/client";

let shared: Promise<DB> | undefined;

/** One in-memory Postgres per test file, emptied before each test. */
export async function freshDb(): Promise<DB> {
  shared ??= openTestDb();
  const db = await shared;
  const { rows } = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  );
  if (rows.length) await db.execute(sql.raw(`truncate ${rows.map((r) => `"${r.tablename}"`).join(", ")} cascade`));
  return db;
}
