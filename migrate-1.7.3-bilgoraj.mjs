import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Brak DATABASE_URL w pliku .env.");
}

const CITY = "Biłgoraj";
const REGION = "Biłgoraj i okolice";
const LEGACY_CITIES = ["warszawa", "warszawa i okolice"];
const LEGACY_DISTRICTS = ["mokotów", "śródmieście", "ursynów", "wola", "praga"];

function upsertEnvValue(content, key, value) {
  const line = `${key}=${JSON.stringify(value)}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");

  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }

  const separator = content.length === 0 || content.endsWith("\n") ? "" : "\n";
  return `${content}${separator}${line}\n`;
}

function updateEnvFile(filePath) {
  if (!existsSync(filePath)) return false;

  let content = readFileSync(filePath, "utf8");
  content = upsertEnvValue(content, "PILOT_CITY", CITY);
  content = upsertEnvValue(content, "NEXT_PUBLIC_PILOT_CITY", REGION);
  writeFileSync(filePath, content, "utf8");
  return true;
}

async function tableExists(client, tableName) {
  const result = await client.query(
    "select to_regclass($1) as table_name",
    [`public.${tableName}`],
  );
  return Boolean(result.rows[0]?.table_name);
}

const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();
  await client.query("begin");

  if (await tableExists(client, "admin_settings")) {
    for (const [key, value] of [
      ["pilotCity", CITY],
      ["pilotRegionLabel", REGION],
    ]) {
      await client.query(
        `
          insert into admin_settings (id, key, value, updated_at)
          values ($1, $2, $3::jsonb, now())
          on conflict (key) do update
          set value = excluded.value, updated_at = now()
        `,
        [randomUUID(), key, JSON.stringify(value)],
      );
    }
  }

  let changedListings = 0;
  if (await tableExists(client, "listings")) {
    const result = await client.query(
      `
        update listings
        set
          city = $1,
          district = $2,
          updated_at = now()
        where lower(btrim(city)) = any($3::text[])
           or lower(btrim(district)) = any($4::text[])
      `,
      [CITY, REGION, LEGACY_CITIES, LEGACY_DISTRICTS],
    );
    changedListings = result.rowCount ?? 0;
  }

  let changedProfiles = 0;
  if (await tableExists(client, "user_profiles")) {
    const result = await client.query(
      `
        update user_profiles
        set public_region = $1, updated_at = now()
        where public_region is null
           or btrim(public_region) = ''
           or lower(btrim(public_region)) = any($2::text[])
      `,
      [REGION, [...LEGACY_CITIES, ...LEGACY_DISTRICTS]],
    );
    changedProfiles = result.rowCount ?? 0;
  }

  // Zmieniamy wyłącznie rozpoznawalne konta demonstracyjne, nie dane prawdziwych użytkowników.
  let changedDemoUsers = 0;
  if (await tableExists(client, "users")) {
    const result = await client.query(
      `
        update users
        set city = $1, updated_at = now()
        where email like '%@example.com'
          and lower(btrim(city)) = any($2::text[])
      `,
      [CITY, [...LEGACY_CITIES, ...LEGACY_DISTRICTS]],
    );
    changedDemoUsers = result.rowCount ?? 0;
  }

  await client.query("commit");

  const envUpdated = updateEnvFile(resolve(process.cwd(), ".env"));
  const exampleUpdated = updateEnvFile(resolve(process.cwd(), ".env.example"));

  console.log("Migracja regionu zakończona pomyślnie.");
  console.log(`Miasto główne: ${CITY}`);
  console.log(`Obszar serwisu: ${REGION}`);
  console.log(`Poprawione ogłoszenia: ${changedListings}`);
  console.log(`Poprawione profile publiczne: ${changedProfiles}`);
  console.log(`Poprawione konta demonstracyjne: ${changedDemoUsers}`);
  console.log(`Zaktualizowano .env: ${envUpdated ? "tak" : "nie"}`);
  console.log(`Zaktualizowano .env.example: ${exampleUpdated ? "tak" : "nie"}`);
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  console.error("Migracja regionu nie powiodła się:", error);
  process.exitCode = 1;
} finally {
  await client.end();
}
