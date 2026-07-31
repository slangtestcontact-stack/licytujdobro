# Stan projektu - 1.3

Wersja jest przygotowana do prezentacji rodzinie oraz lokalnego, zamkniętego pilotażu. Jej komunikacja jest skoncentrowana przede wszystkim na bezpośredniej pomocy dla Adasia. Nie jest automatycznie gotowa do publicznej produkcji bez konfiguracji zewnętrznych usług, testu backupu, zgód na materiały i przeglądu prawnego.

## Zaimplementowane

- wpłata bezpośrednia jako główna ścieżka pomocy;
- pomoc po przegranej i dobrowolne zwiększenie wpłaty po wygranej;
- tryb gościa z jednorazowym przypomnieniem oraz szybkie konto;
- aukcje specjalne wyróżniane przez moderatora;
- zweryfikowana strona historii i prawdziwe zdjęcie Adasia;
- pełny przepływ aukcji i spotkania;
- szybkie logowanie Facebook, Apple, Google i kodem e-mail oraz jednorazowa weryfikacja telefonu;
- centralna konfiguracja kampanii i nowa Skarbonka;
- alternatywne metody wpłaty oraz ścieżka awaryjna;
- moderacja, limity nowych wystawiających i zgoda właściciela;
- krótkie linki oraz rozbudowany generator grafik;
- powiadomienia z outboxem i ponawianiem;
- backup, test odtworzenia i eksporty CSV;
- środowisko testowe, FAQ, kontakt, transparentność i pilotaż.

## Wymaga konfiguracji produkcyjnej

- domena i HTTPS, wymagane również przez logowanie Apple;
- konta OAuth;
- operator e-mail;
- operator SMS;
- scheduler cron;
- magazyn plików/object storage;
- codzienny backup poza serwerem aplikacji;
- monitoring błędów;
- zgody i dokumenty prawne.
