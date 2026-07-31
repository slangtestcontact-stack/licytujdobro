# Aktualizacja do wersji 1.1

Wersja 1.1 zmienia hierarchię komunikacji: najważniejszą akcją jest bezpośrednia wpłata dla Adasia, a aukcja pozostaje dodatkowym narzędziem zwiększania pomocy.

## Aktualizacja

1. Skopiuj ze starego projektu `.env` oraz własne pliki z `public/uploads`.
2. Uruchom:

```powershell
npm install
npm run db:push
npm run db:seed
npm run dev
```

Wersja 1.1 nie dodaje nowych tabel, ale `db:seed` jest zalecany, ponieważ aktualizuje opis kampanii i ustawia zatwierdzone zdjęcie Adasia z `public/images/adas-iwanejko.png`.

## Najważniejsze zmiany

- główny przycisk „Wpłać teraz dla Adasia” w nagłówku, hero i na stronach aukcji;
- wpłata bez konta jako pierwsza ścieżka pomocy;
- aukcje opisane jako narzędzie prowadzące do darowizny;
- strona historii oparta na danych z oficjalnej zbiórki;
- wyłącznie prawdziwe zdjęcie Adasia w bibliotece kampanii;
- usunięta nieużywana grafika AI z wizerunkiem dziecka;
- poprawiony manifest PWA - usunięto konflikt `public/manifest.webmanifest` z `src/app/manifest.ts`;
- generator grafik i newsletter używają komunikacji skoncentrowanej na wpłacie.

## Przed publikacją

Potwierdź zgodę rodzica lub opiekuna na wykorzystanie zdjęcia i historii Adasia w serwisie LicytujDobro. Aktualne kwoty i informacje zmienne powinny być sprawdzane na oficjalnej stronie Siepomaga, a nie wpisywane na stałe w kodzie.
