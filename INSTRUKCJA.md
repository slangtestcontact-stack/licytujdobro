# Patch 1.5.6 — stopka i dokumenty prawne

## Instalacja

1. Zatrzymaj `npm run dev` (`Ctrl+C`).
2. Rozpakuj ten ZIP do osobnego katalogu, nie bezpośrednio do projektu.
3. W PowerShell uruchom:

```powershell
powershell -ExecutionPolicy Bypass -File .\NAPRAW_STOPKE_I_DOKUMENTY.ps1 `
  -ProjectPath "C:\Users\lukwa\Downloads\licytujdobro-mvp"
```

Skrypt tworzy kopię w `.patch-backup-legal-1.5.6-<data>`, usuwa `.next` i uruchamia `npm run typecheck`.

## Po instalacji

Uzupełnij w `.env` co najmniej:

```env
ORGANIZER_NAME=LicytujDobro
ORGANIZER_LEGAL_NAME=
ORGANIZER_ADDRESS=
ORGANIZER_EMAIL=
ORGANIZER_PHONE=
ORGANIZER_NIP=
ORGANIZER_REGISTRY=
PRIVACY_EMAIL=
DSA_CONTACT_EMAIL=
LEGAL_VERSION=1.0
LEGAL_EFFECTIVE_DATE=2026-07-30
LEGAL_LAST_UPDATED_DATE=2026-07-30
LEGAL_BIDDING_TERMS_VERSION=2026-07-v2
LEGAL_PUBLISH_READY=false
```

Nie ustawiaj `LEGAL_PUBLISH_READY=true`, dopóki dane operatora, rzeczywisty model działania, zgody rodziny i dokumenty nie zostaną zweryfikowane.

Następnie:

```powershell
npm run dev
```

Sprawdź:

- `/kontakt`
- `/prawne/regulamin`
- `/prawne/zasady-licytacji`
- `/prawne/polityka-prywatnosci`
- `/prawne/polityka-cookies`
- `/prawne/zgloszenia`
- `/prawne/odwolania`
- `/api/readiness`

Migracja bazy nie jest potrzebna. Formularze prawne korzystają z istniejącej tabeli `contact_messages`.
