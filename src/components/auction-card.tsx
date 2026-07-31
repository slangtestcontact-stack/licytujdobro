import Image from "next/image";
import Link from "next/link";

import { ClockIcon, HeartIcon, MapPinIcon, StarIcon } from "@/components/icons";
import { formatCountdown, formatMoney, isEndingSoon, polishPlural } from "@/lib/auction-logic";
import { CONDITION_LABELS } from "@/lib/config";

export interface AuctionCardData {
  listingId: string;
  title: string;
  categoryName: string;
  condition: string;
  district: string;
  photoUrl: string;
  currentPrice: string;
  mode: string;
  bidCount: number;
  minNextBid: number;
  endAt: Date | string | null;
  sellerNickname: string;
  sellerEmoji?: string | null;
  sellerRating?: string | null;
  isWatched?: boolean;
  isSpecial?: boolean;
  specialLabel?: string | null;
}

function formatEndDate(value: Date) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function AuctionCard({ data }: { data: AuctionCardData }) {
  const endAt = data.endAt ? new Date(data.endAt) : null;
  const endingSoon = endAt && !Number.isNaN(endAt.getTime()) ? isEndingSoon(endAt) : false;
  const initials = data.sellerNickname.slice(0, 2).toUpperCase();
  const conditionLabel =
    CONDITION_LABELS[data.condition as keyof typeof CONDITION_LABELS] ?? data.condition;
  const isFixedDonation =
    data.mode === "FIXED_DONATION" || data.mode === "INTEREST_THEN_AUCTION";

  return (
    <article className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(16,40,32,.05)] hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_9px_24px_rgba(16,40,32,.09)]">
      <Link
        href={`/aukcje/${data.listingId}`}
        className="block"
        aria-label={
          isFixedDonation
            ? `${data.title}, stała wpłata ${formatMoney(data.currentPrice)}`
            : `${data.title}, aktualna oferta ${formatMoney(data.currentPrice)}, minimalna następna oferta ${formatMoney(data.minNextBid)}`
        }
      >
        <div className="relative aspect-[5/4] overflow-hidden bg-slate-100">
          <Image
            src={data.photoUrl}
            alt={data.title}
            fill
            sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transform-none motion-reduce:transition-none"
          />
          <div className="absolute left-3 top-3 flex max-w-[calc(100%-64px)] flex-wrap gap-2">
            {data.isSpecial && (
              <span className="rounded-md bg-amber-500 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white shadow-sm">
                {data.specialLabel || "Aukcja specjalna"}
              </span>
            )}
            <span className="rounded-md border border-white/70 bg-white/92 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-brand-800 backdrop-blur-sm">
              {data.categoryName}
            </span>
          </div>
          <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/92 text-slate-600 shadow-sm backdrop-blur-sm" aria-hidden>
            <HeartIcon size={16} />
          </span>
        </div>

        <div className="p-4">
          <h3 className="line-clamp-2 min-h-11 text-[15px] font-semibold leading-[1.45] text-ink group-hover:text-brand-700">
            {data.title}
          </h3>

          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                {isFixedDonation ? "Stała wpłata" : "Aktualna oferta"}
              </p>
              <p className="mt-0.5 text-[22px] font-bold tracking-[-0.025em] text-brand-800">{formatMoney(data.currentPrice)}</p>
            </div>
            <p className="pb-1 text-xs font-semibold text-slate-600">
              {isFixedDonation
                ? "Pierwsza rezerwacja"
                : `${data.bidCount} ${polishPlural(data.bidCount, "oferta", "oferty", "ofert")}`}
            </p>
          </div>

          <dl className="mt-3 grid gap-1.5 text-xs leading-5 text-slate-600">
            <div className="flex items-start justify-between gap-3">
              <dt>{isFixedDonation ? "Sposób" : "Następna oferta od"}</dt>
              <dd className="font-semibold text-ink">
                {isFixedDonation ? "Rezerwacja" : formatMoney(data.minNextBid)}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt>Stan</dt>
              <dd className="text-right font-semibold text-ink">{conditionLabel}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt>Koniec</dt>
              <dd className="text-right font-semibold text-ink">{endAt && !Number.isNaN(endAt.getTime()) ? formatEndDate(endAt) : "-"}</dd>
            </div>
          </dl>

          <div className={`mt-3 inline-flex items-center gap-1.5 text-xs ${endingSoon ? "font-semibold text-amber-700" : "text-slate-600"}`}>
            <ClockIcon size={14} /> {endAt && !Number.isNaN(endAt.getTime()) ? `${isFixedDonation ? "Dostępny jeszcze" : "Kończy się"} ${formatCountdown(endAt)}` : "Termin nieustalony"}
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-600">
            <MapPinIcon size={14} /> {data.district}
          </div>

          <p className="mt-4 border-t border-slate-100 pt-3 text-xs font-semibold leading-5 text-brand-800">
            Wpłata trafia bezpośrednio na oficjalną zbiórkę Adasia w Siepomaga.pl.
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-800">{initials}</span>
              {data.sellerNickname}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
              <StarIcon size={13} className="fill-amber-400 text-amber-500" />
              {Number(data.sellerRating ?? 0).toFixed(1)}
            </span>
          </div>
          <span className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand-800 px-4 py-2.5 text-sm font-bold text-white">
            {isFixedDonation ? "Zobacz i zarezerwuj" : "Licytuj i pomóż"}
          </span>
        </div>
      </Link>
    </article>
  );
}
