import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getActiveCampaign } from "@/lib/campaign";
import { ADAS_CAMPAIGN } from "@/lib/adas-campaign";
import { ArrowRightIcon, HandHeartIcon, HeartIcon, MapPinIcon, ShieldIcon } from "@/components/icons";
import { DonationButtons, DirectHelpCard } from "@/components/donation-actions";
import { familyConsentsConfirmed } from "@/lib/environment";


export const metadata: Metadata = {
  title: 'Historia Adasia Iwanejko - LicytujDobro',
  description: 'Poznaj historię Adasia Iwanejko i sprawdź, jak wesprzeć jego oficjalną zbiórkę na terapię, leczenie i rehabilitację.',
  openGraph: { title: 'Historia Adasia Iwanejko - LicytujDobro', description: 'Poznaj historię Adasia Iwanejko i sprawdź, jak wesprzeć jego oficjalną zbiórkę na terapię, leczenie i rehabilitację.' },
};


const FACTS = [
  ["Imię i nazwisko", ADAS_CAMPAIGN.fullName],
  ["Wiek", ADAS_CAMPAIGN.ageLabel],
  ["Miejsce", ADAS_CAMPAIGN.locationLabel],
  ["Rozpoznanie", ADAS_CAMPAIGN.diagnosis],
  ["Cel zbiórki", ADAS_CAMPAIGN.collectionPurpose],
  ["Organizator zbiórki", ADAS_CAMPAIGN.organizerName],
  ["Rozpoczęcie zbiórki", ADAS_CAMPAIGN.collectionStartedAt],
  ["Planowane zakończenie", ADAS_CAMPAIGN.collectionEndsAt],
];

export default async function HistoryPage() {
  const campaign = await getActiveCampaign();
  const image = campaign?.imageUrl || ADAS_CAMPAIGN.imageUrl;
  const piggyBankUrl = campaign?.piggyBankUrl || ADAS_CAMPAIGN.piggyBankUrl;
  const consentsConfirmed = familyConsentsConfirmed();

  return (
    <main>
      <section className="border-b border-slate-200 bg-white py-10 sm:py-14">
        <div className="page-shell grid gap-10 lg:grid-cols-[1fr_.9fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-brand-700"><HeartIcon size={15}/> Prawdziwa historia Adasia</p>
            <h1 className="text-balance mt-4 text-4xl font-bold tracking-[-.045em] text-ink sm:text-5xl">Pomóżmy Adasiowi w walce o terapię</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">{ADAS_CAMPAIGN.description}</p>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">Najważniejszy jest cel pomocy. Aukcje są jednym ze sposobów dotarcia do osób, które mogą wpłacić wylicytowaną kwotę dla Adasia.</p>{consentsConfirmed && <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800"><ShieldIcon size={15}/> Materiały opublikowane za zgodą rodziny</p>}
            <div className="mt-7"><DonationButtons piggyBankUrl={piggyBankUrl}/></div>
          </div>
          <div className="relative aspect-square overflow-hidden rounded-[28px] border border-brand-100 bg-brand-50 shadow-[0_20px_60px_rgba(16,40,32,.14)]">
            <Image src={image} alt="Adaś Iwanejko" fill loading="eager" sizes="(max-width: 1024px) 100vw, 45vw" className="object-cover"/>
          </div>
        </div>
      </section>

      <section className="page-shell py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_.82fr]">
          <article>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-700">Informacje ze źródła oficjalnego</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-.03em] text-ink">Kim jest Adaś i na co prowadzona jest zbiórka?</h2>
            <p className="mt-5 text-base leading-7 text-slate-700">Adaś choruje na dystrofię mięśniową Duchenne’a, postępującą chorobę genetyczną prowadzącą do osłabienia mięśni. Oficjalny cel zbiórki obejmuje terapię genową w Dubaju oraz koszty związane z leczeniem, rehabilitacją, przelotem i pobytem.</p>
            <p className="mt-4 text-base leading-7 text-slate-700">Na LicytujDobro nie kopiujemy na stałe aktualnej kwoty zbiórki, ponieważ zmienia się ona na bieżąco. Zawsze pokazujemy bezpośredni link do Siepomaga, gdzie można sprawdzić aktualny wynik i wykonać wpłatę.</p>
            <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-5">
              <p className="flex items-center gap-2 font-bold text-brand-900"><ShieldIcon size={18}/> Źródło danych</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">Dane zweryfikowano na podstawie oficjalnej zbiórki Adasia w serwisie Siepomaga. Ostatnia weryfikacja treści: {ADAS_CAMPAIGN.sourceVerifiedAt}.</p>
              <a href={ADAS_CAMPAIGN.officialCampaignUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-800">Otwórz oficjalną zbiórkę <ArrowRightIcon size={15}/></a>
            </div>
          </article>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold text-ink">Zweryfikowane informacje</h2>
            <dl className="mt-5 divide-y divide-slate-100">
              {FACTS.map(([label, value]) => <div key={label} className="py-3 first:pt-0"><dt className="text-xs font-semibold uppercase tracking-[.08em] text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold leading-6 text-ink">{value}</dd></div>)}
            </dl>
          </aside>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-14">
        <div className="page-shell">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-700">Trzy sposoby pomocy</p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-.03em] text-ink">Nie każdy musi licytować, żeby realnie pomóc</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Help title="Wpłać" text="Wpłać dowolną kwotę bezpośrednio na oficjalną zbiórkę Adasia w serwisie Siepomaga.pl. Konto w LicytujDobro nie jest potrzebne." href={piggyBankUrl} external/>
            <Help title="Licytuj" text="Wybierz przedmiot. Po wygranej wpłacisz zadeklarowaną kwotę bezpośrednio dla Adasia." href="/aukcje"/>
            <Help title="Udostępnij" text="Przekaż link rodzinie, znajomym lub lokalnej grupie. Jedno udostępnienie może dotrzeć do kolejnego darczyńcy." href={ADAS_CAMPAIGN.officialCampaignUrl} external/>
          </div>
        </div>
      </section>

      <section className="page-shell py-14">
        <DirectHelpCard piggyBankUrl={piggyBankUrl}/>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[.12em] text-brand-700">Stała pomoc</p>
            <h2 className="mt-2 text-xl font-bold text-ink">Wspieraj Adasia co miesiąc</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">Na oficjalnej stronie Siepomaga można ustawić regularną pomoc i samodzielnie zdecydować o kwocie oraz czasie wsparcia.</p>
            <a href={ADAS_CAMPAIGN.monthlySupportUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-700">Przejdź do Stałej Pomocy <ArrowRightIcon size={15}/></a>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[.12em] text-brand-700">1,5% podatku</p>
            <h2 className="mt-2 text-xl font-bold text-ink">Przekaż 1,5% dla Adasia</h2>
            <dl className="mt-4 grid gap-3 text-sm"><div><dt className="text-slate-500">KRS</dt><dd className="font-bold text-ink">{ADAS_CAMPAIGN.taxKrs}</dd></div><div><dt className="text-slate-500">Cel szczegółowy</dt><dd className="font-bold text-ink">{ADAS_CAMPAIGN.taxPurpose}</dd></div></dl>
            <a href={ADAS_CAMPAIGN.officialCampaignUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-700">Sprawdź szczegóły na Siepomaga <ArrowRightIcon size={15}/></a>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white py-12">
        <div className="page-shell flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[.12em] text-brand-700">Region licytacji</p><p className="mt-1 inline-flex items-center gap-2 font-semibold text-ink"><MapPinIcon size={17}/>{ADAS_CAMPAIGN.regionLabel}</p></div>
          <Link href="/gdzie-trafiaja-pieniadze" className="inline-flex items-center gap-2 text-sm font-bold text-brand-700"><HandHeartIcon size={17}/> Zobacz, jak pieniądze trafiają do Adasia <ArrowRightIcon size={15}/></Link>
        </div>
      </section>
    </main>
  );
}

function Help({ title, text, href, external = false }: { title: string; text: string; href: string; external?: boolean }) {
  const content = <><h3 className="text-xl font-bold text-ink">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{text}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-700">Pomagam <ArrowRightIcon size={15}/></span></>;
  const className = "rounded-2xl border border-slate-200 bg-white p-6 hover:border-brand-300 hover:shadow-sm";
  return external ? <a href={href} target="_blank" rel="noreferrer" className={className}>{content}</a> : <Link href={href} className={className}>{content}</Link>;
}
