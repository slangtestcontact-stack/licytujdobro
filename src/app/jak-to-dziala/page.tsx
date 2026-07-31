import Link from "next/link";
import { ProcessSteps } from "@/components/process-steps";
import { ArrowRightIcon, CheckIcon, GavelIcon, HandHeartIcon, MapPinIcon, PackageIcon, ShareIcon, ShieldIcon } from "@/components/icons";
import { DonationButtons } from "@/components/donation-actions";
import { ADAS_CAMPAIGN } from "@/lib/adas-campaign";

const DETAILS = [
  { icon: HandHeartIcon, title: "Wpłata bez aukcji", text: "Każda osoba może przejść bezpośrednio na oficjalną zbiórkę Adasia w serwisie Siepomaga.pl. Konto w LicytujDobro nie jest potrzebne." },
  { icon: PackageIcon, title: "Przedmiot przyciąga uwagę", text: "Wystawiający przekazuje rzecz, która może zainteresować kolejne osoby i zachęcić je do pomocy." },
  { icon: GavelIcon, title: "Oferta zwiększa pomoc", text: "Każde przebicie podnosi kwotę, która po zakończeniu aukcji zostanie wpłacona dla Adasia." },
  { icon: MapPinIcon, title: "Odbiór osobisty", text: "Po zakończeniu zwycięzca i wystawiający otrzymują kontakt i samodzielnie ustalają termin oraz publiczne miejsce spotkania." },
  { icon: ShareIcon, title: "Udostępnienie ma znaczenie", text: "Osoba, która nie może wpłacić ani licytować, może pomóc dotrzeć do kolejnego darczyńcy." },
  { icon: ShieldIcon, title: "Pieniądze poza platformą", text: "LicytujDobro nie przyjmuje pieniędzy, nie weryfikuje wpłat, nie zapisuje kodów BLIK i nie pobiera prowizji." },
];

export default function Page() {
  return <main>
    <section className="border-b border-slate-200 bg-white py-16">
      <div className="page-shell">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-700">Pomoc jest najważniejsza</p>
        <h1 className="text-balance mt-3 max-w-4xl text-4xl font-bold tracking-[-.04em] text-ink sm:text-5xl">Aukcja jest narzędziem. Celem jest jak największa pomoc dla Adasia.</h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-slate-700">Możesz wpłacić bezpośrednio, licytować albo udostępnić akcję. Każda udana aukcja kończy się wpłatą zwycięskiej kwoty bezpośrednio na oficjalną zbiórkę Adasia w serwisie Siepomaga.pl.</p>
        <div className="mt-8"><DonationButtons piggyBankUrl={ADAS_CAMPAIGN.piggyBankUrl}/></div>
      </div>
    </section>

    <section className="page-shell py-16">
      <h2 className="text-2xl font-bold text-ink">Jak aukcja zamienia się we wpłatę?</h2>
      <ProcessSteps/>
    </section>

    <section className="border-y border-slate-200 bg-white py-16">
      <div className="page-shell grid gap-8 lg:grid-cols-2">
        {DETAILS.map(({icon:Icon,title,text})=><article key={title} className="grid grid-cols-[44px_1fr] gap-4 border-t border-slate-200 pt-5"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon size={21}/></span><div><h2 className="text-lg font-bold text-ink">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div></article>)}
      </div>
    </section>

    <section className="page-shell py-16">
      <div className="grid gap-8 rounded-xl border border-brand-200 bg-brand-50/60 p-7 lg:grid-cols-[.75fr_1.25fr]">
        <div><ShieldIcon size={24} className="text-brand-700"/><h2 className="mt-4 text-2xl font-bold text-ink">Prosty podział odpowiedzialności</h2><p className="mt-2 text-sm leading-6 text-slate-600">LicytujDobro prowadzi licytację i udostępnia kontakt. Użytkownicy samodzielnie dokonują wpłaty oraz umawiają osobisty odbiór.</p></div>
        <ul className="divide-y divide-brand-200">{[
          "Wpłata odbywa się bezpośrednio w serwisie Siepomaga.",
          "LicytujDobro nie przyjmuje i nie weryfikuje wpłat.",
          "Po zakończeniu strony samodzielnie ustalają osobisty odbiór.",
          "Bez konta można wpłacać, oglądać aukcje i je udostępniać.",
        ].map((x)=><li key={x} className="flex gap-3 py-3 text-sm text-slate-700"><CheckIcon size={16} className="mt-0.5 shrink-0 text-brand-700"/>{x}</li>)}</ul>
      </div>
      <Link href="/gdzie-trafiaja-pieniadze" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-700">Zobacz dokładną drogę pieniędzy <ArrowRightIcon size={15}/></Link>
    </section>
  </main>;
}
