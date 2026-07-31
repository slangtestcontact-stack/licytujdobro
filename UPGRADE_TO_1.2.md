# Aktualizacja z 1.1 do 1.2

Wersja 1.2 dodaje nowe kolumny i tabelę przypomnień gości, dlatego wymaga aktualizacji schematu bazy.

## Kroki

1. Zrób kopię bazy i katalogu `public/uploads`.
2. Skopiuj swój `.env` do nowego projektu.
3. Uruchom:

```powershell
npm install
docker compose up -d
npm run db:push
npm run db:seed
npm run dev
```

Przy `db:push` przejrzyj polecenia. Oczekiwane zmiany to między innymi:

- `listings.is_special`;
- `listings.special_label`;
- `transactions.planned_donation_amount`;
- tabela `guest_auction_reminders`.

Nie uruchamiaj `docker compose down -v`, ponieważ usuwa wolumen bazy.

## Po aktualizacji

Sprawdź:

- licytację jako niezalogowany użytkownik i zachowanie wpisanej kwoty;
- logowanie kodem e-mail oraz powrót do potwierdzenia oferty;
- jednorazowe przypomnienie e-mail bez konta;
- zakończenie aukcji z co najmniej dwoma licytującymi;
- ekran pomocy dla przegranego;
- dobrowolne zwiększenie wpłaty przez zwycięzcę;
- wyróżnianie aukcji specjalnej w panelu administratora.
