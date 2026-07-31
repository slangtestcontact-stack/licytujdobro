# Krytyczne testy integracyjne przed publikacją

Uruchamiaj na osobnej bazie wskazanej przez `TEST_DATABASE_URL`.

1. Rejestracja kodem e-mail, Google i Facebookiem.
2. Telefon nie jest wymagany do oglądania ani wpłaty, ale jest wymagany przed pierwszą ofertą.
3. Właściciel nie może licytować własnego przedmiotu.
4. Dwie równoczesne oferty nie tworzą dwóch liderów.
5. Oferta w końcowych dwóch minutach przedłuża aukcję i jest widoczna w drugiej przeglądarce.
6. Nie można przekazać przedmiotu bez obustronnego potwierdzenia wpłaty.
7. Przelew tradycyjny wymaga weryfikacji administratora.
8. Brak internetu odracza płatność i pozostawia przedmiot u wystawiającego.
9. Błąd e-maila nie cofa zapisanej oferty, ale tworzy rekord w `operational_errors`.
10. Limity ofert i kodów są wspólne dla dwóch równoległych instancji aplikacji.
