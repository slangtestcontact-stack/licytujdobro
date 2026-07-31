# Aktualizacja do 0.9

1. Skopiuj `.env` i `public/uploads` ze starszej wersji.
2. Uruchom `npm install`.
3. Uruchom `npm run db:push` i zaakceptuj dodanie nowych tabel/kolumn.
4. Ustaw bezpieczne `ADMIN_PASSWORD` (minimum 12 znaków), potem `npm run db:seed`.
5. Uruchom `npm run typecheck`, `npm test`, `npm run build`.

## Nowe elementy bazy
- statusy awaryjne płatności,
- wybór ścieżki płatności i odroczenie,
- dziennik zdarzeń transakcji,
- poziomy weryfikacji kont,
- preferencje powiadomień,
- analityka źródeł ruchu,
- powiązanie aukcji z wydarzeniami,
- jakość i automatyczny zapis ogłoszeń.
