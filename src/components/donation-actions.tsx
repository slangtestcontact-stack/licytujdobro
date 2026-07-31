import Link from "next/link";
import { ArrowRightIcon, HandHeartIcon } from "@/components/icons";
import { ADAS_CAMPAIGN } from "@/lib/adas-campaign";

export function DonationButtons({
  piggyBankUrl = ADAS_CAMPAIGN.piggyBankUrl,
  compact = false,
}: {
  piggyBankUrl?: string | null;
  compact?: boolean;
}) {
  const donationUrl = piggyBankUrl || ADAS_CAMPAIGN.piggyBankUrl;
  return (
    <div className={`flex flex-wrap ${compact ? "gap-2" : "gap-3"}`}>
      <a
        href={donationUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Wpłać dla Adasia - otworzy się serwis Siepomaga.pl"
        className={`inline-flex items-center justify-center gap-2 rounded-lg bg-brand-800 font-bold text-white hover:bg-brand-700 ${compact ? "min-h-10 px-4 text-sm" : "min-h-12 px-6 text-base"}`}
      >
        <HandHeartIcon size={compact ? 16 : 18} /> Wpłać dla Adasia <span aria-hidden>↗</span>
      </a>
      <Link
        href="/aukcje"
        className={`inline-flex items-center justify-center gap-2 rounded-lg border border-brand-300 bg-white font-semibold text-brand-800 hover:bg-brand-50 ${compact ? "min-h-10 px-4 text-sm" : "min-h-12 px-6 text-base"}`}
      >
        Zobacz aukcje <ArrowRightIcon size={compact ? 15 : 17} />
      </Link>
    </div>
  );
}

export function DirectHelpCard({ piggyBankUrl = ADAS_CAMPAIGN.piggyBankUrl }: { piggyBankUrl?: string | null }) {
  const donationUrl = piggyBankUrl || ADAS_CAMPAIGN.piggyBankUrl;
  return (
    <section className="rounded-2xl bg-brand-800 p-7 text-white sm:p-9">
      <p className="text-xs font-bold uppercase tracking-[.14em] text-brand-100">Najszybszy sposób pomocy</p>
      <h2 className="mt-3 text-3xl font-bold tracking-[-.03em]">Wpłać bezpośrednio dla Adasia</h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-brand-100">
        Nie musisz mieć konta ani brać udziału w aukcji. Przycisk prowadzi do oficjalnej zbiórki Adasia w serwisie Siepomaga.pl.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={donationUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-white px-6 text-sm font-bold text-brand-800 hover:bg-brand-50">
          <HandHeartIcon size={18}/> Wpłać na Siepomaga.pl ↗
        </a>
        <a href={ADAS_CAMPAIGN.monthlySupportUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-white/35 px-5 text-sm font-semibold text-white hover:bg-white/10">
          Wspieraj Adasia co miesiąc ↗
        </a>
      </div>
      <p className="mt-5 text-xs leading-5 text-brand-200">LicytujDobro nie przyjmuje pieniędzy i nie pobiera prowizji. Płatność odbywa się w domenie siepomaga.pl.</p>
    </section>
  );
}
