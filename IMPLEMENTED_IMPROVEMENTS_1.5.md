# Wdrożone poprawki 1.5

## Wydajność

- strona główna pobiera aukcje jednym zapytaniem zamiast zapytania o zdjęcie dla każdej karty;
- katalog aukcji pobiera główne zdjęcie w tym samym zapytaniu;
- liczebność drużyn jest agregowana jednym zapytaniem;
- publiczne dane strony głównej są cache'owane przez 30 sekund i oznaczone tagami;
- cache jest unieważniany po ofertach, moderacji aukcji, zmianach kampanii, drużyn i wydarzeń;
- dodano indeksy zdjęć aukcji i sesji;
- lokalne i chmurowe zdjęcia korzystają z optymalizacji `next/image`;
- wyłącznie zdjęcie hero jest oznaczone jako zasób LCP.

## Konto

- Facebook, Google, Apple i logowanie kodem e-mail nie wymagają dodatkowego kodu weryfikacyjnego; przy pierwszym użyciu wymagają tylko akceptacji zasad;
- konto z hasłem wymaga jednorazowego kodu e-mail;
- telefon jest opcjonalny;
- maksymalnie pięć aktywnych sesji na konto;
- użytkownik może wylogować wszystkie urządzenia;
- reset hasła unieważnia wszystkie sesje.

## Aukcje i strona główna

- uproszczony pierwszy ekran i usunięte nakładki ze zdjęcia;
- karta aukcji pokazuje cenę, liczbę ofert, stan, dokładny koniec, licznik i minimalną następną ofertę;
- mobilny panel licytacji jest przyklejony do dolnej krawędzi;
- przed wysłaniem oferty wyświetla się potwierdzenie wiążącej kwoty;
- zerowe statystyki zastąpiono komunikatem o starcie aukcji;
- ujednolicono informację o wpłacie na oficjalną zbiórkę w Siepomaga.pl.

## Zdjęcia

- tryb lokalny pozostał do developmentu;
- produkcja może używać dwóch bucketów Cloudflare R2: publicznego i prywatnego;
- zdjęcia są walidowane, obracane, zmniejszane, ponownie kodowane do WebP i pozbawiane EXIF;
- prywatne zdjęcia są odczytywane tylko przez właściciela lub administratora;
- klucze R2 pozostają wyłącznie po stronie serwera.

## Bezpieczeństwo i monitoring

- HSTS na produkcji;
- CSP w trybie Report-Only;
- kontrola Origin/Referer dla mutujących endpointów przeglądarkowych;
- obecne mechanizmy Next.js chronią również Server Actions;
- limity aktywnych sesji i wylogowanie wszystkich urządzeń;
- OAuth, uploady, crony i słabe Web Vitals zapisują błędy operacyjne;
- pomiar wolnych zapytań SQL z opcjonalnym webhookiem;
- readiness zgłasza brak lub przeterminowany backup.

## Dostępność i SEO

- link „Przejdź do treści”;
- `aria-current` w menu;
- alerty i statusy z rolami ARIA;
- pola formularzy otrzymują `aria-invalid` i `aria-describedby`;
- ograniczenie animacji przy `prefers-reduced-motion`;
- poprawiona mapa strony;
- dynamiczne metadata, canonical i Open Graph aukcji;
- metadata i JSON-LD wydarzeń;
- JSON-LD organizacji;
- raportowanie LCP, INP, CLS, FCP i TTFB.
