> Dokument historyczny. Aktualna wersja projektu to 0.6; zobacz `UPGRADE_TO_0.6.md`.

# Aktualizacja z LicytujDobro 0.4 do 0.5

## Zalecana metoda

1. Zatrzymaj aplikację.
2. Zrób kopię bazy i folderu `public/uploads`.
3. Rozpakuj pełną paczkę 0.5 do nowego katalogu.
4. Przenieś swój `.env`, ale uzupełnij nowe zmienne z `.env.example`.
5. Przenieś `public/uploads` tylko wtedy, gdy zawiera potrzebne zdjęcia.
6. Uruchom aktualizację schematu i bootstrap.

```powershell
docker compose up -d
npm install
npm run db:push
npm run db:seed
npm run dev
```

`db:seed` w wersji 0.5 nie usuwa danych. Ustawia jedno miasto, limity, kategorie oraz tworzy lub promuje wskazane konto administratora.

## Nowe wymagane zmienne

```env
HANDOVER_CODE_SECRET=
ADMIN_EMAIL=
ADMIN_PHONE=
ADMIN_PASSWORD=
ADMIN_FIRST_NAME=
ADMIN_NICKNAME=
PILOT_CITY=
NEXT_PUBLIC_PILOT_CITY=
```

## Istniejąca baza z danymi demonstracyjnymi

Aktualizacja nie kasuje starych rekordów automatycznie. Panel administratora dezaktywuje pozostałe kampanie po zapisaniu jednej prawdziwej zbiórki. Starych użytkowników i aukcje należy usunąć ręcznie albo rozpocząć od nowej bazy.

Gdy nie masz żadnych potrzebnych danych, najczystszy start wygląda tak:

```powershell
docker compose down -v --remove-orphans
docker compose up -d
npm run db:push
npm run db:seed
npm run dev
```

To polecenie usuwa cały wolumen PostgreSQL, dlatego nie wolno go wykonywać na bazie zawierającej dane, które chcesz zachować.

## Konfiguracja po aktualizacji

Po zalogowaniu otwórz:

```text
http://localhost:3000/admin#siepomaga
```

Zapisz jedną prawdziwą zbiórkę, Skarbonkę oraz Terminal. Bez tego tworzenie i uruchamianie nowych aukcji pozostanie zablokowane.
