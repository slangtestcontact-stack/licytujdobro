# Backup i test odtwarzania

`npm run backup` tworzy:

- kopię PostgreSQL w formacie custom;
- kopię `public/uploads` w trybie lokalnym;
- przy R2: osobną politykę retencji/kopiowania obiektów, ponieważ backup PostgreSQL nie zawiera plików z bucketa;
- manifest z datą, wersją i nazwami plików;
- wpis w tabeli `backup_runs`.

Ustaw katalog w `BACKUP_DIRECTORY`. Zaplanuj polecenie raz dziennie oraz przed każdą aktualizacją.

`npm run backup:verify` odtwarza najnowszą kopię wyłącznie do osobnej bazy wskazanej przez `RESTORE_TEST_DATABASE_URL`. Nigdy nie używaj tu produkcyjnego `DATABASE_URL`.

Po poprawnym teście panel administratora zapisuje datę ostatniego sprawdzonego odtworzenia.
