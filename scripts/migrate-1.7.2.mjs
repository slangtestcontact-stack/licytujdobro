import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Brak DATABASE_URL w pliku .env");
}

const client = new Client({
  connectionString: databaseUrl,
});

try {
  await client.connect();
  await client.query("begin");

  await client.query(`
    create table if not exists transaction_messages (
      id text primary key,
      transaction_id text not null
        references transactions(id)
        on delete cascade,
      sender_id text not null
        references users(id)
        on delete cascade,
      recipient_id text not null
        references users(id)
        on delete cascade,
      body varchar(1000) not null,
      created_at timestamptz not null default now(),
      constraint transaction_messages_different_users
        check (sender_id <> recipient_id),
      constraint transaction_messages_body_not_blank
        check (length(btrim(body)) > 0)
    );
  `);

  await client.query(`
    create index if not exists transaction_messages_transaction_created_idx
      on transaction_messages(transaction_id, created_at);
  `);

  await client.query(`
    create index if not exists transaction_messages_recipient_created_idx
      on transaction_messages(recipient_id, created_at);
  `);

  await client.query("commit");

  console.log(
    "Migracja 1.7.2 zakończona pomyślnie — wiadomości są gotowe.",
  );
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  console.error("Migracja nie powiodła się:", error);
  process.exitCode = 1;
} finally {
  await client.end();
}
