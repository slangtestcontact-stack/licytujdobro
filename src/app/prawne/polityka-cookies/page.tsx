import { Bullets, ContentPage, H2, LegalNote, P } from "@/components/content-page";

export default function CookiesPolicyPage() {
  return (
    <ContentPage
      eyebrow="Technologie urządzenia końcowego"
      title="Polityka cookies i pamięci urządzenia"
      intro="LicytujDobro korzysta z niezbędnych technologii do logowania, bezpieczeństwa i zachowania szkicu formularza. Nie używa marketingowych plików cookie."
      legal
    >
      <H2>1. Czym są cookies i pamięć przeglądarki</H2>
      <P>
        Pliki cookie to niewielkie informacje zapisywane przez przeglądarkę. Pamięć sesyjna przeglądarki działa podobnie,
        ale jest dostępna wyłącznie w danej karcie lub sesji i zwykle znika po jej zamknięciu.
      </P>

      <H2>2. Niezbędne pliki cookie LicytujDobro</H2>
      <Bullets>
        <li>
          <strong>ld_session / __Host-ld_session</strong> – utrzymuje zalogowanie, zawiera losowy token sesji,
          jest niedostępny dla JavaScriptu, działa w trybie SameSite=Lax, a na produkcji jest przesyłany wyłącznie przez HTTPS.
          Sesja wygasa najpóźniej po 30 dniach lub wcześniej po wylogowaniu.
        </li>
        <li>
          <strong>ld_oauth_state</strong> – chroni proces logowania Google lub Facebook przed podmianą żądania; wygasa po około 10 minutach.
        </li>
        <li>
          <strong>ld_oauth_return</strong> – zapamiętuje bezpieczny adres powrotu po logowaniu społecznościowym; wygasa po około 10 minutach.
        </li>
      </Bullets>
      <P>
        Te pliki są konieczne do świadczenia funkcji wyraźnie żądanych przez użytkownika, takich jak logowanie i bezpieczny powrót z OAuth.
        Nie służą reklamie ani śledzeniu zachowania między różnymi serwisami.
      </P>

      <H2>3. Pamięć sesyjna szkicu aukcji</H2>
      <P>
        Kreator dodawania przedmiotu może tymczasowo zapisać szkic formularza w <strong>sessionStorage</strong>, aby ograniczyć utratę danych przy odświeżeniu strony.
        Szkic jest usuwany po zakończeniu formularza, ręcznym wyczyszczeniu lub zakończeniu sesji przeglądarki. Nie jest to mechanizm reklamowy.
      </P>

      <H2>4. Podstawowe metryki wydajności</H2>
      <P>
        Serwis może wysyłać do własnego endpointu techniczne metryki Web Vitals, takie jak czas ładowania, responsywność, ocena wyniku i ścieżka strony.
        Mechanizm nie ustawia marketingowego identyfikatora cookie i służy wykrywaniu awarii oraz poprawie wydajności.
      </P>

      <H2>5. Zewnętrzne serwisy</H2>
      <P>
        Po wybraniu logowania Google, Facebook lub Apple albo po przejściu na stronę zbiórki użytkownik opuszcza techniczny zakres LicytujDobro.
        Zewnętrzny dostawca może stosować własne pliki cookie zgodnie ze swoją polityką. Samo osadzenie zwykłego linku nie powoduje przekazania danych do zewnętrznej strony przed kliknięciem.
      </P>

      <H2>6. Brak marketingu i analityki reklamowej</H2>
      <LegalNote>
        W obecnej konfiguracji LicytujDobro nie używa Google Analytics, Meta Pixel, reklam behawioralnych ani innych niewymaganych trackerów.
        Przed uruchomieniem takiej technologii operator musi wdrożyć uprzednią zgodę, możliwość odmowy równie łatwą jak akceptacja,
        rejestr wyboru oraz możliwość późniejszej zmiany ustawień.
      </LegalNote>

      <H2>7. Zarządzanie ustawieniami</H2>
      <P>
        Użytkownik może usuwać lub blokować cookies w ustawieniach przeglądarki. Zablokowanie plików niezbędnych może uniemożliwić logowanie,
        korzystanie z konta i poprawne zakończenie procesu OAuth. Usunięcie sessionStorage usuwa lokalny szkic formularza.
      </P>

      <H2>8. Zmiany polityki</H2>
      <P>
        Lista technologii będzie aktualizowana przed wdrożeniem nowego narzędzia. Jeżeli nowe narzędzie będzie wymagało zgody,
        nie zostanie uruchomione przed dokonaniem wyboru przez użytkownika.
      </P>
    </ContentPage>
  );
}
