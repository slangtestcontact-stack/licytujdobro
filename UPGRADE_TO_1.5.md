# Aktualizacja LicytujDobro do 1.5

Wersja 1.5 łączy poprawki wydajności, logowania, aukcji, dostępności, SEO, bezpieczeństwa, monitoringu i przechowywania zdjęć w Cloudflare R2.

## 1. Zrób kopię

Przed nadpisaniem projektu skopiuj katalog aplikacji oraz wykonaj kopię PostgreSQL:

```bash
npm run backup
```

Nie kontynuuj na produkcji bez sprawdzonej kopii bazy.

## 2. Nadpisz pliki

Najbezpieczniej rozpakuj pełne archiwum 1.5 do nowego katalogu, a następnie przenieś własny `.env.local`. Nie kopiuj starego `node_modules` ani `.next`.

## 3. Ustaw środowisko

Minimalne ustawienia lokalne:

```env
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
CONTACT_VERIFICATION_MODE=email
OBJECT_STORAGE_DRIVER=local
EMAIL_PROVIDER=dev
```

Na produkcji ustaw prawdziwego dostawcę e-mail oraz `OBJECT_STORAGE_DRIVER=r2`. Szczegóły znajdują się w `CLOUDFLARE_R2_SETUP.md`.

Konta Facebook, Google, Apple oraz logowanie kodem e-mail nie wymagają dodatkowego kodu weryfikacyjnego. Przy pierwszym użyciu użytkownik jedynie akceptuje regulamin i politykę prywatności. Klasyczne konto z hasłem wymaga jednorazowego kodu e-mail. Telefon jest opcjonalny.

## 4. Zainstaluj zależności i wykonaj migrację

```bash
npm ci
npm run db:migrate:1.5
```

Migracja 1.5 dodaje indeksy zdjęć i sesji. Używa `create index if not exists`, więc można uruchomić ją ponownie.

## 5. Sprawdź projekt

```bash
npm run typecheck
npm test
npm run build
```

Uruchom aplikację:

```bash
npm run dev
```

Sprawdź:

```text
http://localhost:3000/api/health
http://localhost:3000/api/readiness
```

## 6. Test funkcjonalny

1. Otwórz stronę główną i katalog aukcji.
2. Zaloguj się przez Facebook, Google lub Apple - nie powinien pojawić się ekran dodatkowego kodu; przy pierwszym logowaniu powinien pojawić się tylko formularz akceptacji zasad.
3. Utwórz konto e-mail + hasło - powinien być wymagany tylko kod e-mail.
4. Dodaj aukcję i zdjęcie.
5. Złóż ofertę i potwierdź wiążącą kwotę.
6. Sprawdź widok mobilny oraz przyklejony przycisk licytacji.
7. Sprawdź `/sitemap.xml`, metadane aukcji i wydarzenia.
8. Sprawdź panel `/admin/system`, błędy operacyjne i stan backupu.

## 7. Produkcja

Przed przełączeniem ruchu:

- ustaw `APP_URL=https://licytujdobro.pl`;
- skonfiguruj R2 i prawdziwy e-mail;
- ustaw prawdziwe `ORGANIZER_NAME` i `ORGANIZER_EMAIL`;
- ustaw `CAMPAIGN_LINK_VERIFIED_AT`;
- skonfiguruj `ERROR_MONITOR_WEBHOOK_URL`;
- wykonuj backup automatycznie co najmniej raz dziennie;
- sprawdź CSP w trybie Report-Only przed jego egzekwowaniem;
- potwierdź i udokumentuj zgody na imię, historię i zdjęcia Adasia.
