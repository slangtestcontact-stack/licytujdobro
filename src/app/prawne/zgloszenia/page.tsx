import Link from "next/link";

import { sendIllegalContentNoticeAction } from "@/actions/legal";
import { Bullets, ContentPage, H2, LegalNote, Numbered, P } from "@/components/content-page";
import { IllegalContentNoticeForm } from "@/components/legal-forms";
import { getLegalConfiguration } from "@/lib/legal-config";

export default function ReportsPage() {
  const legal = getLegalConfiguration();

  return (
    <ContentPage
      eyebrow="Mechanizm notice and action"
      title="Zgłaszanie treści i naruszeń"
      intro="Każda osoba może elektronicznie zgłosić konkretną treść, którą uważa za nielegalną. Użytkownicy mogą także zgłaszać problemy z aukcją lub przekazaniem przedmiotu."
      legal
    >
      <H2>1. Dwa rodzaje zgłoszeń</H2>
      <Bullets>
        <li><strong>Problem operacyjny:</strong> niezgodność przedmiotu, brak kontaktu, pomyłka oferty, podejrzane zachowanie lub niewykonanie ustaleń. Użyj przycisku „Zgłoś” przy aukcji albo „Mam problem” w centrum przekazania.</li>
        <li><strong>Potencjalnie nielegalna treść:</strong> użyj formularza poniżej. Konto w LicytujDobro nie jest wymagane.</li>
      </Bullets>

      <H2>2. Co powinno zawierać zgłoszenie nielegalnej treści</H2>
      <Numbered>
        <li>dokładny adres URL albo inne dane pozwalające jednoznacznie zlokalizować treść;</li>
        <li>jasne wyjaśnienie, dlaczego treść może być nielegalna;</li>
        <li>wskazanie kategorii oraz – jeżeli jest znana – podstawy prawnej;</li>
        <li>imię, nazwę lub oznaczenie zgłaszającego oraz e-mail do kontaktu;</li>
        <li>oświadczenie o działaniu w dobrej wierze.</li>
      </Numbered>
      <LegalNote>
        Formularz nie służy do odzyskiwania wpłat ani zgłaszania bezpośredniego zagrożenia życia. W nagłej sytuacji skontaktuj się z odpowiednimi służbami.
        Podejrzenie wykorzystania seksualnego dzieci można również zgłosić zespołowi Dyżurnet.pl.
      </LegalNote>

      <H2>3. Formularz zgłoszenia</H2>
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <IllegalContentNoticeForm action={sendIllegalContentNoticeAction} />
      </div>

      <H2>4. Co dzieje się po wysłaniu</H2>
      <P>
        Serwis nadaje numer zgłoszenia i zapisuje je w kolejce operatora. Operator może poprosić o uzupełnienie informacji,
        zabezpieczyć dostępne dane, ograniczyć widoczność treści na czas analizy albo pozostawić ją bez zmian do zakończenia oceny.
      </P>
      <P>
        Zgłoszenie jest oceniane terminowo, bezstronnie i z uwzględnieniem praw wszystkich stron. Zgłaszający otrzyma informację o końcowej decyzji na podany e-mail,
        jeżeli wiadomość może zostać doręczona i nie zachodzi prawna przeszkoda w przekazaniu informacji.
      </P>

      <H2>5. Decyzja i odwołanie</H2>
      <P>
        Gdy operator ogranicza treść albo konto, powinien przekazać zainteresowanemu użytkownikowi konkretne uzasadnienie obejmujące podstawę decyzji,
        zakres ograniczenia, informacje o ewentualnym użyciu automatyzacji oraz dostępne środki odwoławcze.
      </P>
      <P>
        Od decyzji można się odwołać na stronie <Link href="/prawne/odwolania" className="font-semibold text-brand-700 underline">Odwołania od moderacji</Link>.
      </P>

      <H2>6. Kontakt alternatywny</H2>
      <P>
        Jeżeli formularz nie działa, wyślij kompletne zgłoszenie na adres <strong>{legal.dsaContactEmail || legal.operatorEmail}</strong> z tematem „Zgłoszenie nielegalnej treści”.
      </P>
    </ContentPage>
  );
}
