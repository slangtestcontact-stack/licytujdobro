# Poprawka 1.5.1

Naprawiono zgodność `Buffer` z Web Fetch API przez konwersję do rzeczywistego `ArrayBuffer` przed użyciem jako `BodyInit`.

Naprawiono sortowanie dat aukcji, które mogą mieć typ `Date` albo `string`.

Po instalacji uruchom:

```bash
npm ci
npm run db:migrate:1.5
npm run validate
```

W środowisku tworzenia paczki wykonano test typów dla konwersji `Buffer -> ArrayBuffer` oraz kontrolę składni zmienionych plików. Pełne `npm ci` było niemożliwe z powodu niepełnego wewnętrznego rejestru pakietów; pełną walidację należy wykonać lokalnie.
