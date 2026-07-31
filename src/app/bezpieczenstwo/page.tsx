import type { Metadata } from "next";
import Link from "next/link";

import { AlertTriangleIcon, ArrowRightIcon, CheckIcon, FlagIcon, LockIcon, ShieldIcon } from "@/components/icons";
import { SafetyGuide } from "@/components/safety-guide";

export const metadata: Metadata = {
  title: "Bezpieczne pomaganie — LicytujDobro",
  description: "Zasady bezpiecznego spotkania, oględzin, wpłaty na oficjalną zbiórkę i przekazania przedmiotu.",
  openGraph: {
    title: "Bezpieczne pomaganie — LicytujDobro",
    description: "Zasady bezpiecznego spotkania, oględzin, wpłaty na oficjalną zbiórkę i przekazania przedmiotu.",
  },
};

export default function SafetyPage() {
  return (
    <main>
      <section className="border-b border-slate-200 bg-white py-14">
        <div className="page-shell max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">Centrum bezpieczeństwa</p>
          <h1 className="text-balance mt-3 max-w-3xl text-4xl font-bold tracking-[-0.035em] text-ink sm:text-5xl">
            Pomagaj bezpiecznie — od licytacji do przekazania
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
            Wygrywając aukcję, deklarujesz wpłatę bezpośrednio na oficjalną zbiórkę i otrzymujesz kontakt do wystawiającego.
            LicytujDobro nie przyjmuje ani nie weryfikuje pieniędzy, a odbiór odbywa się osobiście.
          </p>
        </div>
      </section>

      <section className="page-shell py-16"><SafetyGuide /></section>

      <section className="border-y border-slate-200 bg-white py-16">
        <div className="page-shell grid gap-10 lg:grid-cols-3">
          <SecurityColumn icon={LockIcon} title="Przed spotkaniem" items={[
            "Wybierz publiczne i bezpieczne miejsce.",
            "Ustal termin bezpośrednio z drugą stroną po zakończeniu aukcji.",
            "Powiadom bliską osobę, gdzie się wybierasz.",
            "Nie udostępniaj zbędnych danych osobowych.",
          ]} />
          <SecurityColumn icon={CheckIcon} title="Podczas spotkania" items={[
            "Sprawdź przedmiot i porównaj go z opisem.",
            "Sprawdź domenę Siepomaga przed dokonaniem wpłaty.",
            "Nie podawaj drugiej stronie kodu BLIK ani danych bankowych.",
            "Obejrzyj przedmiot przed potwierdzeniem osobistego odbioru.",
          ]} />
          <SecurityColumn icon={FlagIcon} title="Gdy coś budzi wątpliwości" items={[
            "Przerwij spotkanie, gdy zachowanie drugiej strony budzi obawy.",
            "Nie wysyłaj kodów, haseł ani danych bankowych.",
            "LicytujDobro nie rozstrzyga, czy wpłata została wykonana.",
            "Użyj przycisku „Zgłoś problem” albo formularza zgłoszenia.",
          ]} />
        </div>
      </section>

      <section className="page-shell py-16">
        <div className="grid gap-6 rounded-xl border border-red-200 bg-red-50/50 p-6 sm:grid-cols-[48px_1fr_auto] sm:items-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-danger shadow-sm"><AlertTriangleIcon size={24} /></span>
          <div>
            <h2 className="text-lg font-bold text-ink">Podejrzewasz oszustwo albo nie otrzymałeś przedmiotu?</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Zatrzymaj dalsze działania, zabezpiecz wiadomości i potwierdzenia oraz zgłoś sprawę. W pilnej sytuacji skontaktuj się z bankiem i odpowiednimi służbami.</p>
          </div>
          <Link href="/prawne/zgloszenia" className="inline-flex items-center gap-2 text-sm font-semibold text-danger">Zgłoś problem <ArrowRightIcon size={15} /></Link>
        </div>
      </section>
    </main>
  );
}

function SecurityColumn({ icon: Icon, title, items }: { icon: typeof ShieldIcon; title: string; items: string[] }) {
  return (
    <section>
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon size={21} /></span>
      <h2 className="mt-4 text-xl font-bold text-ink">{title}</h2>
      <ul className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
        {items.map((item) => <li key={item} className="flex gap-3 py-3 text-sm leading-6 text-slate-600"><CheckIcon size={16} className="mt-1 shrink-0 text-brand-600" />{item}</li>)}
      </ul>
    </section>
  );
}
