# Aktualizacja 0.7 → 0.8

Wersja 0.8 dodaje funkcje społecznościowe i promocyjne, które mają współpracować z grupami Facebookowymi zamiast je zastępować.

## Aktualizacja

1. Zrób kopię bazy i starego folderu projektu.
2. Skopiuj `.env` oraz własne pliki z `public/uploads` do nowej paczki.
3. Uruchom:

```powershell
npm install
docker compose up -d
npm run db:push
npm run db:seed
npm run dev
```

Podczas `db:push` zaakceptuj dodanie nowych tabel i kolumn.

`db:seed` jest idempotentny. Nie usuwa użytkowników, aukcji ani transakcji. Tworzy domyślną otwartą drużynę „Społeczność Biłgoraja dla Adasia” oraz pierwszą neutralną aktualność o starcie akcji.

## Nowe tabele

- `category_interests` - zainteresowania użytkowników;
- `newsletter_subscriptions` - zapisy do tygodniowych wiadomości;
- `support_teams` i `team_memberships` - drużyny szkół, firm i grup;
- `campaign_updates` - aktualności o Adasiu i akcji;
- `community_events` - tygodnie tematyczne i wydarzenia;
- `share_events` - pomiar wykorzystania narzędzi promocyjnych.

Do `watchlists` dochodzą preferencje przypomnień, a do `notifications` klucz zapobiegający wielokrotnemu wysłaniu tego samego przypomnienia.

## Przypomnienia obserwowanych aukcji

Scheduler powinien wywoływać co 15–30 minut:

```text
POST /api/cron/reminders
Authorization: Bearer <CRON_SECRET>
```

Endpoint tworzy powiadomienia około 24 godziny i około godzinę przed końcem aukcji. Dzięki kluczom deduplikacji ponowne wywołanie nie tworzy duplikatów.

## Panel społeczności

Po zalogowaniu jako administrator otwórz:

```text
http://localhost:3000/admin/spolecznosc
```

Można tam tworzyć drużyny, publikować aktualności oraz planować wydarzenia.

## Centrum promocji

Na stronie każdej aukcji znajduje się przycisk „Promuj”. Centrum generuje:

- gotowy post na Facebooka;
- wariant „ostatnia szansa”;
- bezpośrednie udostępnienie;
- link do WhatsAppa i Facebooka;
- grafikę PNG 1080×1350 z tytułem, ceną i adresem aukcji.

## Newsletter

Wywołuj `POST /api/cron/newsletter` raz w tygodniu z nagłówkiem `Authorization: Bearer <CRON_SECRET>`. W trybie developerskim wiadomości pojawiają się w konsoli; produkcja wymaga skonfigurowania dostawcy w `src/lib/email.ts`.
