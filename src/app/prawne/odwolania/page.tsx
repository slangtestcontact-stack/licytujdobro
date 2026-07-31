import { sendModerationAppealAction } from "@/actions/legal";
import { Bullets, ContentPage, H2, Numbered, P } from "@/components/content-page";
import { ModerationAppealForm } from "@/components/legal-forms";
import { getLegalConfiguration } from "@/lib/legal-config";

export default function AppealsPage() {
  const legal = getLegalConfiguration();

  return (
    <ContentPage
      eyebrow="Wewnętrzny system skarg"
      title="Odwołania od decyzji moderacyjnych"
      intro="Użytkownik może zakwestionować usunięcie lub ograniczenie treści, zawieszenie funkcji, ograniczenie licytowania albo blokadę konta."
      legal
    >
      <H2>1. Kiedy można złożyć odwołanie</H2>
      <Bullets>
        <li>ogłoszenie zostało odrzucone, usunięte albo ograniczone;</li>
        <li>aukcja została anulowana decyzją operatora;</li>
        <li>konto lub funkcja licytowania zostały zawieszone albo zablokowane;</li>
        <li>operator odmówił działania po zgłoszeniu treści;</li>
        <li>uzasadnienie decyzji jest niejasne, niepełne albo oparte na błędnych danych.</li>
      </Bullets>

      <H2>2. Termin</H2>
      <P>
        Odwołanie najlepiej złożyć niezwłocznie po otrzymaniu decyzji. System przyjmuje odwołania przez co najmniej sześć miesięcy od decyzji,
        chyba że dłuższy okres wynika z przepisów albo szczególnych okoliczności sprawy.
      </P>

      <H2>3. Sposób rozpatrzenia</H2>
      <Numbered>
        <li>operator potwierdza przyjęcie i nadaje numer odwołania;</li>
        <li>sprawa jest oceniana ponownie na podstawie regulaminu, prawa, kontekstu i nowych dowodów;</li>
        <li>w miarę możliwości odwołania nie rozstrzyga wyłącznie osoba, która podjęła pierwotną decyzję;</li>
        <li>decyzja może zostać utrzymana, zmieniona albo uchylona;</li>
        <li>wynik wraz z uzasadnieniem jest przekazywany na podany e-mail.</li>
      </Numbered>

      <H2>4. Formularz odwołania</H2>
      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <ModerationAppealForm action={sendModerationAppealAction} />
      </div>

      <H2>5. Dalsze środki</H2>
      <P>
        W sprawach objętych Aktem o usługach cyfrowych użytkownik może skorzystać z pozasądowego organu rozstrzygania sporów,
        złożyć skargę do właściwego Koordynatora ds. usług cyfrowych albo dochodzić praw przed sądem. W Polsce funkcję Koordynatora pełni Prezes UKE.
      </P>
      <P>
        Formularz wewnętrzny nie ogranicza prawa do zawiadomienia organów ścigania, Prezesa UODO, UOKiK, UKE ani innego właściwego organu.
        Dodatkowy kontakt: <strong>{legal.dsaContactEmail || legal.operatorEmail}</strong>.
      </P>
    </ContentPage>
  );
}
