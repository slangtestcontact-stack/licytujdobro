import pg from "pg";
import fs from "node:fs/promises";
import path from "node:path";
const url = process.env.DATABASE_URL;
if (!url) throw new Error("Brak DATABASE_URL.");
const sql = await fs.readFile(path.join(process.cwd(), "drizzle/manual/2026-07-30_v1.6_interest_then_auction.sql"), "utf8");
const client = new pg.Client({ connectionString: url });
await client.connect();
try { await client.query(sql); console.log("Migracja LicytujDobro 1.6 zakończona powodzeniem."); }
finally { await client.end(); }
