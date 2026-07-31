import Link from "next/link";

import { ContactForm } from "@/components/contact-form";
import { getLegalConfiguration } from "@/lib/legal-config";

export default function ContactPage() {
  const legal = getLegalConfiguration();
  const hours = process.env.ORGANIZER_HOURS || "Poniedziałek–piątek, 17:00–20:00";

  return (
    <main className="page-shell py-10">
      <div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-700">Kontakt i dane operatora</p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-.04em] text-ink">Skontaktuj się z LicytujDobro</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
            Wybierz właściwy kanał. Formularz kontaktowy służy sprawom ogólnym i reklamacjom dotyczącym działania serwisu.
            Nie wysyłaj kodów BLIK, haseł, danych kart ani dokumentów tożsamości.
          </p>

          {!legal.isComplete && (
            <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              Dane operatora nie są jeszcze kompletne. Przed publicznym uruchomieniem uzupełnij zmienne wymagane przez /api/readiness.
            </div>
          )}

          <dl className="mt-7 space-y-4 text-sm">
            <div>
              <dt className="text-slate-500">Operator i administrator danych</dt>
              <dd className="mt-1 font-semibold text-ink">{legal.operatorLegalName}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Adres</dt>
              <dd className="mt-1 whitespace-pre-line font-semibold text-ink">{legal.operatorAddress}</dd>
            </div>
            {legal.operatorNip && <div><dt className="text-slate-500">NIP</dt><dd className="mt-1 font-semibold text-ink">{legal.operatorNip}</dd></div>}
            {legal.operatorRegistry && <div><dt className="text-slate-500">Dane rejestrowe</dt><dd className="mt-1 font-semibold text-ink">{legal.operatorRegistry}</dd></div>}
            <div>
              <dt className="text-slate-500">E-mail ogólny</dt>
              <dd className="mt-1 font-semibold text-ink">{legal.operatorEmail}</dd>
            </div>
            {legal.operatorPhone && <div><dt className="text-slate-500">Telefon</dt><dd className="mt-1 font-semibold text-ink">{legal.operatorPhone}</dd></div>}
            <div>
              <dt className="text-slate-500">Prywatność i prawa RODO</dt>
              <dd className="mt-1 font-semibold text-ink">{legal.privacyEmail || legal.operatorEmail}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Punkt kontaktowy DSA</dt>
              <dd className="mt-1 font-semibold text-ink">{legal.dsaContactEmail || legal.operatorEmail}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Godziny odpowiedzi</dt>
              <dd className="mt-1 font-semibold text-ink">{hours}</dd>
            </div>
          </dl>

          <div className="mt-7 flex flex-col gap-2 text-sm">
            <Link href="/prawne/zgloszenia" className="font-semibold text-brand-700 underline">Zgłoś potencjalnie nielegalną treść</Link>
            <Link href="/prawne/odwolania" className="font-semibold text-brand-700 underline">Odwołaj się od decyzji moderacyjnej</Link>
            <Link href="/prawne/polityka-prywatnosci" className="font-semibold text-brand-700 underline">Sprawdź zasady przetwarzania danych</Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-ink">Wiadomość ogólna lub reklamacja</h2>
          <p className="mt-2 mb-5 text-sm leading-6 text-slate-600">
            Opisz konkretnie problem, podaj adres strony albo identyfikator aukcji i oczekiwany sposób rozwiązania.
          </p>
          <ContactForm />
        </div>
      </div>
    </main>
  );
}
