# Aktualizacja z 0.5 do 0.6

Wersja 0.6 ustawia serwis dla Adasia Iwanejko i regionu Biłgoraj.

## Polecenia

```powershell
npm install
npm run db:push
npm run db:seed
npm run dev
```

`db:seed` nie kasuje użytkowników, aukcji ani transakcji. Dezaktywuje inne kampanie, tworzy lub aktualizuje kampanię Adasia i przypisuje do niej aukcje zatwierdzone oraz aktywne.

Po uruchomieniu przejdź do `/admin#siepomaga` i dodaj zdjęcie Adasia wyłącznie wtedy, gdy masz zgodę na jego wykorzystanie.

Wbudowane adresy:

- `https://www.siepomaga.pl/adas-iwanejko`;
- `https://www.siepomaga.pl/licytacje-dla-adasia-iwanejko`;
- `https://www.siepomaga.pl/licytacje-dla-adasia-iwanejko/terminal`.
