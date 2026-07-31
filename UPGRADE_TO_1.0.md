# Aktualizacja z 0.9 do 1.0

1. Rozpakuj wersję 1.0 do nowego katalogu.
2. Skopiuj ze starego projektu `.env` oraz własne pliki z `public/uploads`.
3. Porównaj `.env` z nowym `.env.example` i dodaj brakujące ustawienia OAuth, kontaktu, środowiska oraz backupu.
4. Uruchom:

```powershell
npm install
docker compose up -d
npm run db:push
npm run db:seed
npm run dev
```

`db:push` dodaje nowe tabele i kolumny. Bootstrap nie usuwa użytkowników, aukcji ani transakcji. Aktualizuje aktywną kampanię i snapshoty niezakończonych transakcji na nową Skarbonkę LicytujDobro.

Przed zatwierdzeniem zmian Drizzle przejrzyj listę SQL. Przy operacji sugerującej usuwanie danych wykonaj backup i nie zatwierdzaj jej automatycznie.
