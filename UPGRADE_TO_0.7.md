# Aktualizacja 0.6 → 0.7

Wersja 0.7 porządkuje wygląd publicznych ekranów bez zmiany podstawowego procesu aukcji.

## Najważniejsze zmiany

- nowy nagłówek z aktywną pozycją nawigacji i jednym menu konta;
- „Zbiórka” zmieniona na „Historia Adasia”;
- nowy układ strony Adasia: hero, statystyki, aktywne aukcje, proces, historia i bezpieczeństwo;
- uproszczona prawa kolumna strony aukcji;
- czytelniejsza historia ofert i krótsze daty;
- jednolity publiczny region „Biłgoraj i okolice”;
- ukryty wskaźnik developerski Next.js;
- bootstrap usuwa rozpoznawalne etykiety starego zestawu demonstracyjnego: Zosia, DEMO i warszawskie lokalizacje.

## Aktualizacja

```powershell
npm install
npm run db:push
npm run db:seed
npm run dev
```

`db:seed` nie usuwa użytkowników ani aukcji. Aktualizuje konfigurację Adasia i czyści wyłącznie rozpoznawalne etykiety starszych danych demonstracyjnych.
