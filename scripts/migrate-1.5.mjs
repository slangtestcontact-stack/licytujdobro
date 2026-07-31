import "dotenv/config";
import { readFile } from "node:fs/promises";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("Brak DATABASE_URL w pliku .env.");

const migrationSql = await readFile(
  new URL("../drizzle/manual/2026-07-29_v1.5_performance_indexes.sql", import.meta.url),
  "utf8",
);

const client = new pg.Client({ connectionString: databaseUrl });
try {
  await client.connect();
  await client.query(migrationSql);
  console.log("Migracja LicytujDobro 1.5 zakończona powodzeniem.");
} finally {
  await client.end();
}
