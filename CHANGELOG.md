# Changelog

## 1.4.0

- Uproszczono wystawianie do czterech kroków i jednego wymaganego zdjęcia.
- Pełny opis, wady i kompletność są opcjonalne; usunięto publiczne pole dzielnicy oraz zdjęcie weryfikacyjne.
- Dodano automatyczne zachowywanie szkicu formularza i ochronę danych po błędzie walidacji.
- Dodano serwerową kontrolę sygnatury obrazów, limit pikseli oraz ponowne kodowanie do WebP.
- Dodano automatyczne odświeżanie ceny, liczby ofert i czasu aukcji.
- Zastąpiono limiter w pamięci trwałym, atomowym limiterem w PostgreSQL.
- Błędy efektów ubocznych są rejestrowane w bazie i opcjonalnym webhooku monitoringu.
- Wydzielono wspólne reguły autoryzacji ogłoszeń i polityki krytycznych operacji transakcji.
- Ujednolicono dynamiczny limit wpłaty/oferty z aktywną kampanią.
- Dodano migrację 1.4, testy polityk uwierzytelniania i transakcji, metadane SEO, sitemap oraz robots.
- Usunięto prawdziwe dane OAuth z pliku przykładowego środowiska.

## 1.3.0

- Przebudowano ekran logowania na duże, czytelne przyciski Facebook, Apple, Google i kod e-mail.
- Dodano kompletną serwerową ścieżkę Sign in with Apple z weryfikacją stanu, nonce i podpisu tokenu.
- Ujednolicono region całego serwisu do „Biłgoraj i okolice”.
- Uproszczono główną nawigację i pozostawiono najważniejsze działania.
- Link do Skarbonki w nagłówku, stopce i nawigacji mobilnej pochodzi z aktywnej konfiguracji kampanii.
- Rozbudowano panel gotowości o Apple OAuth, publiczny kontakt i status zgód rodziny.
- Dodano publiczne oznaczenie zgody rodziny, wyświetlane dopiero po ustawieniu wszystkich trzech flag.
- Dodano instrukcję aktualizacji i konfiguracji Apple OAuth.

## 1.2.0

- Dodano ekran pomocy po przegranej aukcji oraz wiadomości do przegranych licytujących.
- Dodano dobrowolne zwiększenie wpłaty przez zwycięzcę bez zmiany obowiązkowej kwoty.
- Zachowano wpisaną ofertę przez logowanie, dokończenie konta i weryfikację telefonu.
- Uproszczono szybkie konto do logowania, numeru telefonu i kodu SMS.
- Rozszerzono tryb gościa o jednorazowe przypomnienie e-mail przed końcem aukcji.
- Dodano aukcje specjalne, oznaczenia publiczne i sterowanie w panelu moderatora.
- Statystyki potwierdzonych wpłat uwzględniają dobrowolnie zwiększoną kwotę.
- Dodano materiał do prezentacji projektu rodzicom Adasia oraz checklistę zgód.

## 1.1.0

- Przebudowano stronę na model „wpłata przede wszystkim, aukcja jako narzędzie pomocy”.
- Dodano główne CTA bezpośredniej wpłaty w nagłówku, hero, historii i aukcjach.
- Rozbudowano stronę historii o zweryfikowane fakty, Stałą Pomoc i dane 1,5% podatku.
- Ustawiono prawdziwe zdjęcie Adasia jako domyślne i usunięto nieużywaną grafikę AI dziecka.
- Zmieniono treści kart, procesu, generatora grafik i newslettera na komunikację skoncentrowaną na darowiźnie.
- Usunięto konflikt manifestu PWA.

## 1.0.0

- Podłączono dedykowaną Skarbonkę LicytujDobro i Terminal dla Adasia.
- Dodano szybkie logowanie Google, Facebook i kodem e-mail oraz zachowanie rozpoczętej oferty.
- Dodano akceptację zasad pierwszej licytacji i jednorazową weryfikację telefonu.
- Dodano limit aktywnych aukcji, zgodę właściciela rzeczy i checklistę moderacji.
- Dodano gotowość przed spotkaniem, alternatywne wpłaty, odroczenie awaryjne i osobne potwierdzenia.
- Dodano krótkie adresy aukcji i rozbudowany generator grafik z QR.
- Dodano kolejkę e-mail/SMS, przypomnienia, test Terminalu, backup i eksporty.
- Dodano strony transparentności, drogi pieniędzy, FAQ, kontaktu i pilotażu.
- Dodano rozdzielenie środowiska testowego od produkcji.

## 1.5.0 - 2026-07-29

- przyspieszenie strony głównej i katalogu aukcji przez usunięcie zapytań N+1 i krótkotrwały cache danych publicznych,
- ujednolicenie logowania: OAuth bez dodatkowego kodu, konto z hasłem z jednorazową weryfikacją e-mail,
- uproszczony pierwszy ekran, precyzyjne komunikaty o wpłatach i ukrywanie pustych statystyk,
- rozszerzone karty aukcji, mobilny pasek licytacji oraz potwierdzenie wiążącej oferty,
- poprawki WCAG, SEO, sitemap, Open Graph i danych strukturalnych,
- opcjonalne przechowywanie publicznych i prywatnych zdjęć w Cloudflare R2,
- nagłówki bezpieczeństwa, limity sesji, wylogowanie ze wszystkich urządzeń i unieważnianie sesji po zmianie hasła,
- monitoring Web Vitals, wolnych zapytań SQL, błędów OAuth, cronów i świeżości backupu,
- indeksy bazy danych oraz migracja `npm run db:migrate:1.5`.
