# LicytujDobro 1.7.0 — stała wpłata albo licytacja

Patch został przygotowany bezpośrednio na podstawie źródeł z `src(1).zip` i zachowuje obecny wygląd strony: paletę brand, szerokość `page-shell`, typografię, karty, przyciski oraz istniejący nagłówek.

## Co zmienia

- usuwa nieczytelny model „zainteresowanie, a potem być może licytacja”;
- dodaje dwa jednoznaczne tryby wystawienia:
  - **Za stałą wpłatę** — pierwsza prawidłowa rezerwacja zdobywa przedmiot;
  - **W licytacji** — użytkownicy przebijają kwotę, wygrywa najwyższa oferta;
- przebudowuje krok wyboru trybu w kreatorze przedmiotu;
- dodaje ustawiane przez wystawiającego minimalne przebicie;
- przebudowuje panel licytacji, modal potwierdzenia i sekcję objaśniającą zasady;
- dodaje panel rezerwacji za stałą wpłatę;
- rozróżnia oba tryby na kartach katalogu i stronie przedmiotu;
- odświeża górną część centrum przekazania po zdobyciu przedmiotu;
- aktualizuje stronę główną, katalog, regulamin i zasady licytacji;
- zachowuje istniejący bezpieczny proces: oględziny przed wpłatą, wpłata bezpośrednio do Siepomaga, przekazanie po potwierdzeniu.

## Zastosowanie

1. Zatrzymaj serwer `Ctrl+C`.
2. Rozpakuj ZIP patcha do osobnego folderu.
3. W folderze patcha uruchom:

```powershell
powershell -ExecutionPolicy Bypass -File .\ZASTOSUJ_PATCH.ps1 `
  -ProjectPath "C:\Users\lukwa\Downloads\licytujdobro-mvp"
```

Skrypt:

- tworzy kopię całego katalogu `src` w `_patch-backups`;
- kopiuje nowe pliki;
- usuwa cache `.next`;
- uruchamia `npm run typecheck`;
- uruchamia test reguł licytacji;
- wykonuje transakcyjną migrację PostgreSQL;
- przy błędzie przywraca poprzedni katalog `src`.

Po powodzeniu:

```powershell
cd C:\Users\lukwa\Downloads\licytujdobro-mvp
npm run dev
```

## Migracja 1.7

Migracja:

- dodaje `auctions.min_bid_increment`;
- ustawia nowy domyślny tryb `FIXED_DONATION`;
- zachowuje rozpoczęte licytacje ze starego modelu jako `AUCTION`;
- przekształca niezakończone okna zainteresowania w stałą wpłatę;
- nie nadpisuje skonfigurowanych przebić przy ponownym uruchomieniu.

Ręczne uruchomienie migracji:

```powershell
node --env-file=.env scripts/migrate-1.7.mjs
```

## Najważniejsza zasada

LicytujDobro ani wystawiający nie przyjmują pieniędzy. Ustalona albo wylicytowana kwota trafia bezpośrednio na oficjalną zbiórkę Adasia.
