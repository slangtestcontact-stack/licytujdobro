import Link from "next/link";

import { Bullets, ContentPage, H2, H3, LegalNote, P } from "@/components/content-page";
import { getLegalConfiguration } from "@/lib/legal-config";

export default function PrivacyPolicyPage() {
  const legal = getLegalConfiguration();

  return (
    <ContentPage
      eyebrow="Ochrona danych osobowych"
      title="Polityka prywatności"
      intro="Dokument wyjaśnia, jakie dane przetwarza LicytujDobro, w jakich celach, na jakich podstawach i jakie prawa przysługują użytkownikom."
      legal
    >
      <H2>1. Administrator danych</H2>
      <P>
        Administratorem danych osobowych przetwarzanych w związku z serwisem LicytujDobro jest <strong>{legal.operatorLegalName}</strong>,
        adres: <strong>{legal.operatorAddress}</strong>, e-mail: <strong>{legal.operatorEmail}</strong>.
        W sprawach dotyczących prywatności można kontaktować się pod adresem <strong>{legal.privacyEmail || legal.operatorEmail}</strong>.
      </P>
      <P>
        LicytujDobro nie jest administratorem danych przetwarzanych samodzielnie przez serwis Siepomaga.pl, bank, operatora płatności ani dostawcę logowania społecznościowego.
        Po przejściu do takiego serwisu obowiązuje jego własna polityka prywatności.
      </P>

      <H2>2. Jakie dane przetwarzamy</H2>
      <Bullets>
        <li><strong>Dane konta:</strong> imię, pseudonim, e-mail, opcjonalny numer telefonu, miasto, status weryfikacji, rola i ustawienia konta.</li>
        <li><strong>Dane uwierzytelniania:</strong> skrót hasła, sesje, kody weryfikacyjne, tokeny resetu hasła oraz identyfikatory kont OAuth.</li>
        <li><strong>Dane aukcji:</strong> opisy, zdjęcia, kategorie, stan przedmiotu, lokalizacja ogólna, historia ofert, statusy i terminy.</li>
        <li><strong>Dane procesu przekazania:</strong> propozycje spotkania, potwierdzenia etapów, zgłoszenia problemów, notatki i zdjęcia weryfikacyjne.</li>
        <li><strong>Dane komunikacji:</strong> wiadomości z formularzy, powiadomienia, reklamacje, odwołania i zgłoszenia nielegalnych treści.</li>
        <li><strong>Dane techniczne i bezpieczeństwa:</strong> adres IP, znaczniki czasu, identyfikatory żądań, logi błędów, dane urządzenia wynikające z protokołu HTTP i podstawowe metryki wydajności.</li>
        <li><strong>Dane publiczne:</strong> pseudonim, ogólna lokalizacja, publiczne treści aukcji, statusy reputacji i dane, które użytkownik świadomie publikuje.</li>
      </Bullets>
      <LegalNote>
        Nie przesyłaj zdjęć dokumentów tożsamości, numeru PESEL, danych karty, danych bankowych ani informacji o zdrowiu.
        Zdjęcia weryfikacyjne powinny przedstawiać wyłącznie przedmiot i elementy niezbędne do moderacji.
      </LegalNote>

      <H2>3. Cele i podstawy prawne</H2>
      <H3>Wykonanie umowy o świadczenie usług – art. 6 ust. 1 lit. b RODO</H3>
      <P>
        Tworzenie i obsługa konta, logowanie, publikowanie aukcji, zapisywanie ofert, prowadzenie procesu przekazania,
        wysyłanie zamówionych powiadomień i rozpatrywanie reklamacji dotyczących funkcji serwisu.
      </P>

      <H3>Obowiązki prawne – art. 6 ust. 1 lit. c RODO</H3>
      <P>
        Realizacja obowiązków wynikających z przepisów o usługach elektronicznych, ochronie danych, usługach cyfrowych,
        wykonywanie praw osób oraz współpraca z uprawnionymi organami.
      </P>

      <H3>Prawnie uzasadniony interes – art. 6 ust. 1 lit. f RODO</H3>
      <P>
        Bezpieczeństwo kont i infrastruktury, zapobieganie oszustwom oraz manipulacji, moderacja, zabezpieczenie dowodów,
        obrona lub dochodzenie roszczeń, wykrywanie awarii i podstawowy pomiar wydajności serwisu.
      </P>

      <H3>Zgoda – art. 6 ust. 1 lit. a RODO</H3>
      <P>
        Zgoda jest stosowana wyłącznie tam, gdzie funkcja jest rzeczywiście dobrowolna i nie jest potrzebna do wykonania usługi,
        np. przyszły newsletter lub opcjonalna analityka niewymagana do działania serwisu. Zgodę można wycofać bez wpływu na zgodność wcześniejszego przetwarzania.
      </P>

      <H2>4. Jednorazowe przypomnienia bez konta</H2>
      <P>
        Osoba bez konta może podać e-mail w celu otrzymania jednego przypomnienia o końcu konkretnej aukcji.
        Adres nie jest dopisywany do newslettera. Po wysłaniu lub rezygnacji przypomnienie jest wyłączane,
        a nieaktywne rekordy są usuwane przez proces porządkowy najpóźniej po siedmiu dniach.
      </P>

      <H2>5. Dane publiczne i odbiorcy treści</H2>
      <P>
        Treści aukcji, pseudonim wystawiającego, ogólna lokalizacja i wybrane informacje o reputacji są widoczne publicznie.
        Nie publikujemy numeru telefonu, e-maila ani dokładnego miejsca spotkania. Użytkownik powinien zakładać, że publiczna treść może zostać zindeksowana,
        skopiowana lub zarchiwizowana przez podmioty niezależne od operatora.
      </P>

      <H2>6. Komu możemy ujawnić dane</H2>
      <P>Dane mogą otrzymywać wyłącznie podmioty potrzebne do działania serwisu lub uprawnione na podstawie prawa, w szczególności:</P>
      <Bullets>
        <li>dostawca hostingu, infrastruktury sieciowej i bazy danych;</li>
        <li>Cloudflare – jeżeli używany jest R2 do przechowywania publicznych i prywatnych plików;</li>
        <li>Resend lub inny skonfigurowany dostawca poczty – w zakresie niezbędnym do wysłania wiadomości;</li>
        <li>Google, Meta lub Apple – wyłącznie gdy użytkownik wybiera odpowiednią metodę logowania;</li>
        <li>podmioty świadczące wsparcie techniczne, bezpieczeństwa, prawne lub księgowe na podstawie odpowiednich umów;</li>
        <li>sądy, organy ścigania, organy nadzorcze i inne uprawnione instytucje, gdy wymagają tego przepisy.</li>
      </Bullets>
      <P>
        Operator powinien zawrzeć umowy powierzenia z podmiotami przetwarzającymi, ograniczyć ich dostęp i prowadzić aktualną listę dostawców.
      </P>

      <H2>7. Przekazywanie danych poza Europejski Obszar Gospodarczy</H2>
      <P>
        Niektórzy dostawcy infrastruktury, poczty lub logowania mogą przetwarzać dane poza EOG. W takim przypadku administrator stosuje mechanizm wymagany przez RODO,
        np. decyzję o odpowiednim stopniu ochrony, standardowe klauzule umowne oraz – gdy jest to potrzebne – dodatkowe zabezpieczenia.
        Informację o konkretnym mechanizmie można uzyskać pod adresem kontaktowym administratora.
      </P>

      <H2>8. Okres przechowywania</H2>
      <Bullets>
        <li>aktywne konto i dane konieczne do świadczenia usług – przez okres korzystania z konta;</li>
        <li>sesje logowania – zasadniczo do 30 dni albo do wcześniejszego wylogowania lub unieważnienia;</li>
        <li>kody logowania i weryfikacji – przez krótki okres ważności wskazany w wiadomości, a następnie do technicznego usunięcia lub anonimizacji;</li>
        <li>jednorazowe przypomnienia – zgodnie z punktem 4;</li>
        <li>historia aukcji, ofert, przekazania, zgłoszeń i moderacji – przez okres potrzebny do obsługi procesu, bezpieczeństwa oraz ustalenia, dochodzenia lub obrony roszczeń;</li>
        <li>logi bezpieczeństwa – przez okres proporcjonalny do ryzyka, a dłużej tylko w związku z konkretnym incydentem lub obowiązkiem prawnym;</li>
        <li>dane objęte obowiązkiem prawnym – przez okres wskazany w odpowiednim przepisie.</li>
      </Bullets>
      <P>
        Po upływie właściwego okresu dane są usuwane, anonimizowane albo blokowane. Kopie zapasowe mogą być nadpisywane zgodnie z cyklem backupu,
        bez przywracania usuniętych danych do bieżącego użycia, chyba że jest to konieczne do usunięcia awarii lub wykonania obowiązku prawnego.
      </P>

      <H2>9. Prawa osób</H2>
      <P>W zakresie określonym przez RODO przysługuje prawo do:</P>
      <Bullets>
        <li>dostępu do danych i uzyskania ich kopii;</li>
        <li>sprostowania danych;</li>
        <li>usunięcia danych;</li>
        <li>ograniczenia przetwarzania;</li>
        <li>przenoszenia danych;</li>
        <li>sprzeciwu wobec przetwarzania opartego na prawnie uzasadnionym interesie;</li>
        <li>cofnięcia zgody, jeżeli zgoda jest podstawą przetwarzania;</li>
        <li>wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych.</li>
      </Bullets>
      <P>
        Żądanie można przesłać na adres <strong>{legal.privacyEmail || legal.operatorEmail}</strong>.
        Administrator może poprosić o informacje potrzebne do potwierdzenia tożsamości, ale nie będzie żądał danych nadmiarowych.
      </P>

      <H2>10. Zautomatyzowane decyzje i profilowanie</H2>
      <P>
        Serwis może automatycznie obliczać minimalną ofertę, kolejność aukcji, limity bezpieczeństwa i status procesu.
        Nie stosuje zautomatyzowanego podejmowania decyzji wywołującego skutki prawne lub podobnie istotnie wpływającego na użytkownika bez możliwości udziału człowieka.
        Ostateczne decyzje moderacyjne mogą być poddane odwołaniu.
      </P>

      <H2>11. Bezpieczeństwo</H2>
      <P>
        Stosujemy środki adekwatne do ryzyka, w tym szyfrowane połączenia, hashowanie haseł i tokenów sesji, ograniczanie liczby prób,
        kontrolę dostępu, prywatne przechowywanie zdjęć weryfikacyjnych, kopie zapasowe i rejestrowanie zdarzeń administracyjnych.
        Żaden system nie gwarantuje jednak całkowitego wyeliminowania ryzyka.
      </P>

      <H2>12. Cookies i pamięć urządzenia</H2>
      <P>
        Szczegóły dotyczące plików cookie, OAuth i pamięci sesyjnej przeglądarki znajdują się w
        <Link href="/prawne/polityka-cookies" className="font-semibold text-brand-700 underline"> Polityce cookies i pamięci urządzenia</Link>.
      </P>

      <H2>13. Zmiany polityki</H2>
      <P>
        Polityka może być aktualizowana w razie zmiany funkcji, dostawców lub prawa. Istotne zmiany zostaną wyraźnie oznaczone,
        a gdy będzie to wymagane – użytkownik zostanie poinformowany przed rozpoczęciem nowego sposobu przetwarzania.
      </P>
    </ContentPage>
  );
}
