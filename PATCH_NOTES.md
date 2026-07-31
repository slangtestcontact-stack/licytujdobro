# Patch v0.4.0 - Siepomaga Terminal w Telefonie

Ten patch aktualizuje wersję `licytujdobro-mvp-redesign` do modelu wpłat przez Siepomaga.

## Najważniejsze zmiany

- konfiguracja oficjalnej zbiórki, Skarbonki i adresu `/terminal` w panelu administratora;
- przypisanie każdej aukcji oraz transakcji do kampanii Siepomaga;
- limit zwycięskiej oferty zgodny z konfiguracją kampanii, maksymalnie 500 zł;
- osobny proces Terminalu w Telefonie i płatności BLIK;
- brak pola, zapisu lub przesyłania kodu BLIK przez LicytujDobro;
- niezależne potwierdzenie wpłaty przez kupującego i wystawiającego;
- odblokowanie kodu przekazania dopiero po obu potwierdzeniach;
- obsługa nieudanej płatności i przekazania sprawy do wyjaśnienia;
- snapshot danych zbiórki w transakcji;
- nowe statusy, testy domenowe, dokumentacja i treści bezpieczeństwa.

## Aktualizacja istniejącej instalacji

Po podmianie plików wykonaj:

```powershell
npm install
npm run db:push
npm run db:update-demo-assets
npm run dev
```

W panelu `/admin` przejdź do sekcji **Siepomaga** i wprowadź rzeczywiste adresy:

1. oficjalnej zbiórki;
2. dedykowanej Skarbonki;
3. Terminalu w Telefonie, kończącego się `/terminal`.

## Ważne ograniczenie

Wersja nie odpytuje prywatnego API Siepomaga i nie wykonuje scrapingu. Wpłata jest potwierdzana niezależnie przez obie strony spotkania. Automatyczna weryfikacja wymaga uzgodnionej integracji z Siepomaga.
