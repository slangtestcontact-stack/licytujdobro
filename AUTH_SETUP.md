# Konfiguracja szybkiego logowania

Użytkownik może oglądać aukcje, udostępniać je i przejść do Skarbonki bez konta. Logowanie jest wymagane dopiero przy wiążącej ofercie.

## Facebook

Utwórz aplikację z Facebook Login i dodaj callback:

```text
https://twoja-domena.pl/api/auth/facebook/callback
```

Ustaw `FACEBOOK_CLIENT_ID` i `FACEBOOK_CLIENT_SECRET`. Aplikacja prosi wyłącznie o `email` i `public_profile`.

## Apple

W Apple Developer skonfiguruj Sign in with Apple dla witryny: Services ID, publiczną domenę HTTPS, return URL i klucz prywatny `.p8`.

Callback:

```text
https://twoja-domena.pl/api/auth/apple/callback
```

Zmienne:

```text
APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

Apple nie obsługuje callbacku na `localhost` i wymaga publicznego adresu HTTPS. Lokalnie korzystaj z Google, Facebooka, kodu e-mail lub hasła.

## Google

Utwórz aplikację OAuth typu Web i dodaj callback:

```text
https://twoja-domena.pl/api/auth/google/callback
```

Ustaw `GOOGLE_CLIENT_ID` i `GOOGLE_CLIENT_SECRET`.

## Kod e-mail

Ustaw produkcyjnego dostawcę e-mail. Kod ma sześć cyfr, działa 10 minut i jest przechowywany jako hash. Po pięciu błędnych próbach trzeba wygenerować nowy.

## Telefon

Każdy użytkownik potwierdza telefon jednorazowo przed pierwszą ofertą. Numer nie jest publiczny. W trybie developerskim kod pojawia się w konsoli; produkcyjnie ustaw dostawcę SMS.

## Kontrola przed publikacją

Po skonfigurowaniu usług otwórz `/admin/system`. Panel osobno pokazuje stan Facebooka, Apple, Google, e-maila, SMS-ów, kontaktu publicznego i zgód rodziny.
