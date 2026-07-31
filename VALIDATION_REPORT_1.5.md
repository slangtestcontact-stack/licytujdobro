# Raport walidacji wersji 1.5

Data: 2026-07-29

## Wykonane kontrole

- przeanalizowano składnię 136 plików TypeScript/TSX przy użyciu kompilatora TypeScript - bez błędów składni;
- sprawdzono lokalny graf importów 137 plików - wszystkie importy `@/…` i względne prowadzą do istniejących plików;
- sprawdzono składnię plików `.mjs` poleceniem `node --check`;
- sprawdzono poprawność `package.json` i `package-lock.json`;
- potwierdzono zgodność implementacji podpisu AWS Signature V4 używanego przez R2 z referencyjnym podpisem botocore dla zapytania testowego;
- sprawdzono brak `unoptimized` w komponentach obrazów;
- sprawdzono poprawkę trasy `/jak-to-dziala` i brak starej trasy `/jak-pomagam` w kodzie aplikacji;
- sprawdzono, że nie pozostało publiczne sformułowanie „prowadzona przez Fundację Siepomaga”.

## Ograniczenia walidacji w środowisku generowania paczki

Pełne polecenia `npm ci`, `npm run typecheck`, `npm test` i `npm run build` nie zostały wykonane, ponieważ środowisko nie miało dostępu do publicznego rejestru npm, a lokalnie nie było katalogu `node_modules`. Kontrola bez zainstalowanych zależności nie zastępuje pełnego builda Next.js.

Po rozpakowaniu uruchom obowiązkowo:

```bash
npm ci
npm run db:migrate:1.5
npm run typecheck
npm test
npm run build
```

## Testy ręczne wymagane przed produkcją

1. Logowanie Facebook, Google, Apple i kodem e-mail.
2. Rejestracja e-mail + hasło oraz jednorazowy kod e-mail.
3. Pierwsza akceptacja regulaminu dla szybkiego konta.
4. Dodanie publicznego i prywatnego zdjęcia w trybie lokalnym i R2.
5. Licytacja, potwierdzenie wiążącej kwoty i mobilny pasek licytacji.
6. Cache oraz unieważnianie po nowej ofercie i moderacji aukcji.
7. `/api/readiness`, backup, crony, e-mail i webhook monitoringu.
8. Nawigacja wyłącznie klawiaturą oraz powiększenie tekstu do 200%.
