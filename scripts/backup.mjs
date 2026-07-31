import { spawnSync } from "node:child_process";
import { mkdirSync, cpSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Brak DATABASE_URL.");
const base = resolve(process.env.BACKUP_DIRECTORY || "./backups");
const stamp = new Date().toISOString().replaceAll(":", "-").replace(".", "-");
const target = resolve(base, stamp);
mkdirSync(target, { recursive: true });
const pool = new pg.Pool({ connectionString: databaseUrl });
const runId = crypto.randomUUID();
try {
  await pool.query('insert into backup_runs (id, kind, status, storage_location, started_at, created_at, updated_at) values ($1, $2, $3, $4, now(), now(), now())', [runId, 'FULL', 'RUNNING', target]);
  const dumpPath = resolve(target, "database.dump");
  const result = spawnSync("pg_dump", ["--format=custom", "--file", dumpPath, databaseUrl], { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) throw new Error("pg_dump nie zakończył się poprawnie. Zainstaluj narzędzia PostgreSQL i sprawdź DATABASE_URL.");
  try { cpSync(resolve("public/uploads"), resolve(target, "uploads"), { recursive: true }); } catch { console.warn("Brak public/uploads - pomijam kopię plików."); }
  writeFileSync(resolve(target, "manifest.json"), JSON.stringify({ createdAt: new Date().toISOString(), appVersion: process.env.npm_package_version || "unknown", database: "database.dump", uploads: "uploads" }, null, 2));
  await pool.query('update backup_runs set status=$1, finished_at=now(), note=$2, updated_at=now() where id=$3', ['SUCCESS', 'Kopia bazy i katalogu uploadów została utworzona.', runId]);
  console.log(`Backup zapisany: ${target}`);
} catch (error) {
  try { await pool.query('update backup_runs set status=$1, finished_at=now(), note=$2, updated_at=now() where id=$3', ['FAILED', String(error?.message || error).slice(0, 2000), runId]); } catch {}
  throw error;
} finally { await pool.end(); }
