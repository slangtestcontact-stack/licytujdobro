import Link from "next/link";

import { Bullets, ContentPage, H2, LegalNote, Numbered, P } from "@/components/content-page";

export default function BiddingRulesPage() {
  return (
    <ContentPage
      eyebrow="Integralna część regulaminu"
      title="Zasady rezerwacji i licytacji"
      intro="Zasady określają działanie stałej wpłaty, składanie ofert w licytacji oraz bezpieczne wykonanie zobowiązania po zdobyciu przedmiotu."
      legal
    >
      <H2>1. Dwa sposoby zdobycia przedmiotu</H2>
      <Bullets>
        <li><strong>Za stałą wpłatę:</strong> wystawiający ustala jedną kwotę wsparcia, a przedmiot otrzymuje pierwsza osoba, która prawidłowo go zarezerwuje i wykona wymagane kroki procesu.</li>
        <li><strong>W licytacji:</strong> użytkownicy składają i przebijają wiążące oferty, a po zakończeniu przedmiot otrzymuje osoba z najwyższą ważną ofertą.</li>
        <li>W obu trybach pieniądze nie trafiają do wystawiającego ani LicytujDobro, lecz bezpośrednio na oficjalną zbiórkę wskazaną w serwisie.</li>
      </Bullets>

      <H2>2. Znaczenie rezerwacji i oferty</H2>
      <P>
        Oferta zostaje zapisana dopiero po podaniu kwoty i jej jednoznacznym potwierdzeniu na ekranie informującym o wiążącym charakterze licytacji.
        Samo wpisanie kwoty, przejście do logowania albo otwarcie okna potwierdzenia nie składa oferty.
      </P>
      <LegalNote>
        Ustalona albo wylicytowana kwota nie jest przekazywana wystawiającemu ani LicytujDobro. Osoba, która zdobyła przedmiot, zobowiązuje się wykonać wpłatę tej kwoty bezpośrednio na oficjalną zbiórkę wskazaną w serwisie, a wystawiający – po spełnieniu warunków – przekazać opisany przedmiot.
      </LegalNote>

      <H2>3. Warunki udziału</H2>
      <Bullets>
        <li>rezerwować i licytować może zalogowana, pełnoletnia osoba prywatna z wymaganym potwierdzeniem kontaktu;</li>
        <li>nie wolno rezerwować ani licytować własnego przedmiotu ani uzgadniać ofert w celu sztucznego podnoszenia kwoty;</li>
        <li>użytkownik składa rezerwację albo ofertę tylko wtedy, gdy realnie może wykonać wpłatę i odebrać przedmiot;</li>
        <li>ograniczenie konta, blokada rezerwowania lub licytowania albo naruszenie regulaminu może uniemożliwić zapisanie oferty.</li>
      </Bullets>

      <H2>4. Cena początkowa i minimalne przebicie</H2>
      <P>
        Pierwsza oferta może być równa cenie początkowej. Każda następna musi być co najmniej równa minimalnej kolejnej kwocie pokazanej przez system.
        Serwer odrzuci ofertę, która w chwili zapisu jest za niska, nawet jeżeli użytkownik wcześniej widział inną wartość.
      </P>

      <H2>5. Kolejność i czas ofert</H2>
      <Numbered>
        <li>O przyjęciu oferty decyduje czas jej prawidłowego zapisania przez serwer, a nie czas kliknięcia w przeglądarce.</li>
        <li>Najwyższa prawidłowo zapisana oferta prowadzi w aukcji.</li>
        <li>W razie identycznej kwoty pierwszeństwo ma oferta wcześniej zapisana przez serwer.</li>
        <li>Oferta złożona w ostatnich dwóch minutach przedłuża zakończenie o dwie minuty, łącznie maksymalnie o dwadzieścia minut.</li>
        <li>Po osiągnięciu maksymalnego przedłużenia aukcja kończy się o czasie wskazanym przez system.</li>
      </Numbered>

      <H2>6. Pomyłka i wycofanie oferty</H2>
      <P>
        Użytkownik nie może samodzielnie usuwać prawidłowo potwierdzonej oferty. Oczywistą pomyłkę, przejęcie konta lub błąd techniczny należy zgłosić niezwłocznie,
        najlepiej przed zakończeniem aukcji. Operator może anulować ofertę po sprawdzeniu logów i okoliczności, ale nie ma obowiązku uznać każdego wniosku.
      </P>
      <P>
        Nadużywanie procedury, składanie ofert bez zamiaru ich wykonania lub powtarzające się rezygnacje mogą skutkować ostrzeżeniem, czasowym ograniczeniem albo blokadą konta.
      </P>

      <H2>7. Rezerwacja za stałą wpłatę</H2>
      <P>
        Rezerwacja zostaje skutecznie zapisana dopiero po jednoznacznym potwierdzeniu zobowiązania. Pierwsza prawidłowo zapisana rezerwacja blokuje przedmiot dla pozostałych użytkowników. Rezerwujący otrzymuje kontakt do wystawiającego, wpłaca zadeklarowaną kwotę bezpośrednio na oficjalną zbiórkę i ustala osobisty odbiór.
      </P>
      <P>
        Rezerwacji nie wolno składać bez realnego zamiaru odbioru i wykonania wpłaty. Powtarzające się rezygnacje mogą skutkować ograniczeniem konta.
      </P>

      <H2>8. Zakończenie licytacji i wyłonienie zwycięzcy</H2>
      <P>
        Po zakończeniu licytacji zwycięzcą zostaje użytkownik z najwyższą ważną ofertą. System udostępnia zwycięzcy i wystawiającemu dane kontaktowe potrzebne do osobistego odbioru.
        Jeżeli zwycięzca nie współdziała albo nie odpowiada, operator może zastosować środek wobec konta albo – gdy funkcja jest dostępna – ponownie udostępnić przedmiot.
      </P>

      <H2>9. Kontakt i osobisty odbiór</H2>
      <Bullets>
        <li>po zakończeniu strony otrzymują dane kontaktowe potrzebne do ustalenia spotkania;</li>
        <li>odbiór odbywa się wyłącznie osobiście, w terminie i publicznym miejscu ustalonym przez strony;</li>
        <li>zwycięzca powinien porównać przedmiot ze zdjęciami, opisem, stanem, kompletnością i wskazanymi wadami;</li>
        <li>istotną niezgodność albo brak kontaktu należy zgłosić operatorowi;</li>
        <li>zwykłe ślady używania ujawnione w opisie nie stanowią niezgodności.</li>
      </Bullets>

      <H2>10. Wykonanie wpłaty</H2>
      <P>
        Osoba, która zdobyła przedmiot, otwiera wyłącznie oficjalny link do zbiórki pokazany przez LicytujDobro, sprawdza domenę i odbiorcę, a następnie wpłaca co najmniej ustaloną albo wylicytowaną kwotę.
        Może dobrowolnie wpłacić więcej, lecz dodatkowa kwota nie jest warunkiem przekazania przedmiotu.
      </P>
      <P>
        Kod BLIK wpisuje się wyłącznie w zewnętrznym, oficjalnym procesie płatniczym. Nie wolno wysyłać kodu BLIK, danych karty, hasła ani danych bankowych wystawiającemu,
        operatorowi lub w wiadomości. LicytujDobro nie przyjmuje i nie weryfikuje wpłat oraz nie ocenia przesyłanych między stronami potwierdzeń.
      </P>

      <H2>11. Przekazanie przedmiotu</H2>
      <P>
        Wystawiający i zwycięzca samodzielnie ustalają warunki osobistego odbioru. Po faktycznym przekazaniu przedmiotu każda strona może oznaczyć ten fakt w LicytujDobro.
        Takie oznaczenie dokumentuje wyłącznie odbiór przedmiotu i nie jest potwierdzeniem ani weryfikacją wpłaty.
      </P>

      <H2>12. Awaria lub przerwanie procesu</H2>
      <P>
        Przy braku Internetu, awarii banku, zewnętrznej zbiórki albo serwisu strony zatrzymują proces. Przedmiot pozostaje u wystawiającego,
        a wpłata nie powinna być wykonywana alternatywną drogą wskazaną w prywatnej wiadomości. Po przywróceniu działania strony kontynuują proces albo zgłaszają problem.
      </P>

      <H2>13. Przedmioty specjalne i kolejność prezentacji</H2>
      <P>
        Oznaczenie „przedmiot specjalny” może zostać nadane ręcznie wyjątkowemu przedmiotowi, np. pamiątce, rękodziełu lub przedmiotowi z autografem.
        Nie jest ono płatnym pozycjonowaniem ani gwarancją jakości. Listy przedmiotów mogą być układane według czasu zakończenia, liczby ofert, braku ofert,
        kategorii albo filtra wybranego przez użytkownika. Serwis nie sprzedaje wyższych pozycji w wynikach.
      </P>

      <H2>14. Zgłoszenia</H2>
      <P>
        Podejrzenie manipulacji, niezgodności, oszustwa lub problemu z wykonaniem uzgodnienia należy zgłosić przez funkcję przy aukcji lub transakcji albo przez
        <Link href="/prawne/zgloszenia" className="font-semibold text-brand-700 underline"> formularz zgłoszenia treści i naruszeń</Link>.
      </P>
    </ContentPage>
  );
}
