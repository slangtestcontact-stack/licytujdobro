# Cloudflare R2 - konfiguracja zdjęć LicytujDobro

Patch obsługuje dwa tryby:

- `OBJECT_STORAGE_DRIVER=local` - pliki trafiają do `public/uploads` i `.data/private`; używaj tylko lokalnie.
- `OBJECT_STORAGE_DRIVER=r2` - pliki trafiają do Cloudflare R2; używaj na produkcji.

Kod przesyła obrazy z serwera Next.js do R2 po bezpiecznym przetworzeniu przez `sharp`. Klucze R2 nigdy nie są wysyłane do przeglądarki.

## 1. Utwórz dwa buckety

W panelu Cloudflare wybierz **Storage & databases → R2 → Create bucket**.

Utwórz:

```text
licytujdobro-public
licytujdobro-private
```

`licytujdobro-public` przechowuje zdjęcia aukcji.  
`licytujdobro-private` przechowuje zdjęcia weryfikacyjne i nie może być publiczny.

Wybierz klasę **Standard**. Tylko ona korzysta z bezpłatnego limitu R2.

## 2. Podłącz domenę do publicznego bucketa

W publicznym buckecie otwórz **Settings → Public access → Custom Domains** i dodaj:

```text
img.licytujdobro.pl
```

Cloudflare utworzy rekord DNS. Po aktywacji publiczny adres powinien wyglądać tak:

```text
https://img.licytujdobro.pl/listings/ID-AUKCJI/PLIK.webp
```

Na czas lokalnego testu możesz włączyć domenę `r2.dev`, ale do produkcji zalecana jest własna domena.

Prywatnego bucketa nie publikuj i nie włączaj dla niego `r2.dev`.

## 3. Utwórz token S3 API

W R2 otwórz **Manage R2 API Tokens → Create API token**.

Nadaj tokenowi dostęp **Object Read & Write** tylko do obu bucketów:

```text
licytujdobro-public
licytujdobro-private
```

Zapisz od razu:

- Account ID,
- Access Key ID,
- Secret Access Key.

Secret jest pokazywany tylko raz. Nie wklejaj go do kodu ani do zmiennych `NEXT_PUBLIC_*`.

## 4. Ustaw `.env.local`

```env
OBJECT_STORAGE_DRIVER=r2
R2_ACCOUNT_ID=twoj_account_id
R2_ACCESS_KEY_ID=twoj_access_key_id
R2_SECRET_ACCESS_KEY=twoj_secret_access_key
R2_PUBLIC_BUCKET=licytujdobro-public
R2_PRIVATE_BUCKET=licytujdobro-private
R2_PUBLIC_URL=https://img.licytujdobro.pl
```

Po zmianie uruchom ponownie Next.js:

```bash
npm run dev
```

## 5. Sprawdź konfigurację

Otwórz:

```text
http://localhost:3000/api/readiness
```

Pole `storageDriver` powinno mieć wartość `r2`, a lista `issues` nie powinna zawierać błędu konfiguracji R2.

Następnie utwórz szkic aukcji i dodaj zdjęcie. W publicznym buckecie powinien powstać obiekt:

```text
listings/<listingId>/<uuid>.webp
```

Zdjęcie zostaje automatycznie:

- sprawdzone jako JPG, PNG lub WebP,
- ograniczone do 8 MB wejścia,
- ograniczone do 40 milionów pikseli,
- obrócone zgodnie z orientacją,
- zmniejszone maksymalnie do 2400 × 2400 px,
- ponownie zakodowane do WebP,
- pozbawione metadanych EXIF.

## 6. Prywatne zdjęcia

Prywatne pliki są zapisywane pod kluczem:

```text
verification/<userId>/<listingId>/<uuid>.webp
```

Nie mają publicznego adresu. Endpoint `/api/private-file/...` sprawdza sesję i pozwala odczytać plik wyłącznie właścicielowi albo administratorowi.

W prywatnym buckecie skonfiguruj regułę lifecycle, która usuwa stare obiekty, np. po 90 dniach, jeżeli przepisy i proces moderacji nie wymagają dłuższego przechowywania.

## 7. Limity bezpłatne

Cloudflare R2 Standard obejmuje miesięcznie bez opłat:

- 10 GB-miesiąc przechowywania,
- 1 milion operacji klasy A, m.in. zapisy,
- 10 milionów operacji klasy B, m.in. odczyty,
- transfer do internetu bez opłaty egress.

Limity są rozliczane miesięcznie. Po ich przekroczeniu Cloudflare nalicza opłaty według aktualnego cennika.

## 8. Kopia zapasowa i migracja istniejących zdjęć

R2 nie zastępuje kopii bazy PostgreSQL. Baza nadal przechowuje adresy zdjęć i dane aukcji.

Istniejące pliki z `public/uploads` przeniesiesz gotowym skryptem:

```bash
npm run storage:migrate:r2
```

Skrypt wysyła publiczne zdjęcia do R2 i aktualizuje `listing_photos.url`. Aby dodatkowo skopiować prywatne zdjęcia weryfikacyjne z `.data/private`, uruchom:

```bash
npm run storage:migrate:r2 -- --private
```

Przed migracją wykonaj backup. Operacja prywatna może być uruchomiona ponownie, ponieważ używa tych samych kluczy obiektów. Nie usuwaj lokalnych plików przed ręcznym sprawdzeniem kilku aukcji i plików prywatnych.

## 9. Najczęstsze błędy

### `R2 PUT 403 SignatureDoesNotMatch`

Sprawdź Account ID, Access Key ID i Secret oraz czy token ma dostęp do właściwego bucketa. Sprawdź również zegar systemowy serwera.

### Zdjęcie zapisuje się, ale Next.js go nie pokazuje

Ustaw dokładne `R2_PUBLIC_URL` i uruchom ponownie aplikację. Domena jest automatycznie dodawana do `remotePatterns` w `next.config.ts` podczas startu/builda.

### Lokalnie działa, na produkcji nie

Zmienne środowiskowe muszą być ustawione także na platformie hostingowej, nie tylko w lokalnym `.env.local`.
