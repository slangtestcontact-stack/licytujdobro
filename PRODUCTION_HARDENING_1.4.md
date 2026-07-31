# Utwardzenie produkcyjne 1.4

## Limity ruchu

`src/lib/rate-limit.ts` korzysta z atomowego UPSERT w PostgreSQL. Limity są wspólne dla wszystkich instancji aplikacji i nie resetują się po restarcie procesu.

Okresowo można usuwać wygasłe rekordy:

```sql
DELETE FROM rate_limit_buckets WHERE reset_at < now() - interval '24 hours';
```

## Efekty uboczne

Błędy wysyłki powiadomień, audytu i innych operacji pobocznych nie cofają poprawnie zapisanej oferty, ale są rejestrowane w `operational_errors`. Panel `/admin/system` pokazuje liczbę nierozwiązanych błędów.

## Upload obrazów

Serwer sprawdza:

- rzeczywistą sygnaturę JPEG/PNG/WEBP;
- maksymalny rozmiar 8 MB;
- możliwość poprawnego dekodowania;
- limit 40 megapikseli.

Obraz jest automatycznie obracany, ograniczany do 2400 × 2400 i zapisywany ponownie jako WebP. Surowy plik użytkownika nie jest publikowany.

## Testy priorytetowe

Dodano testy polityk uwierzytelniania i transakcji. Przed wdrożeniem należy dodatkowo przeprowadzić test E2E na osobnej bazie: rejestracja, pierwsza oferta, zakończenie aukcji, spotkanie, obustronne potwierdzenie wpłaty i przekazanie.
