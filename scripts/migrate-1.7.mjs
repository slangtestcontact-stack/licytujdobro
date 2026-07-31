import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Brak DATABASE_URL. Uruchom: node --env-file=.env scripts/migrate-1.7.mjs");
}

const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();
  await client.query("begin");

  await client.query(`
    alter table auctions
      add column if not exists mode varchar(40) not null default 'FIXED_DONATION',
      add column if not exists interest_deadline timestamptz,
      add column if not exists interest_duration_hours integer not null default 48,
      add column if not exists auction_duration_hours integer not null default 24;
  `);

  // Przy pierwszym dodaniu kolumny zachowujemy dotychczasowe progi przebicia.
  await client.query(`
    do $$
    begin
      if not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'auctions'
          and column_name = 'min_bid_increment'
      ) then
        alter table auctions
          add column min_bid_increment numeric(10, 2) not null default 5;

        update auctions
        set min_bid_increment = case
          when current_price::numeric <= 49 then 2
          when current_price::numeric <= 199 then 5
          when current_price::numeric <= 499 then 10
          else 20
        end;
      end if;
    end
    $$;
  `);

  await client.query(`
    alter table auctions
      alter column mode set default 'FIXED_DONATION';
  `);

  // Rozpoczęte licytacje z poprzedniego modelu pozostają licytacjami.
  await client.query(`
    update auctions
    set mode = 'AUCTION', updated_at = now()
    where mode = 'INTEREST_THEN_AUCTION'
      and (status = 'AKTYWNA' or bid_count > 0);
  `);

  // Pozostałe rekordy starego modelu stają się trybem stałej wpłaty.
  await client.query(`
    update auctions
    set mode = 'FIXED_DONATION', updated_at = now()
    where mode = 'INTEREST_THEN_AUCTION';
  `);

  // Tabela zainteresowań mogła nie powstać na instalacji z przerwaną migracją 1.6.
  await client.query(`
    do $$
    begin
      if to_regclass('public.listing_interests') is not null then
        execute $sql$
          update listing_interests li
          set
            status = 'WITHDRAWN',
            withdrawn_at = coalesce(withdrawn_at, now()),
            updated_at = now()
          from auctions a
          where li.auction_id = a.id
            and a.mode = 'FIXED_DONATION'
            and li.status = 'ACTIVE'
        $sql$;
      end if;
    end
    $$;
  `);

  // Trwające okna zainteresowania przechodzą na jednoznaczną stałą wpłatę.
  await client.query(`
    update auctions
    set
      status = 'AKTYWNA',
      interest_deadline = null,
      start_at = coalesce(start_at, now()),
      end_at = case
        when end_at is null or end_at <= now()
          then now() + greatest(duration_days, 1) * interval '1 day'
        else end_at
      end,
      original_end_at = case
        when original_end_at is null or original_end_at <= now()
          then now() + greatest(duration_days, 1) * interval '1 day'
        else original_end_at
      end,
      updated_at = now()
    where mode = 'FIXED_DONATION'
      and status = 'ZBIERANIE_ZAINTERESOWANIA'
      and winner_id is null;
  `);

  await client.query("commit");
  console.log("Migracja 1.7 zakończona pomyślnie.");
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
