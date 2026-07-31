# Aktualizacja 1.2 → 1.3

Wersja 1.3 upraszcza logowanie i ujednolica region działania.

## Kroki

1. Rozpakuj paczkę do nowego katalogu.
2. Skopiuj ze starego projektu plik `.env` i katalog `public/uploads`.
3. Porównaj `.env` z `.env.example`.
4. Ustaw:

```text
PILOT_CITY=Biłgoraj i okolice
NEXT_PUBLIC_PILOT_CITY=Biłgoraj i okolice
```

5. Opcjonalnie skonfiguruj Apple OAuth według `AUTH_SETUP.md`.
6. Uruchom:

```powershell
npm install
npm run db:seed
npm run dev
```

Nowe migracje bazy nie są wymagane. `db:seed` ujednolica region istniejących aukcji oraz ustawienia administratora.

## Przed publikacją

Uzupełnij prawdziwe dane organizatora, ustaw flagi zgód rodziny dopiero po uzyskaniu dokumentów, a następnie sprawdź `/admin/system`.
