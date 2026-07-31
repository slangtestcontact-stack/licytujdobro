import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Najczęstsze pytania — LicytujDobro",
  description: "Odpowiedzi o licytacjach, wpłatach na zewnętrzną zbiórkę, spotkaniach, odpowiedzialności i danych użytkowników.",
  openGraph: {
    title: "Najczęstsze pytania — LicytujDobro",
    description: "Odpowiedzi o licytacjach, wpłatach na zewnętrzną zbiórkę, spotkaniach, odpowiedzialności i danych użytkowników.",
  },
};

const items = [
  ["Czy LicytujDobro przyjmuje pieniądze?", "Nie. Wpłata odbywa się poza platformą, bezpośrednio na oficjalnej stronie zbiórki. LicytujDobro nie prowadzi salda, nie przyjmuje prowizji i nie przechowuje danych płatniczych."],
  ["Czy LicytujDobro jest częścią Siepomaga.pl?", "Nie. LicytujDobro jest niezależną platformą techniczną. Link prowadzi do zewnętrznej zbiórki, a korzystanie z niej podlega zasadom jej operatora. Formalnej współpracy nie należy zakładać, jeżeli nie została osobno potwierdzona."],
  ["Co dzieje się po wygraniu aukcji?", "Zwycięzca wpłaca zadeklarowaną kwotę bezpośrednio na oficjalną zbiórkę, otrzymuje dane kontaktowe wystawiającego i samodzielnie ustala z nim osobisty odbiór. LicytujDobro nie przyjmuje ani nie weryfikuje wpłaty."],
  ["Czy to jest zwykła sprzedaż internetowa?", "Nie jest to typowy sklep. Operator platformy nie jest sprzedawcą, a wystawiający przekazuje przedmiot w związku z wpłatą zwycięzcy na zewnętrzną zbiórkę. Serwis jest przeznaczony dla osób prywatnych; przedsiębiorcy nie mogą publikować ofert bez odrębnie wdrożonych zasad."],
  ["Czy mam 14 dni na odstąpienie?", "Nie należy automatycznie zakładać prawa odstąpienia właściwego dla sprzedaży przedsiębiorca–konsument. Aukcje są przeznaczone dla osób prywatnych, a operator nie jest stroną uzgodnienia. W razie istotnej niezgodności zatrzymaj proces przed wpłatą i zgłoś problem."],
  ["Co zrobić, gdy przedmiot jest niezgodny?", "Nie odbieraj przedmiotu i nie potwierdzaj zakończenia. Opisz różnice, zachowaj zdjęcia i utwórz zgłoszenie. LicytujDobro może analizować zachowanie konta, ale nie cofa ani nie weryfikuje wpłaty wykonanej na zewnętrznej zbiórce."],
  ["Co zrobić bez BLIK-a?", "Skorzystaj z dowolnej metody dostępnej na oficjalnej stronie zbiórki. Nie wysyłaj pieniędzy na prywatny rachunek wystawiającego i nie przekazuj mu danych bankowych."],
  ["Co zrobić przy braku Internetu?", "Zatrzymaj proces. Nie przenoś płatności do prywatnej wiadomości ani na inny rachunek. Wróć do procesu po odzyskaniu połączenia lub zgłoś problem."],
  ["Czy mogę wycofać ofertę?", "Prawidłowo potwierdzona oferta jest wiążąca w ramach zasad platformy. Oczywistą pomyłkę, przejęcie konta lub błąd techniczny zgłoś natychmiast. Operator oceni logi i okoliczności."],
  ["Kto odpowiada za przedmiot?", "Wystawiający odpowiada za prawo do rozporządzania rzeczą, opis, stan i przekazanie. Zatwierdzenie przez moderatora nie jest gwarancją autentyczności, wartości ani braku wad."],
  ["Jak zgłosić nielegalną treść bez konta?", "Skorzystaj z publicznego formularza „Zgłoś treść lub naruszenie” w stopce. Podaj dokładny adres treści i konkretne uzasadnienie."],
  ["Jak odwołać się od moderacji?", "Skorzystaj z formularza „Odwołania od moderacji”. Podaj identyfikator decyzji, wyjaśnienie i oczekiwany rezultat. Odwołanie jest ponownie analizowane przez operatora."],
  ["Jak usunąć konto lub skorzystać z praw RODO?", "Skontaktuj się z administratorem danych przez adres wskazany na stronie kontaktowej. Aktywne procesy i otwarte sprawy bezpieczeństwa muszą zostać najpierw zakończone, a część danych może być przechowywana przez okres konieczny do obrony roszczeń lub wykonania prawa."],
];

export default function FaqPage() {
  return (
    <main className="page-shell max-w-4xl py-10">
      <h1 className="text-4xl font-bold tracking-[-.04em] text-ink">Najczęstsze pytania</h1>
      <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
        {items.map(([question, answer]) => (
          <details key={question} className="group py-5">
            <summary className="cursor-pointer list-none font-bold text-ink">{question}<span className="float-right text-brand-700 group-open:rotate-45">＋</span></summary>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{answer}</p>
          </details>
        ))}
      </div>
      <p className="mt-7 text-sm text-slate-600">
        Nie znalazłeś odpowiedzi? <Link href="/kontakt" className="font-semibold text-brand-700">Skontaktuj się z operatorem</Link> albo <Link href="/prawne/zgloszenia" className="font-semibold text-brand-700">zgłoś naruszenie</Link>.
      </p>
    </main>
  );
}
