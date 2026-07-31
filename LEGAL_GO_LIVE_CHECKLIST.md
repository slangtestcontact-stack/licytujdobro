# LicytujDobro — prawna checklista przed publikacją

Patch porządkuje stopkę, usuwa publiczny pilotaż, aktualizuje dokumenty i dodaje mechanizm zgłoszeń/odwołań. Nie zastępuje indywidualnej opinii prawnika, ponieważ ostateczna ocena zależy od operatora, jego formy prawnej, umów z rodziną i faktycznego sposobu działania.

## 1. Uzupełnij dane operatora w `.env`

Wymagane:

```env
ORGANIZER_NAME=LicytujDobro
ORGANIZER_LEGAL_NAME=pełna nazwa albo imię i nazwisko operatora
ORGANIZER_ADDRESS=pełny adres operatora
ORGANIZER_EMAIL=kontakt@twojadomena.pl
ORGANIZER_PHONE=
ORGANIZER_NIP=
ORGANIZER_REGISTRY=
PRIVACY_EMAIL=prywatnosc@twojadomena.pl
DSA_CONTACT_EMAIL=zgloszenia@twojadomena.pl
LEGAL_VERSION=1.0
LEGAL_EFFECTIVE_DATE=2026-07-30
LEGAL_LAST_UPDATED_DATE=2026-07-30
LEGAL_BIDDING_TERMS_VERSION=2026-07-v2
LEGAL_PUBLISH_READY=false
```

Dla osoby fizycznej nieprowadzącej działalności wpisz prawdziwe imię, nazwisko i adres. Dla fundacji, stowarzyszenia lub przedsiębiorcy wpisz pełną nazwę, siedzibę, adres oraz właściwe dane rejestrowe.

## 2. Zweryfikuj model działalności

Dokumenty zakładają, że:

- platforma jest bezpłatna i nie pobiera prowizji;
- wpłaty odbywają się wyłącznie poza platformą, na oficjalną zbiórkę;
- operator nie jest sprzedawcą, kupującym ani stroną płatności;
- wystawiający są pełnoletnimi osobami prywatnymi, a nie przedsiębiorcami;
- nie ma płatnego pozycjonowania ofert;
- ostateczna moderacja może zostać sprawdzona przez człowieka;
- nie ma marketingowych cookies, reklam behawioralnych ani newslettera bez odrębnej zgody.

Jeżeli którykolwiek punkt jest nieprawdziwy, dokumenty i funkcje trzeba zmienić przed publikacją.

## 3. Sprawdź zgody i komunikację o Adasiu

Przed publikacją ustaw `true` dopiero po uzyskaniu i zapisaniu odpowiednich zgód:

```env
FAMILY_NAME_CONSENT_CONFIRMED=true
FAMILY_PHOTO_CONSENT_CONFIRMED=true
FAMILY_STORY_CONSENT_CONFIRMED=true
```

Nie używaj logo, znaków ani sformułowań sugerujących partnerstwo z Siepomaga.pl, fundacją lub rodziną bez podstawy i udokumentowanego uzgodnienia.

## 4. Dostawcy i umowy

- zawrzyj wymagane umowy powierzenia danych z hostingiem, bazą danych, Resend i innymi procesorami;
- sprawdź regiony przechowywania danych oraz transfery poza EOG;
- skonfiguruj prywatny bucket R2 bez publicznego dostępu;
- ogranicz dostęp administratorów i prowadź przegląd uprawnień;
- ustal harmonogram retencji i wykonuj okresowe usuwanie danych.

## 5. Obsługa zgłoszeń i odwołań

- monitoruj kolejkę `contact_messages` oraz adres `DSA_CONTACT_EMAIL`;
- potwierdzaj zgłoszenia i przekazuj końcową decyzję;
- przy ograniczeniu treści lub konta podawaj konkretny powód, zakres i możliwość odwołania;
- zapewnij możliwość odwołania przez co najmniej 6 miesięcy od decyzji;
- zabezpieczaj dowody i współpracuj z właściwymi organami, gdy wymaga tego prawo.

## 6. Test gotowości

Po uzupełnieniu konfiguracji:

```powershell
npm run typecheck
npm test
npm run build
npm run dev
```

Otwórz:

```text
http://localhost:3000/api/readiness
```

Dopiero po przeglądzie dokumentów i faktycznego modelu ustaw:

```env
LEGAL_PUBLISH_READY=true
```

W produkcji brak wymaganych danych albo brak tej flagi powoduje `not_ready`.

## 7. Końcowy przegląd prawnika

Przed publicznym startem przekaż prawnikowi:

- regulamin, zasady licytacji, politykę prywatności i cookies;
- opis przepływu wpłaty i przekazania przedmiotu;
- dane operatora i jego formę prawną;
- umowy z rodziną, dostawcami i ewentualnymi partnerami;
- listę dostawców danych i politykę retencji;
- ekrany rejestracji, potwierdzenia oferty, moderacji i zgłoszeń.
