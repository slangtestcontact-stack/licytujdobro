# LicytujDobro - pomagamy Adasiowi

Serwis skupiony na zwiększaniu pomocy dla Adasia Iwanejko. Każdy może wpłacić bezpośrednio, licytować albo udostępnić akcję. Aukcja jest narzędziem prowadzącym do darowizny na dedykowaną Skarbonkę w serwisie Siepomaga. LicytujDobro nie przyjmuje ani nie przechowuje pieniędzy.

## Oficjalne adresy skonfigurowane w wersji 1.3

- główna zbiórka: `https://www.siepomaga.pl/adas-iwanejko`
- Skarbonka LicytujDobro: `https://www.siepomaga.pl/licytacje-dla-adasia-iwanejko-z-licytujdobro`
- Terminal: `https://www.siepomaga.pl/licytacje-dla-adasia-iwanejko-z-licytujdobro/terminal`

W działającej aplikacji ekrany aukcji, płatności, wiadomości i grafiki pobierają adresy z aktywnego rekordu kampanii w bazie. `src/lib/adas-campaign.ts` zawiera wyłącznie bezpieczną konfigurację startową używaną przez bootstrap i formularz administratora.

## Uruchomienie lokalne

1. Skopiuj `.env.example` do `.env`.
2. Ustaw własne sekrety oraz hasło administratora mające co najmniej 12 znaków.
3. Uruchom:

```powershell
npm install
docker compose up -d
npm run db:push
npm run db:seed
npm run dev
```

Aplikacja będzie dostępna pod adresem wskazanym przez Next.js, zwykle `http://localhost:3000`.

## Najważniejsze funkcje wersji 1.3

- uproszczony ekran logowania z dużymi, czytelnymi przyciskami dostawców;
- region całego serwisu ustawiony na „Biłgoraj i okolice”;
- uproszczona główna nawigacja;
- panel gotowości publikacji obejmujący kontakt, OAuth i zgody rodziny;
- pomoc po przegranej aukcji: bezpośrednia wpłata albo kolejna licytacja;
- dobrowolne zwiększenie wpłaty przez zwycięzcę, bez wpływu na prawo do przedmiotu;
- wpisana oferta zachowana przez logowanie i weryfikację;
- szybkie konto z Facebookiem, Apple, Google albo kodem e-mail oraz jednorazowym kodem SMS;
- jednorazowe przypomnienie e-mail dla gościa bez tworzenia konta;
- aukcje specjalne dla autografów, rękodzieła, pamiątek i przedmiotów od partnerów;
- bezpośrednia wpłata jako główna akcja na stronie, bez wymogu konta;
- prawdziwe zdjęcie Adasia i zweryfikowane informacje z oficjalnej zbiórki;
- osobna prezentacja wpłaty, licytacji i udostępniania jako trzech sposobów pomocy;
- komunikacja aukcji i grafik skoncentrowana na końcowej darowiźnie;
- stała pomoc miesięczna i dane do przekazania 1,5% podatku;
- usunięty konflikt manifestu PWA oraz nieużywana grafika AI dziecka;
- szybkie logowanie przez Facebook, Apple, Google albo jednorazowy kod e-mail;
- tradycyjne logowanie hasłem nadal dostępne;
- oglądanie, udostępnianie i bezpośrednia pomoc bez konta;
- telefon potwierdzany jednorazowo przed licytowaniem;
- zachowanie wpisanej oferty po logowaniu;
- regulamin pierwszej oferty z zapisem wersji i czasu akceptacji;
- limit dwóch aktywnych aukcji dla nowego wystawiającego i dziesięciu dla zaufanego;
- sześciostopniowy kreator ogłoszenia, zdjęcia wad i zgoda właściciela rzeczy;
- checklista moderacyjna administratora;
- krótkie adresy aukcji `/a/KOD`;
- generator grafik post/story/Facebook z QR i automatycznymi komunikatami;
- checklista gotowości przed spotkaniem;
- BLIK przez Terminal, inne metody Siepomaga, przelew tradycyjny i bezpieczne odroczenie;
- oddzielne potwierdzenie wpłaty i wydania przedmiotu;
- dziennik zdarzeń oraz centrum „Mam problem”;
- kolejka powiadomień e-mail/SMS z ponawianiem;
- panel testu Terminalu, kopii zapasowych, eksportów i stanu systemu;
- środowisko testowe z wyłączonymi prawdziwymi płatnościami;
- strona transparentności, FAQ, kontakt i formularz pilotażu.

## OAuth

Ustaw `APP_URL` na pełny adres środowiska. Dodaj callbacki u dostawców:

```text
<APP_URL>/api/auth/facebook/callback
<APP_URL>/api/auth/apple/callback
<APP_URL>/api/auth/google/callback
```

W `.env` uzupełnij odpowiednie identyfikatory i sekrety. Aplikacja żąda wyłącznie podstawowego profilu i adresu e-mail. Apple wymaga publicznego adresu HTTPS oraz konfiguracji Services ID i klucza `.p8`.

## E-mail i SMS

Domyślnie `EMAIL_PROVIDER=dev` i `SMS_PROVIDER=dev` wypisują wiadomości w konsoli. Produkcyjnie ustaw ogólny endpoint HTTP oraz klucz API. SMS jest kolejkowany tylko dla zdarzeń krytycznych, takich jak wygrana, spotkanie za godzinę lub pilny problem.

Crony:

```text
POST /api/cron/notifications
POST /api/cron/reminders
POST /api/cron/end-auctions
Authorization: Bearer <CRON_SECRET>
```

## Kopie zapasowe

```powershell
npm run backup
npm run backup:verify
```

Do backupu wymagane jest `pg_dump`, a do testu odtwarzania `pg_restore` i osobna baza wskazana w `RESTORE_TEST_DATABASE_URL`. Szczegóły: `BACKUP_AND_RESTORE.md`.

Do prezentacji rodzinie zacznij od `PREZENTACJA_DLA_RODZICOW_ADASIA.md`. Aktualizacja z 1.2: `UPGRADE_TO_1.3.md`.

## Ważne przed publikacją

- uzyskaj zgodę na wykorzystanie imienia, zdjęcia i historii Adasia;
- przeprowadź pełny test Terminalu i małą rzeczywistą wpłatę;
- ustaw prawdziwą domenę w `APP_URL` i `NEXT_PUBLIC_APP_URL`;
- skonfiguruj e-mail, SMS, crony i codzienny backup;
- przeprowadź zamknięty pilotaż 5–10 aukcji;
- skonsultuj regulamin, prywatność i model działania z prawnikiem.


## Najważniejsze zmiany produkcyjne w wersji 1.4

- Wystawienie przedmiotu wymaga krótkiego opisu, miejscowości i co najmniej jednego zdjęcia.
- Formularz automatycznie zachowuje szkic w przeglądarce i nie czyści pól po błędzie.
- Uploady są weryfikowane na serwerze i publikowane dopiero po ponownym zakodowaniu obrazu.
- Cena aukcji i czas zakończenia aktualizują się automatycznie co kilka sekund.
- Limity ofert, kodów logowania i uploadów są wspólne dla wszystkich instancji dzięki PostgreSQL.
- Błędy wysyłki powiadomień i innych efektów ubocznych trafiają do panelu stanu systemu.

Przy aktualizacji z 1.3 przeczytaj `UPGRADE_TO_1.4.md`.

## Weryfikacja kontaktu dopiero przed pierwszą ofertą

Po zastosowaniu patcha konto utworzone przez Facebooka może przeglądać serwis od razu, również wtedy, gdy Meta nie zwróci adresu e-mail. Weryfikacja kontaktu uruchamia się dopiero przed pierwszą wiążącą ofertą albo wystawieniem przedmiotu.

Tryb ustawiasz w `.env`:

```env
# both | either | email | phone
CONTACT_VERIFICATION_MODE=both
```

- `both` - wymagany e-mail i telefon;
- `either` - użytkownik wybiera e-mail albo telefon;
- `email` - wystarczy e-mail;
- `phone` - wystarczy telefon.

Szczegółowa konfiguracja wysyłki znajduje się w `INSTRUKCJA_WERYFIKACJI_KONTAKTU.md`.
