# Aktualizacja LicytujDobro 1.3 → 1.4

## Co zmienia wersja 1.4

- formularz ogłoszenia ma cztery proste kroki;
- pełny opis, wady i kompletność są opcjonalne;
- miejscowość wpisuje użytkownik, bez pola dzielnicy;
- wystarczy jedno zdjęcie; zdjęcie weryfikacyjne nie jest wymagane;
- są tylko dwa oświadczenia przed moderacją;
- szkic formularza jest automatycznie zachowywany w przeglądarce;
- zdjęcia są sprawdzane po sygnaturze pliku i ponownie kodowane do WebP;
- aukcja aktualizuje cenę, liczbę ofert i czas co 6 sekund;
- limiter żądań działa globalnie w PostgreSQL zamiast w pamięci procesu;
- błędy powiadomień i audytu są zapisywane w `operational_errors`;
- limit wpłaty/oferty pochodzi z kampanii, bez twardego limitu 500 zł w Zod;
- starsze statusy transakcji są migrowane do aktualnych odpowiedników.

## Aktualizacja istniejącego projektu

1. Zrób kopię bazy i katalogu `public/uploads`.
2. Skopiuj własny `.env` do nowej paczki i porównaj go z `.env.example`.
3. Uruchom:

```powershell
npm install
npm run db:migrate:1.4
npm run db:seed
npm run typecheck
npm test
npm run build
npm run dev
```

Alternatywnie `npm run db:push` również doda nowe tabele, ale migracja 1.4 jest jawna i wersjonowana.

Nie uruchamiaj `docker compose down -v`, ponieważ usuwa wolumen bazy danych.

## Monitoring

Opcjonalnie ustaw:

```env
ERROR_MONITOR_WEBHOOK_URL=https://adres-twojego-monitoringu
```

Niezależnie od webhooka błędy efektów ubocznych trafiają do tabeli `operational_errors` i są liczone w `/admin/system`.
