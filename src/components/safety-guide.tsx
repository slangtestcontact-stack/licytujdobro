import Link from "next/link";

import { ArrowRightIcon, CheckIcon, EyeIcon, HandHeartIcon, MapPinIcon, ShieldIcon } from "@/components/icons";

const STEPS = [
  {
    icon: MapPinIcon,
    title: "Skontaktuj się po zakończeniu",
    text: "Dane kontaktowe są udostępniane tylko zwycięzcy i wystawiającemu. Ustalcie termin oraz publiczne miejsce odbioru.",
  },
  {
    icon: EyeIcon,
    title: "Sprawdź oficjalny link",
    text: "Wpłacaj wyłącznie na zbiórkę wskazaną w serwisie i upewnij się, że otwierasz domenę Siepomaga.",
  },
  {
    icon: HandHeartIcon,
    title: "Wpłać bezpośrednio na zbiórkę",
    text: "LicytujDobro nie przyjmuje pieniędzy i nie sprawdza wpłat. Nie wysyłaj wystawiającemu kodów BLIK, haseł ani danych bankowych.",
  },
  {
    icon: CheckIcon,
    title: "Odbierz przedmiot osobiście",
    text: "Spotkajcie się w publicznym miejscu. Po faktycznym przekazaniu obie strony mogą oznaczyć proces jako zakończony.",
  },
];

export function SafetyGuide({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`grid gap-10 ${compact ? "lg:grid-cols-[.75fr_1.25fr]" : "lg:grid-cols-[.8fr_1.2fr]"}`}>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">Bezpieczne pomaganie</p>
        <h2 className="mt-2 text-balance text-3xl font-bold tracking-[-0.025em] text-ink">Od wygranej do przekazania — krok po kroku</h2>
        <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600">
          Celem jest pomoc Adasiowi. Platforma organizuje licytację i udostępnia kontakt, ale wpłata oraz osobisty odbiór odbywają się bez udziału administratora.
        </p>
        <div className="mt-7 max-w-md rounded-xl border border-amber-300 bg-amber-50 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-200 bg-white text-amber-800"><ShieldIcon size={21} /></span>
          <p className="mt-4 text-sm font-bold text-amber-900">Najważniejsza zasada</p>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            Nie przekazuj kodu BLIK, hasła ani danych bankowych. Nie wpłacaj na prywatny rachunek wystawiającego. Wpłata odbywa się wyłącznie na oficjalnej stronie zbiórki.
          </p>
        </div>
        <Link href="/bezpieczenstwo" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-800">
          Poznaj wszystkie zasady <ArrowRightIcon size={15} />
        </Link>
      </div>
      <ol className="divide-y divide-slate-200 border-y border-slate-200">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="grid grid-cols-[42px_36px_1fr] gap-3 py-5 first:pt-0 lg:first:pt-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon size={20} /></span>
              <span className="pt-2 text-sm font-bold tabular-nums text-brand-700">{String(index + 1).padStart(2, "0")}</span>
              <div><h3 className="text-sm font-semibold text-ink">{step.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{step.text}</p></div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
