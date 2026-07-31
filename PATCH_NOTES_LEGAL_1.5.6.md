# Patch 1.5.6 — stopka i dokumenty prawne

## Zmiany

- uproszczona stopka bez powtarzających się sekcji;
- usunięty publiczny link i route „Pilotaż”;
- pełniejsze dane operatora i punkty kontaktowe;
- nowy regulamin świadczenia usług drogą elektroniczną;
- zaktualizowane zasady licytacji i wersja zasad `2026-07-v2`;
- rozbudowana polityka prywatności i polityka cookies;
- publiczny formularz zgłoszeń potencjalnie nielegalnych treści;
- publiczny formularz odwołań od moderacji;
- transparentność kolejności aukcji i braku płatnego pozycjonowania;
- poprawione komunikaty o zewnętrznej zbiórce i braku afiliacji;
- poprawiona treść strony bezpieczeństwa;
- `api/readiness` blokuje produkcję przy braku danych prawnych lub akceptacji publikacji;
- dodane trasy prawne do sitemap.

## Bez migracji bazy

Zgłoszenia i odwołania są zapisywane w istniejącej tabeli `contact_messages`, dlatego patch nie wymaga migracji bazy.
