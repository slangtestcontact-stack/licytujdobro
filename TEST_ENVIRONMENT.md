# Środowisko testowe

Test i produkcja muszą mieć osobne bazy, sekrety i domeny.

Test:

```env
APP_ENV=test
APP_URL=https://test.licytujdobro.pl
NEXT_PUBLIC_APP_URL=https://test.licytujdobro.pl
DATABASE_URL=postgresql://.../licytujdobro_test
```

W `APP_ENV=test` aplikacja pokazuje pasek środowiska testowego i wyłącza prawdziwe ścieżki płatności na ekranie transakcji. Nie kopiuj produkcyjnych danych osobowych do bazy testowej.

Produkcja:

```env
APP_ENV=production
APP_URL=https://licytujdobro.pl
NEXT_PUBLIC_APP_URL=https://licytujdobro.pl
```
