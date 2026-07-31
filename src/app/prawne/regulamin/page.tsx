import Link from "next/link";

import { Bullets, ContentPage, H2, H3, LegalNote, Numbered, P } from "@/components/content-page";
import { getLegalConfiguration } from "@/lib/legal-config";

export default function TermsPage() {
  const legal = getLegalConfiguration();

  return (
    <ContentPage
      eyebrow="Warunki korzystania z usług"
      title="Regulamin serwisu LicytujDobro"
      intro="Regulamin określa zasady nieodpłatnego korzystania z platformy, publikowania przedmiotów w trybie stałej wpłaty lub licytacji, moderacji treści oraz rozpatrywania reklamacji."
      legal
    >
      <H2>1. Operator i kontakt</H2>
      <P>
        Usługodawcą i operatorem serwisu LicytujDobro jest <strong>{legal.operatorLegalName}</strong>,
        adres: <strong>{legal.operatorAddress}</strong>, e-mail: <strong>{legal.operatorEmail}</strong>
        {legal.operatorPhone ? <>, telefon: <strong>{legal.operatorPhone}</strong></> : null}.
        {legal.operatorNip ? <> NIP: <strong>{legal.operatorNip}</strong>.</> : null}
        {legal.operatorRegistry ? <> Dane rejestrowe: <strong>{legal.operatorRegistry}</strong>.</> : null}
      </P>
      <P>
        Punkt kontaktowy dla użytkowników i organów w sprawach dotyczących usług cyfrowych:
        <strong> {legal.dsaContactEmail || legal.operatorEmail}</strong>. Kontakt nie opiera się wyłącznie na narzędziach automatycznych.
      </P>

      <H2>2. Charakter serwisu</H2>
      <P>
        LicytujDobro udostępnia narzędzia do publikowania przedmiotów, przyjmowania rezerwacji za stałą wpłatę, prowadzenia licytacji i ustalania odbioru,
        przekazywania informacji o etapach procesu oraz zgłaszania problemów. Korzystanie z serwisu jest nieodpłatne,
        a operator nie pobiera prowizji od ustalonych ani wylicytowanych kwot.
      </P>
      <LegalNote>
        Operator nie jest właścicielem wystawianych przedmiotów, sprzedawcą, stroną uzgodnienia między użytkownikami,
        organizatorem płatności ani odbiorcą środków. Wpłata jest wykonywana poza LicytujDobro, bezpośrednio w zewnętrznym
        serwisie prowadzącym oficjalną zbiórkę. LicytujDobro nie jest operatorem serwisu Siepomaga.pl i nie należy sugerować
        formalnego partnerstwa bez odrębnego, udokumentowanego uzgodnienia.
      </LegalNote>

      <H2>3. Usługi świadczone drogą elektroniczną</H2>
      <P>Operator świadczy w szczególności następujące usługi:</P>
      <Bullets>
        <li>publiczne przeglądanie przedmiotów, informacji o inicjatywie i materiałów edukacyjnych;</li>
        <li>prowadzenie konta użytkownika i obsługa logowania;</li>
        <li>publikowanie oraz moderowanie ogłoszeń;</li>
        <li>rezerwowanie przedmiotów za stałą wpłatę oraz składanie ofert i wyłanianie zwycięzcy licytacji;</li>
        <li>udostępnianie centrum przekazania przedmiotu i statusów procesu;</li>
        <li>powiadomienia związane z kontem, przedmiotem, licytacją, bezpieczeństwem i jednorazowymi przypomnieniami;</li>
        <li>formularze kontaktowe, zgłoszenia treści, reklamacje i odwołania od moderacji.</li>
      </Bullets>

      <H2>4. Wymagania techniczne i bezpieczeństwo konta</H2>
      <P>
        Do korzystania z serwisu potrzebne są aktualna przeglądarka internetowa, dostęp do Internetu, aktywna obsługa HTTPS,
        JavaScript oraz – dla funkcji konta – niezbędne pliki cookie. Użytkownik powinien chronić hasło, skrzynkę e-mail i urządzenie,
        nie udostępniać sesji innym osobom oraz niezwłocznie zgłosić podejrzenie przejęcia konta.
      </P>
      <P>
        Operator może czasowo ograniczyć dostęp z przyczyn technicznych, bezpieczeństwa, konserwacji lub działania siły wyższej.
        Planowane, istotne przerwy powinny być komunikowane, gdy jest to możliwe.
      </P>

      <H2>5. Konto i warunki udziału</H2>
      <Bullets>
        <li>Konto może utworzyć osoba pełnoletnia posiadająca zdolność do czynności prawnych w wymaganym zakresie.</li>
        <li>Serwis jest przeznaczony dla osób działających prywatnie, poza działalnością gospodarczą lub zawodową.</li>
        <li>Publikowanie ofert przez przedsiębiorców jest zabronione do czasu wdrożenia odrębnej weryfikacji statusu przedsiębiorcy i informacji konsumenckich.</li>
        <li>Użytkownik podaje prawdziwe dane i aktualizuje dane kontaktowe.</li>
        <li>Jedna osoba nie może tworzyć kont w celu manipulowania ofertami, ocenami, limitami albo moderacją.</li>
      </Bullets>
      <P>
        Oglądanie przedmiotów i przejście do zewnętrznej zbiórki nie wymaga konta. Konto jest wymagane do rezerwacji, składania ofert,
        publikowania przedmiotów i korzystania z funkcji transakcyjnych.
      </P>

      <H2>6. Zasady publikowania przedmiotów</H2>
      <P>Wystawiający oświadcza, że może legalnie rozporządzać przedmiotem oraz że opis, zdjęcia, stan i wskazane wady są zgodne z rzeczywistością.</P>
      <P>Nie wolno publikować w szczególności:</P>
      <Bullets>
        <li>przedmiotów nielegalnych, pochodzących z przestępstwa, podrobionych lub naruszających prawa osób trzecich;</li>
        <li>broni, amunicji, materiałów wybuchowych, niebezpiecznych substancji i przedmiotów wymagających zezwoleń;</li>
        <li>alkoholu, wyrobów tytoniowych i nikotynowych, narkotyków, leków na receptę oraz produktów leczniczych sprzedawanych z naruszeniem prawa;</li>
        <li>dokumentów, danych logowania, danych osobowych innych osób, treści seksualnych, nawołujących do nienawiści lub przemocy;</li>
        <li>zwierząt, usług, zobowiązań niemożliwych do bezpiecznego zweryfikowania oraz rzeczy wyłączonych przez aktualne zasady moderacji.</li>
      </Bullets>
      <P>
        Operator może zażądać korekty, dodatkowych zdjęć albo wyjaśnień. Zatwierdzenie ogłoszenia nie oznacza potwierdzenia własności,
        autentyczności, wartości ani braku wad przedmiotu.
      </P>

      <H2>7. Stała wpłata, licytacja i uzgodnienie między użytkownikami</H2>
      <P>
        Szczegółowe reguły rezerwacji i ofert określają <Link href="/prawne/zasady-licytacji" className="font-semibold text-brand-700 underline">Zasady rezerwacji i licytacji</Link>,
        stanowiące część regulaminu. Rezerwacja lub oferta zostaje zapisana dopiero po wyświetleniu kwoty i jednoznacznym potwierdzeniu jej przez użytkownika.
      </P>
      <P>
        Po rezerwacji albo zakończeniu licytacji wystawiający i osoba, która zdobyła przedmiot, otrzymują dane kontaktowe potrzebne do samodzielnego ustalenia osobistego odbioru.
        Osoba, która zdobyła przedmiot, wykonuje ustaloną albo wylicytowaną wpłatę bezpośrednio na oficjalną zbiórkę. Operator nie przyjmuje i nie weryfikuje wpłat,
        nie uczestniczy w spotkaniu oraz nie staje się stroną uzgodnienia między użytkownikami.
      </P>

      <H2>8. Wpłata zewnętrzna</H2>
      <Numbered>
        <li>Wpłata odbywa się wyłącznie przez oficjalną stronę zewnętrznej zbiórki wskazaną w serwisie.</li>
        <li>Przed zatwierdzeniem płatności użytkownik sprawdza domenę, kwotę i odbiorcę w banku lub serwisie płatniczym.</li>
        <li>LicytujDobro nie prosi o kod BLIK, hasło, dane karty, login bankowy ani przelew na prywatny rachunek wystawiającego.</li>
        <li>Regulamin, polityka prywatności i procedury zwrotu zewnętrznego operatora płatności obowiązują niezależnie od niniejszego regulaminu.</li>
        <li>Dobrowolna nadwyżka ponad ustaloną albo wylicytowaną kwotę nie może być warunkiem otrzymania przedmiotu.</li>
      </Numbered>

      <H2>9. Odbiór, niezgodność i problemy</H2>
      <P>
        Strony powinny wybrać bezpieczne miejsce, sprawdzić przedmiot przed wpłatą i wykonywać kroki w kolejności pokazanej w centrum przekazania.
        Gdy przedmiot istotnie odbiega od opisu, osoba odbierająca powinna przerwać proces, nie wykonywać wpłaty i utworzyć zgłoszenie.
      </P>
      <P>
        Spory między użytkownikami są w pierwszej kolejności wyjaśniane na podstawie opisu ogłoszenia, historii rezerwacji lub ofert, statusów, wiadomości i przekazanych dowodów.
        Operator może pomóc organizacyjnie, zabezpieczyć dane i zastosować środki wobec konta, ale nie zastępuje sądu ani organów ścigania.
      </P>

      <H2>10. Moderacja treści i kont</H2>
      <P>
        Operator może ograniczyć widoczność, odrzucić, usunąć lub zablokować treść, anulować ogłoszenie lub licytację, ograniczyć rezerwowanie albo licytowanie,
        zawiesić albo zablokować konto, jeżeli treść lub zachowanie narusza prawo, regulamin, bezpieczeństwo użytkowników lub wiarygodność procesu.
      </P>
      <P>
        Moderacja jest prowadzona z uwzględnieniem kontekstu, proporcjonalności i praw użytkowników. Decyzja powinna wskazywać jej podstawę,
        najważniejsze fakty, zastosowane ograniczenie i dostępny sposób odwołania. Serwis nie stosuje w pełni automatycznej, ostatecznej decyzji moderacyjnej bez możliwości przeglądu przez człowieka.
      </P>
      <P>
        Mechanizm zgłaszania nielegalnych treści jest dostępny na stronie <Link href="/prawne/zgloszenia" className="font-semibold text-brand-700 underline">Zgłoszenia treści i naruszeń</Link>.
        Od decyzji moderacyjnej można odwołać się zgodnie z <Link href="/prawne/odwolania" className="font-semibold text-brand-700 underline">procedurą odwoławczą</Link>.
      </P>

      <H2>11. Reklamacje dotyczące usług elektronicznych</H2>
      <P>
        Reklamację dotyczącą działania konta, ogłoszenia, licytacji, powiadomień lub innych funkcji serwisu można przesłać przez formularz kontaktowy albo na adres
        <strong> {legal.operatorEmail}</strong>. Należy opisać problem, podać adres e-mail konta, istotne identyfikatory i oczekiwany sposób rozwiązania.
      </P>
      <P>
        Operator potwierdza otrzymanie i udziela odpowiedzi bez zbędnej zwłoki, co do zasady w terminie 14 dni. Jeżeli sprawa wymaga dodatkowych informacji,
        termin może zostać odpowiednio przedłużony, o czym zgłaszający zostanie poinformowany.
      </P>

      <H2>12. Odpowiedzialność</H2>
      <P>
        Każdy użytkownik odpowiada za własne działania, treści, przedmiot, złożone oferty oraz zgodność przekazywanych informacji z prawem.
        Operator odpowiada za własne działania na zasadach wynikających z bezwzględnie obowiązujących przepisów. Żadne postanowienie regulaminu
        nie wyłącza odpowiedzialności, której nie można zgodnie z prawem wyłączyć, ani praw przysługujących użytkownikowi z mocy prawa.
      </P>
      <P>
        Operator nie odpowiada za działanie zewnętrznej zbiórki, banku, dostawcy Internetu, urządzenia użytkownika ani za treść zewnętrznych stron,
        z wyjątkiem zakresu, w którym odpowiedzialność wynika z przepisów lub zawinionego działania operatora.
      </P>

      <H2>13. Zakończenie korzystania z usług</H2>
      <P>
        Użytkownik może wystąpić o usunięcie konta. Najpierw muszą zostać zakończone aktywne ogłoszenia, licytacje, przekazania, reklamacje i postępowania bezpieczeństwa.
        Część danych może pozostać zablokowana przez okres niezbędny do ustalenia, dochodzenia lub obrony roszczeń albo wykonania obowiązków prawnych.
      </P>

      <H2>14. Zmiany regulaminu</H2>
      <P>
        Operator może zmienić regulamin z ważnych przyczyn, w szczególności z powodu zmiany prawa, funkcjonalności, zagrożeń bezpieczeństwa albo modelu działania.
        Informacja o istotnej zmianie, jej zakresie i dacie wejścia w życie zostanie udostępniona w serwisie, a użytkownicy posiadający konto mogą otrzymać powiadomienie.
        Zmiany nie działają wstecz wobec zakończonych zdarzeń.
      </P>

      <H2>15. Prawo właściwe</H2>
      <P>
        Regulamin podlega prawu polskiemu. Spory są rozstrzygane przez sąd właściwy zgodnie z przepisami powszechnie obowiązującymi.
        Postanowienie to nie ogranicza praw, których użytkownik nie może się skutecznie zrzec.
      </P>

      <H3>Dokumenty powiązane</H3>
      <Bullets>
        <li><Link href="/prawne/zasady-licytacji" className="font-semibold text-brand-700 underline">Zasady rezerwacji i licytacji</Link></li>
        <li><Link href="/prawne/polityka-prywatnosci" className="font-semibold text-brand-700 underline">Polityka prywatności</Link></li>
        <li><Link href="/prawne/polityka-cookies" className="font-semibold text-brand-700 underline">Polityka cookies i pamięci urządzenia</Link></li>
        <li><Link href="/prawne/zgloszenia" className="font-semibold text-brand-700 underline">Zgłaszanie treści i naruszeń</Link></li>
      </Bullets>
    </ContentPage>
  );
}
