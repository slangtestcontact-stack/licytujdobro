import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import "dotenv/config";

const dump = process.argv[2] ? resolve(process.argv[2]) : null;
const target = process.env.RESTORE_TEST_DATABASE_URL;
if (!dump || !existsSync(dump)) throw new Error("Użycie: npm run backup:verify -- ścieżka/do/database.dump");
if (!target) throw new Error("Ustaw RESTORE_TEST_DATABASE_URL wskazujący osobną, pustą bazę testową.");
const result = spawnSync("pg_restore", ["--clean", "--if-exists", "--no-owner", "--dbname", target, dump], { stdio: "inherit", shell: process.platform === "win32" });
if (result.status !== 0) throw new Error("Test odtworzenia nie powiódł się.");
const main = process.env.DATABASE_URL;
if (main) {
  const pool = new pg.Pool({ connectionString: main });
  try { await pool.query("update backup_runs set restore_tested_at=now(), updated_at=now() where storage_location is not null and status='SUCCESS' and finished_at=(select max(finished_at) from backup_runs where status='SUCCESS')"); } finally { await pool.end(); }
}
console.log("Kopia została poprawnie odtworzona w bazie testowej.");
