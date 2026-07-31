# Raport walidacji - LicytujDobro 1.4

Data kontroli: 29 lipca 2026

## Zakończone powodzeniem

- `npm run typecheck` - bez błędów TypeScript.
- `npm run lint` - bez błędów i ostrzeżeń ESLint.
- 21 skompilowanych kontroli domenowych - wszystkie zaliczone:
  - uwierzytelnienie i bezpieczny `returnTo`;
  - aktywacja konta;
  - dynamiczny limit wpłaty;
  - odroczenie i alternatywna płatność;
  - obustronne potwierdzenie;
  - zakaz self-bidu;
  - maszyna stanów i zakaz pominięcia wpłaty;
  - anti-snipe;
  - hashowanie i weryfikacja kodu przekazania.
- kontrola lokalnych importów przez TypeScript;
- kontrola jednego manifestu PWA;
- kontrola obecności prawdziwego pliku `public/images/adas-iwanejko.jpg`;
- kontrola braku danych OAuth w `.env.example`.

## Ograniczenia środowiska pakowania

Przesłany projekt zawierał `node_modules` z systemu Windows. Środowisko pakowania działa na Linuxie, dlatego natywne pliki SWC, esbuild i Rolldown nie mogły zostać uruchomione. Próba pobrania linuksowych pakietów z wewnętrznego rejestru zakończyła się błędem 404.

Z tego powodu pełne `npm test` i `npm run build` należy wykonać lokalnie po świeżym `npm install`. Kod przeszedł niezależnie pełny typecheck i lint.

## Polecenia końcowe na komputerze docelowym

```powershell
npm install
npm run db:migrate:1.4
npm run db:seed
npm run typecheck
npm test
npm run build
```
