import Image from "next/image";
import Link from "next/link";

import { AuctionCard, type AuctionCardData } from "@/components/auction-card";
import { DonationButtons } from "@/components/donation-actions";
import { NewsletterForm } from "@/components/growth-widgets";
import {
  ArrowRightIcon,
  HandHeartIcon,
  HeartIcon,
  ShareIcon,
  ShieldIcon,
  TrophyIcon,
} from "@/components/icons";
import { ProcessSteps } from "@/components/process-steps";
import { SectionHeading, StatCard } from "@/components/ui";
import { formatMoney } from "@/lib/auction-logic";
import { ADAS_CAMPAIGN } from "@/lib/adas-campaign";
import { getHomePublicData } from "@/lib/public-data";

export default async function HomePage() {
  const {
    special,
    popular,
    noBids,
    endingSoon,
    campaign,
    latestUpdate,
    teams,
    stats,
  } = await getHomePublicData();

  const piggyBankUrl = campaign?.piggyBankUrl || ADAS_CAMPAIGN.piggyBankUrl;
  const showCompletedStats =
    stats.completed > 0 || Number(stats.confirmedAmount) > 0;

  return (
    <main>
      <section className="overflow-hidden border-b border-slate-200 bg-white">
        <div className="page-shell grid items-center gap-10 py-10 lg:min-h-[620px] lg:grid-cols-[1.02fr_.98fr] lg:gap-12 lg:py-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[.12em] text-brand-800">
              <HeartIcon size={15} /> Oficjalna zbiórka na Siepomaga.pl
            </p>
            <h1 className="text-balance mt-5 max-w-3xl text-[42px] font-bold leading-[1.06] tracking-[-.045em] text-ink sm:text-5xl lg:text-[58px]">
              Pomóżmy Adasiowi w walce o terapię
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
              Wpłać bezpośrednio na zbiórkę albo weź udział w charytatywnej aukcji.
            </p>
            <div className="mt-8">
              <DonationButtons piggyBankUrl={piggyBankUrl} />
            </div>
            <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-600">
              Wpłata odbywa się bezpośrednio w serwisie Siepomaga.pl.
              LicytujDobro nie przyjmuje ani nie przechowuje pieniędzy.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2">
                <HandHeartIcon size={17} className="text-brand-700" /> Wpłata bez konta
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldIcon size={17} className="text-brand-700" /> Bez prowizji
              </span>
              <span className="inline-flex items-center gap-2">
                <ShareIcon size={17} className="text-brand-700" /> Udostępnienie też pomaga
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[580px]">
            <div className="relative aspect-[5/4] overflow-hidden rounded-[28px] border border-brand-100 bg-brand-50 shadow-[0_24px_70px_rgba(16,40,32,.16)]">
              <Image
                src={campaign?.imageUrl || ADAS_CAMPAIGN.imageUrl}
                alt="Adaś w czerwonej koszulce pokazuje kciuk w górę"
                fill
                preload
                sizes="(max-width: 1024px) 100vw, 48vw"
                className="object-cover object-[center_35%]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell py-12 sm:py-14">
        <SectionHeading
          title="Wybierz przedmiot i pomóż po swojemu"
          description="Zarezerwuj przedmiot za stałą wpłatę albo przebijaj oferty w licytacji. Pieniądze trafiają bezpośrednio na oficjalną zbiórkę Adasia."
          action={
            <Link href="/aukcje" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700">
              Wszystkie przedmioty <ArrowRightIcon size={15} />
            </Link>
          }
        />
        <AuctionGrid
          items={popular}
          emptyText="Pierwsze przedmioty pojawią się już wkrótce. Możesz teraz wpłacić bezpośrednio na zbiórkę."
        />
      </section>

      {showCompletedStats ? (
        <section className="page-shell pb-14">
          <div className="grid grid-cols-2 gap-y-8 rounded-xl border-y border-slate-200 py-6 sm:grid-cols-4">
            {Number(stats.confirmedAmount) > 0 && (
              <StatCard label="zadeklarowanego wsparcia" value={formatMoney(stats.confirmedAmount)} />
            )}
            {stats.completed > 0 && (
              <StatCard label="zakończonych transakcji" value={stats.completed} />
            )}
            {stats.activeListings > 0 && (
              <StatCard label="aktywnych przedmiotów" value={stats.activeListings} />
            )}
            {stats.helpers > 0 && (
              <StatCard label="osób w społeczności" value={stats.helpers} />
            )}
          </div>
          <p className="mt-3 text-center text-xs text-slate-500">
            Statystyki dotyczą wyłącznie LicytujDobro. Aktualny wynik całej zbiórki sprawdzisz na Siepomaga.pl.
          </p>
        </section>
      ) : (
        <section className="page-shell pb-14">
          <div className="rounded-xl border border-brand-200 bg-brand-50 px-5 py-4 text-center text-sm font-semibold text-brand-900">
            Pierwsze zakończone odbiory i zadeklarowane kwoty wsparcia pojawią się tutaj automatycznie.
          </div>
        </section>
      )}

      {special.length > 0 && (
        <section className="page-shell pb-14">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:p-7">
            <SectionHeading
              eyebrow="Wyjątkowe przedmioty"
              title="Wyjątkowe przedmioty dla Adasia"
              description="Autografy, rękodzieło, pamiątki sportowe i przedmioty przekazane przez partnerów."
              action={
                <Link href="/aukcje?specjalne=1" className="inline-flex items-center gap-2 text-sm font-semibold text-amber-800">
                  Wszystkie specjalne <ArrowRightIcon size={15} />
                </Link>
              }
            />
            <AuctionGrid items={special} emptyText="" />
          </div>
        </section>
      )}

      {noBids.length > 0 && (
        <section className="border-y border-slate-200 bg-white py-14">
          <div className="page-shell">
            <SectionHeading
              eyebrow="Pomóż w pierwszym kroku"
              title="Te aukcje czekają na pierwszą ofertę"
              description="Pierwsza oferta może zachęcić kolejne osoby i zwiększyć końcową wpłatę."
              action={
                <Link href="/aukcje?bezOfert=1" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700">
                  Pokaż wszystkie <ArrowRightIcon size={15} />
                </Link>
              }
            />
            <AuctionGrid items={noBids} emptyText="" />
          </div>
        </section>
      )}

      <section className="page-shell py-16">
        <SectionHeading
          title="Jak przedmiot prowadzi do wpłaty dla Adasia?"
          description="Rezerwujesz przedmiot za stałą kwotę albo wygrywasz licytację, a następnie przechodzisz bezpieczny proces odbioru i wpłaty dla Adasia."
        />
        <ProcessSteps />
      </section>

      {latestUpdate && (
        <section className="page-shell pb-16">
          <div className="grid gap-5 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <HeartIcon size={21} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.12em] text-brand-600">Aktualność</p>
              <h2 className="mt-1 text-lg font-bold text-ink">{latestUpdate.title}</h2>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{latestUpdate.body}</p>
            </div>
            <Link href="/zbiorka#aktualnosci" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700">
              Czytaj więcej <ArrowRightIcon size={14} />
            </Link>
          </div>
        </section>
      )}

      {endingSoon.length > 0 && (
        <section className="page-shell pb-16">
          <SectionHeading
            title="Kończą się wkrótce"
            description="Każda kolejna oferta może zwiększyć ostateczną wpłatę dla Adasia."
            action={
              <Link href="/aukcje?sort=konczace" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700">
                Przejdź do katalogu <ArrowRightIcon size={15} />
              </Link>
            }
          />
          <AuctionGrid items={endingSoon} emptyText="" />
        </section>
      )}

      {teams.length > 0 && (
        <section className="border-y border-slate-200 bg-white py-16">
          <div className="page-shell">
            <SectionHeading
              eyebrow="Razem możemy więcej"
              title="Drużyny wspierające Adasia"
              description="Szkoły, firmy, kluby i grupy znajomych pomagają docierać do większej liczby osób."
              action={
                <Link href="/druzyny" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700">
                  Wszystkie drużyny <ArrowRightIcon size={15} />
                </Link>
              }
            />
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/druzyny/${team.slug}`}
                  className="rounded-xl border border-slate-200 bg-surface p-5 hover:border-brand-300 hover:bg-brand-50/40"
                >
                  <TrophyIcon size={21} className="text-brand-700" />
                  <h3 className="mt-4 font-bold text-ink">{team.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{team.description}</p>
                  <p className="mt-4 text-xs font-semibold text-brand-700">{team.members} członków</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="page-shell py-16">
        <div className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-7 lg:grid-cols-[1fr_.85fr] lg:p-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-700">Pomagaj regularnie</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-.03em] text-ink">Nie pozwól, żeby ważna aukcja Ci umknęła</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
              Otrzymuj krótki e-mail z aukcjami kończącymi się w weekend i aktualnościami dotyczącymi Adasia.
            </p>
          </div>
          <div className="rounded-xl bg-brand-50 p-5">
            <NewsletterForm source="homepage" />
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white py-16">
        <div className="page-shell max-w-3xl">
          <SectionHeading title="Najczęstsze pytania" />
          <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink">
                  <span>{item.q}</span>
                  <span className="text-brand-700 group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function AuctionGrid({ items, emptyText }: { items: AuctionCardData[]; emptyText: string }) {
  return items.length ? (
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => <AuctionCard key={item.listingId} data={item} />)}
    </div>
  ) : (
    <p className="mt-8 rounded-xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-600">
      {emptyText}
    </p>
  );
}

const FAQ = [
  {
    q: "Czy mogę pomóc bez zakładania konta?",
    a: "Tak. Bez konta możesz wpłacić bezpośrednio na zbiórkę Adasia, oglądać przedmioty i je udostępniać. Konto jest potrzebne do rezerwacji albo złożenia wiążącej oferty.",
  },
  {
    q: "Czy LicytujDobro przyjmuje pieniądze?",
    a: "Nie. Wpłata odbywa się w serwisie Siepomaga.pl. LicytujDobro nie przechowuje pieniędzy, kodów BLIK ani danych bankowych i nie pobiera prowizji.",
  },
  {
    q: "Czy muszę potwierdzać telefon?",
    a: "Nie. Konto Facebook, Google lub Apple nie wymaga dodatkowego kodu. Przy klasycznej rejestracji e-mailem potwierdzasz jednorazowo wyłącznie adres e-mail.",
  },
  {
    q: "Kiedy zwycięzca wpłaca wylicytowaną kwotę?",
    a: "Po zakończeniu licytacji zwycięzca wpłaca zadeklarowaną kwotę bezpośrednio na oficjalną zbiórkę, otrzymuje kontakt do wystawiającego i samodzielnie ustala z nim osobisty odbiór. LicytujDobro nie weryfikuje wpłaty.",
  },
];
