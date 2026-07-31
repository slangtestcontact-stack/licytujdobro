# Integracja Siepomaga

Aktywna konfiguracja:

```text
Zbiórka główna:
https://www.siepomaga.pl/adas-iwanejko

Skarbonka LicytujDobro:
https://www.siepomaga.pl/licytacje-dla-adasia-iwanejko-z-licytujdobro

Terminal:
https://www.siepomaga.pl/licytacje-dla-adasia-iwanejko-z-licytujdobro/terminal
```

Adresy są zapisywane w jednym aktywnym rekordzie `campaigns`. Nowe transakcje otrzymują snapshot adresów, aby historia była audytowalna. Bootstrap aktualizuje snapshoty tylko transakcji, które nie zostały zakończone.

LicytujDobro nie renderuje własnego formularza BLIK, nie zapisuje kodu BLIK i nie przyjmuje płatności. Użytkownik przechodzi na prawdziwą domenę Siepomaga.

Przed wydaniem przedmiotu:

1. kupujący ogląda rzecz;
2. wybiera metodę wpłaty;
3. kupujący i wystawiający osobno potwierdzają wynik;
4. dopiero po potwierdzeniu wpłaty uruchamiany jest kod przekazania;
5. brak internetu lub problem techniczny odracza płatność i przedmiot pozostaje u wystawiającego.
