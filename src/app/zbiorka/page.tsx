import Image from "next/image";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";

import { AuctionCard } from "@/components/auction-card";
import { DonationButtons, DirectHelpCard } from "@/components/donation-actions";
import { ArrowRightIcon, HandHeartIcon, MapPinIcon, ShieldIcon } from "@/components/icons";
import { Alert, SectionHeading, StatCard } from "@/components/ui";
import { db } from "@/db";
import { campaignUpdates } from "@/db/schema";
import { ADAS_CAMPAIGN } from "@/lib/adas-campaign";
import { formatMoney } from "@/lib/auction-logic";
import { getHomePublicData } from "@/lib/public-data";

export default async function CampaignPage() {
  const home = await getHomePublicData();
  const campaign = home.campaign;

  if (!campaign) {
    return (
      <main className="page-shell max-w-3xl py-16">
        <Alert tone="warning">Uruchom <code>npm run db:seed</code>, aby skonfigurować zbiórkę Adasia.</Alert>
      </main>
    );
  }

  const updates = await db
    .select()
    .from(campaignUpdates)
    .where(and(eq(campaignUpdates.campaignId, campaign.id), eq(campaignUpdates.isPublished, true)))
    .orderBy(desc(campaignUpdates.publishedAt))
    .limit(6);

  const piggyBankUrl = campaign.piggyBankUrl || ADAS_CAMPAIGN.piggyBankUrl;
  const activeAuctions = home.endingSoon;
  const hasCompletedStats = home.stats.completed > 0 || Number(home.stats.confirmedAmount) > 0;

  return (
    <main>
      <section className="border-b border-slate-200 bg-white py-10 sm:py-14">
        <div className="page-shell grid items-center gap-10 lg:grid-cols-[.92fr_1.08fr] lg:gap-14">
          <div className="relative aspect-square overflow-hidden rounded-[28px] border border-brand-100 bg-brand-50 shadow-[0_18px_55px_rgba(16,40,32,.13)]">
            <Image
              src={campaign.imageUrl || ADAS_CAMPAIGN.imageUrl}
              alt="Adaś w czerwonej koszulce pokazuje kciuk w górę"
              fill
              preload
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover object-[center_35%]"
            />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-700">Pomoc dla Adasia Iwanejko</p>
            <h1 className="text-balance mt-3 max-w-2xl text-4xl font-bold tracking-[-.045em] text-ink sm:text-5xl">Każda wpłata przybliża Adasia do terapii</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">{ADAS_CAMPAIGN.description}</p>
            <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-800"><MapPinIcon size={17}/>{ADAS_CAMPAIGN.locationLabel}</p>
            <div className="mt-7"><DonationButtons piggyBankUrl={piggyBankUrl}/></div>
            <p className="mt-4 max-w-xl text-xs leading-5 text-slate-500">Wpłata odbywa się bezpośrednio na oficjalnej zbiórce Adasia w serwisie Siepomaga.pl. LicytujDobro nie przyjmuje pieniędzy i nie pobiera prowizji. Otworzy się serwis Siepomaga.pl.</p>
          </div>
        </div>
      </section>

      <section className="page-shell py-10 sm:py-12">
        {hasCompletedStats ? (
          <>
            <div className="grid grid-cols-2 gap-x-6 gap-y-7 rounded-xl border-y border-slate-200 py-6 md:grid-cols-4">
              <StatCard label="zadeklarowanego wsparcia z zakończonych odbiorów" value={formatMoney(home.stats.confirmedAmount)}/>
              <StatCard label="zakończonych transakcji" value={home.stats.completed}/>
              <StatCard label="region licytacji" value={ADAS_CAMPAIGN.regionLabel}/>
              <StatCard label="aktualny wynik całej zbiórki" value="Sprawdź na Siepomaga"/>
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">Statystyki kwotowe obejmują wyłącznie transakcje potwierdzone w LicytujDobro.</p>
          </>
        ) : (
          <Alert tone="info" title="Pierwsze aukcje już wkrótce">Statystyki pojawią się po pierwszej zakończonej i potwierdzonej transakcji.</Alert>
        )}

        <div className="mt-10 grid gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white md:grid-cols-3">
          <Feature icon={HandHeartIcon} title="Wpłać bezpośrednio" description="Nie potrzebujesz konta ani przedmiotu. To najszybsza droga pomocy."/>
          <Feature icon={ShieldIcon} title="Pieniądze nie trafiają do nas" description="Wpłata odbywa się w oficjalnej domenie siepomaga.pl."/>
          <Feature icon={MapPinIcon} title="Licytuj lokalnie" description="Przedmiot zachęca do udziału, a zwycięska kwota pomaga Adasiowi."/>
        </div>

        <section className="mt-14">
          <SectionHeading title="Wybierz aukcję i pomóż Adasiowi" description="Cała wylicytowana kwota trafia bezpośrednio na oficjalną zbiórkę Adasia w serwisie Siepomaga.pl." action={<Link href="/aukcje" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700">Zobacz wszystkie <ArrowRightIcon size={15}/></Link>}/>
          {activeAuctions.length > 0 ? (
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{activeAuctions.map((item) => <AuctionCard key={item.listingId} data={item}/>)}</div>
          ) : (
            <div className="mt-7 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
              <p className="font-semibold text-ink">Pierwsze aukcje pojawią się po moderacji.</p>
              <p className="mt-2 text-sm text-slate-600">Do tego czasu możesz pomóc Adasiowi bezpośrednią wpłatą albo udostępnieniem zbiórki.</p>
              <a href={piggyBankUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-brand-800 px-5 text-sm font-bold text-white">Wpłać dla Adasia - otwórz Siepomaga.pl ↗</a>
            </div>
          )}
        </section>

        <section className="mt-14 grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-700">Najważniejszy efekt</p>
            <h2 className="text-balance mt-3 text-3xl font-bold tracking-[-.03em] text-ink">Finałem aukcji jest wpłata dla Adasia</h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700">Przedmiot jest zachętą do udziału. Zwycięzca spotyka się z wystawiającym, sprawdza rzecz i wykonuje wylicytowaną wpłatę bezpośrednio w serwisie Siepomaga.pl. Po jej potwierdzeniu otrzymuje przedmiot.</p>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">Szczegółowa instrukcja bezpieczeństwa jest dostępna osobno i nie przesłania głównego celu: zebrania jak największej pomocy dla Adasia.</p>
            <div className="mt-6 flex flex-wrap gap-3"><Link href="/historia-adasia" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-800 px-5 text-sm font-semibold text-white">Poznaj historię Adasia <ArrowRightIcon size={15}/></Link><Link href="/bezpieczenstwo" className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-5 text-sm font-semibold text-ink">Zasady bezpiecznego odbioru</Link></div>
          </div>
          <DirectHelpCard piggyBankUrl={piggyBankUrl}/>
        </section>

        {updates.length > 0 && (
          <section id="aktualnosci" className="mt-14 scroll-mt-24 border-t border-slate-200 pt-10">
            <SectionHeading eyebrow="Aktualności" title="Co nowego w akcji dla Adasia?" description="Informacje organizacyjne i podsumowania działań LicytujDobro."/>
            <div className="mt-7 grid gap-4 md:grid-cols-2">{updates.map((update) => <article key={update.id} className="rounded-xl border border-slate-200 bg-white p-5"><time className="text-xs font-semibold text-brand-700">{update.publishedAt.toLocaleDateString("pl-PL", { dateStyle: "long" })}</time><h3 className="mt-2 text-lg font-bold text-ink">{update.title}</h3><p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{update.body}</p></article>)}</div>
          </section>
        )}
      </section>
    </main>
  );
}

function Feature({ icon: Icon, title, description }: { icon: typeof ShieldIcon; title: string; description: string }) {
  return <div className="flex gap-3 border-b border-slate-200 p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon size={20}/></span><div><h2 className="text-sm font-semibold text-ink">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-600">{description}</p></div></div>;
}
