# Patch: Facebook bez e-maila + weryfikacja dopiero przed licytacją

## Co zmienia patch

1. Facebook może utworzyć konto nawet wtedy, gdy Graph API zwróci tylko `id` i imię.
2. Użytkownik po logowaniu trafia na stronę, którą chciał otworzyć, i może normalnie przeglądać serwis.
3. Dopiero pierwsza próba licytacji albo wystawienia przedmiotu prowadzi do `/weryfikacja`.
4. Na ekranie weryfikacji użytkownik podaje prawdziwy e-mail i/lub telefon, dostaje sześciocyfrowy kod i wraca do rozpoczętej oferty.
5. Techniczne wartości `@users.invalid` i `pending-...` nie są używane do wysyłki powiadomień.
6. Patch nie wymaga migracji bazy danych.

## Wybór wymagania

Dodaj do `.env`:

```env
# both = e-mail i telefon
# either = e-mail albo telefon, wybór użytkownika
# email = tylko e-mail
# phone = tylko telefon
CONTACT_VERIFICATION_MODE=both
```

Dla maksymalnie prostego startu ustaw:

```env
CONTACT_VERIFICATION_MODE=either
```

Dla większego zabezpieczenia wiążących ofert pozostaw:

```env
CONTACT_VERIFICATION_MODE=both
```

## Test lokalny - całkowicie bezpłatny

```env
EMAIL_PROVIDER=dev
SMS_PROVIDER=dev
```

W tym trybie nic nie jest wysyłane do Internetu. Kody są:

- wypisywane w terminalu `npm run dev`;
- pokazywane na stronie `/weryfikacja`.

Po zmianie `.env` uruchom aplikację ponownie:

```bash
npm run dev
```

## Prawdziwy e-mail przez Resend

Kod obsługuje Resend bez dodatkowego pakietu npm.

1. Załóż konto w Resend.
2. Dodaj domenę, np. `licytujdobro.pl`, i ustaw rekordy DNS pokazane w panelu Resend.
3. Utwórz klucz API.
4. Ustaw:

```env
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_TUTAJ_KLUCZ
EMAIL_FROM=LicytujDobro <kody@licytujdobro.pl>
```

`EMAIL_API_URL` może pozostać puste - patch użyje `https://api.resend.com/emails`.

Na bezpłatnym planie Resend można obecnie wysyłać do 3000 wiadomości miesięcznie, z limitem 100 dziennie. Przed publikacją sprawdź aktualny cennik dostawcy.

## Prawdziwy SMS przez Twilio

Patch ma bezpośrednią obsługę Twilio REST API.

1. Załóż konto Twilio.
2. Skopiuj `Account SID` i `Auth Token`.
3. W trybie próbnym dodaj swój numer jako zweryfikowanego odbiorcę.
4. Ustaw numer lub identyfikator nadawcy dopuszczony na Twoim koncie.
5. W `.env` wpisz:

```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM=+1xxxxxxxxxx
```

Po przejściu na konto produkcyjne jako `TWILIO_FROM` możesz użyć właściwego nadawcy dostępnego dla Polski. Nie wpisuj przykładowego numeru - użyj wartości z panelu Twilio.

Twilio oferuje ograniczony okres próbny do testów, lecz produkcyjne SMS-y nie są bezpłatne. Wiadomości do Polski są rozliczane za segment, a stawki mogą się zmieniać.

## Własny operator przez HTTP

Można podłączyć dowolny własny endpoint lub funkcję serverless.

E-mail:

```env
EMAIL_PROVIDER=http
EMAIL_API_URL=https://twoj-endpoint.example/api/email
EMAIL_API_KEY=sekret
EMAIL_FROM=LicytujDobro <kody@licytujdobro.pl>
```

Aplikacja wysyła JSON:

```json
{
  "from": "LicytujDobro <kody@licytujdobro.pl>",
  "to": ["uzytkownik@example.pl"],
  "subject": "Kod weryfikacyjny LicytujDobro",
  "text": "Twój kod weryfikacyjny: 123456"
}
```

SMS:

```env
SMS_PROVIDER=http
SMS_API_URL=https://twoj-endpoint.example/api/sms
SMS_API_KEY=sekret
SMS_FROM=LicytujDb
```

Aplikacja wysyła JSON:

```json
{
  "to": "+48600700800",
  "message": "LicytujDobro: Twój kod weryfikacyjny to 123456",
  "from": "LicytujDb"
}
```

Oba endpointy otrzymują nagłówek:

```text
Authorization: Bearer <klucz API>
```

## Test działania

1. Zostaw `EMAIL_PROVIDER=dev` i `SMS_PROVIDER=dev`.
2. Usuń stare testowe konto z bazy albo użyj innego konta Facebook.
3. Zaloguj się przez Facebooka.
4. Sprawdź, że trafiasz do `/dashboard` i możesz przeglądać aukcje.
5. Otwórz aukcję i kliknij licytowanie.
6. Przejdź do weryfikacji kontaktu.
7. Podaj dane i użyj kodów pokazanych na stronie.
8. Po potwierdzeniu ostatniego wymaganego kanału aplikacja powinna wrócić do aukcji z zachowaną kwotą i otworzyć potwierdzenie oferty.

## Polecenia kontrolne

```bash
npm run typecheck
npm test
npm run build
```

Jeżeli projekt był uruchomiony podczas podmiany plików, zatrzymaj proces i uruchom `npm run dev` ponownie.

## Bezpieczeństwo

- Nie publikuj `FACEBOOK_CLIENT_SECRET`, `EMAIL_API_KEY` ani `TWILIO_AUTH_TOKEN`.
- Produkcyjne sekrety trzymaj wyłącznie w zmiennych środowiskowych hostingu.
- Kody są ważne przez 15 minut.
- Wysyłka kodów i próby potwierdzenia mają limity częstotliwości.
- Nie oznaczaj technicznych adresów `@users.invalid` ani numerów `pending-...` jako potwierdzonych.
