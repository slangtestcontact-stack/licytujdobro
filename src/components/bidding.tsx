"use client";

import Link from "next/link";
import { type ReactNode, useActionState, useEffect, useRef, useState } from "react";
import { placeBidAction, type BidResult } from "@/actions/bidding";
import { Alert, Button, inputClass } from "@/components/ui";
import { CheckIcon, ClockIcon, GavelIcon, HandHeartIcon, MapPinIcon, PackageIcon, ShieldIcon, TrophyIcon } from "@/components/icons";
import { formatCountdown, formatMoney } from "@/lib/auction-logic";

const initial: BidResult = { ok: false };

type LiveAuctionState = {
  currentPrice: number;
  bidCount: number;
  minNextBid: number;
  endAt: string | null;
  status: string;
  lockVersion: number;
};

export function LiveCountdown({ endAt }: { endAt: string | null }) {
  const [label, setLabel] = useState(() =>
    endAt ? formatCountdown(new Date(endAt)) : "—",
  );

  useEffect(() => {
    if (!endAt) return;
    const id = setInterval(
      () => setLabel(formatCountdown(new Date(endAt))),
      1_000,
    );
    return () => clearInterval(id);
  }, [endAt]);

  return <span>{label}</span>;
}

export function BidPanel({
  auctionId,
  listingId,
  listingTitle,
  currentPrice,
  bidCount,
  minNextBid,
  initialAmount,
  openOnLoad = false,
  endAt,
  campaignName,
  piggyBankUrl,
  city,
  canBid,
  loginRequired = false,
  verificationUrl,
  disabledReason,
  isLeading = false,
  requiresTermsAcceptance = false,
}: {
  auctionId: string;
  listingId: string;
  listingTitle: string;
  currentPrice: number;
  bidCount: number;
  minNextBid: number;
  initialAmount?: number;
  openOnLoad?: boolean;
  endAt: string | null;
  campaignName: string;
  piggyBankUrl: string;
  city: string;
  canBid: boolean;
  loginRequired?: boolean;
  verificationUrl?: string;
  disabledReason?: string;
  isLeading?: boolean;
  requiresTermsAcceptance?: boolean;
}) {
  const [live, setLive] = useState<LiveAuctionState>({
    currentPrice,
    bidCount,
    minNextBid,
    endAt,
    status: "AKTYWNA",
    lockVersion: 0,
  });
  const [amount, setAmount] = useState(
    initialAmount && initialAmount >= minNextBid ? initialAmount : minNextBid,
  );
  const [termsAccepted, setTermsAccepted] = useState(!requiresTermsAcceptance);
  const [commitmentAccepted, setCommitmentAccepted] = useState(false);
  const [showModal, setShowModal] = useState(openOnLoad && canBid);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [state, formAction, pending] = useActionState(placeBidAction, initial);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const handledBidPrice = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    async function refreshLiveState() {
      try {
        const response = await fetch(`/api/auctions/${auctionId}/live`, {
          cache: "no-store",
        });
        const data = await response.json();
        if (!active || !data.ok) return;
        setLive({
          currentPrice: data.currentPrice,
          bidCount: data.bidCount,
          minNextBid: data.minNextBid,
          endAt: data.endAt,
          status: data.status,
          lockVersion: data.lockVersion,
        });
      } catch {
        // Polling jest dodatkiem. Błąd sieci nie blokuje licytacji ani strony.
      }
    }

    void refreshLiveState();
    const interval = setInterval(refreshLiveState, 6_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshLiveState();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [auctionId]);

  useEffect(() => {
    queueMicrotask(() => {
      setAmount((previous) =>
        previous >= live.minNextBid ? previous : live.minNextBid,
      );
    });
  }, [live.minNextBid]);

  useEffect(() => {
    if (!state.ok || state.newPrice == null) return;
    if (handledBidPrice.current === state.newPrice) return;

    handledBidPrice.current = state.newPrice;
    queueMicrotask(() => {
      setShowModal(false);
      setIdempotencyKey(crypto.randomUUID());
      setLive((current) => ({
        ...current,
        currentPrice: state.newPrice ?? current.currentPrice,
        minNextBid: state.minNextBid ?? current.minNextBid,
        bidCount: current.bidCount + 1,
      }));
      if (state.minNextBid) setAmount(state.minNextBid);
    });
  }, [state.ok, state.newPrice, state.minNextBid]);

  useEffect(() => {
    if (!showModal) return;
    confirmRef.current?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) setShowModal(false);
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [showModal, pending]);

  const validAmount = Number.isFinite(amount) && amount >= live.minNextBid;
  const liveCanBid = canBid && live.status === "AKTYWNA";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_5px_18px_rgba(16,40,32,.07)] sm:p-6">
      {isLeading && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
          Prowadzisz w tej aukcji
        </div>
      )}

      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
        {live.bidCount === 0 ? "Cena początkowa" : "Aktualna oferta"}
      </p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="text-4xl font-bold tracking-[-0.035em] text-brand-800">
          {formatMoney(live.currentPrice)}
        </p>
        <p className="pb-1 text-xs text-slate-500">{live.bidCount} ofert</p>
      </div>
      <div className="mt-4 flex items-center gap-2 border-y border-slate-100 py-3 text-sm text-slate-600">
        <ClockIcon size={17} className="text-brand-700" />
        <span>
          Koniec za{" "}
          <strong className="text-ink">
            <LiveCountdown endAt={live.endAt} />
          </strong>
        </span>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Cena i czas odświeżają się automatycznie co kilka sekund.
      </p>

      {state.error && (
        <div className="mt-4">
          <Alert tone="danger">{state.error}</Alert>
        </div>
      )}
      {state.ok && (
        <div className="mt-4">
          <Alert tone="success">
            Oferta {formatMoney(state.newPrice ?? 0)} została zapisana.
          </Alert>
        </div>
      )}

      {liveCanBid || loginRequired ? (
        <div className="mt-5">
          <label htmlFor="bid-amount" className="text-sm font-semibold text-ink">
            Twoja oferta
          </label>
          <p className="mt-0.5 text-xs text-slate-500">
            Minimum: {formatMoney(live.minNextBid)}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              id="bid-amount"
              type="number"
              min={live.minNextBid}
              step="1"
              value={Number.isFinite(amount) ? amount : ""}
              onChange={(event) =>
                setAmount(
                  event.target.value === "" ? Number.NaN : Number(event.target.value),
                )
              }
              className={inputClass}
              inputMode="decimal"
            />
            <span className="text-sm font-semibold text-slate-500">zł</span>
          </div>

          {loginRequired ? (
            <Link
              href={`/logowanie?returnTo=${encodeURIComponent(
                `/aukcje/${listingId}?bid=${amount}&confirmBid=1`,
              )}`}
              className={`mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-800 px-5 text-sm font-semibold text-white hover:bg-brand-700 ${
                !validAmount ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <GavelIcon size={18} />
              Zaloguj się i potwierdź {formatMoney(amount)}
            </Link>
          ) : (
            <>
              <Button
                size="lg"
                className="mt-4 w-full"
                disabled={!validAmount || !liveCanBid || !commitmentAccepted}
                onClick={() => setShowModal(true)}
              >
                <GavelIcon size={18} /> Licytuję {formatMoney(amount)} dla Adasia
              </Button>
              <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-slate-700">
                <input
                  type="checkbox"
                  checked={commitmentAccepted}
                  onChange={(event) => setCommitmentAccepted(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-brand-700"
                />
                <span>
                  Rozumiem, że moja oferta jest zobowiązaniem do wpłaty
                  zadeklarowanej kwoty, jeśli wygram licytację.
                </span>
              </label>
            </>
          )}
        </div>
      ) : (
        <div className="mt-5">
          <Alert tone="warning">
            {disabledReason ?? "Licytacja nie jest teraz dostępna."}
          </Alert>
          {verificationUrl && (
            <Link
              href={verificationUrl}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand-800 px-4 text-sm font-bold text-white"
            >
              Zweryfikuj kontakt i wróć do oferty
            </Link>
          )}
        </div>
      )}

      <div className="mt-5 rounded-lg border border-brand-100 bg-brand-50/70 p-4">
        <p className="text-sm font-bold text-brand-900">Jak działa licytacja?</p>
        <ol className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
          <AuctionStep icon={GavelIcon} number="1">Użytkownicy podbijają kwotę wsparcia.</AuctionStep>
          <AuctionStep icon={TrophyIcon} number="2">Najwyższa oferta wygrywa.</AuctionStep>
          <AuctionStep icon={HandHeartIcon} number="3">Zwycięzca wpłaca kwotę na zbiórkę Adasia.</AuctionStep>
          <AuctionStep icon={PackageIcon} number="4">Kontaktuje się z wystawiającym i ustala odbiór osobisty.</AuctionStep>
        </ol>
      </div>

      <div className="mt-5 grid gap-2 text-xs leading-5 text-slate-600">
        <p className="inline-flex items-start gap-2">
          <MapPinIcon size={15} className="mt-0.5 shrink-0 text-brand-700" />
          Odbiór osobisty: {city}
        </p>
        <p className="inline-flex items-start gap-2">
          <ShieldIcon size={15} className="mt-0.5 shrink-0 text-brand-700" />
          Wpłata trafia bezpośrednio na „{campaignName}”. LicytujDobro jej nie weryfikuje.
        </p>
      </div>

      <div className="mt-4 rounded-lg bg-brand-50 p-3 text-center">
        <p className="text-xs font-semibold leading-5 text-brand-900">
          Nie chcesz licytować? Możesz pomóc Adasiowi od razu, bez logowania.
        </p>
        <a
          href={piggyBankUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand-800 px-4 text-sm font-bold text-white hover:bg-brand-700"
        >
          Wpłać bezpośrednio dla Adasia ↗
        </a>
      </div>

      {(liveCanBid || loginRequired) && (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-slate-200 bg-white/96 p-3 shadow-[0_-8px_25px_rgba(16,40,32,.14)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-slate-500">Twoja oferta</p>
              <p className="truncate text-lg font-bold text-brand-800">{formatMoney(amount)}</p>
            </div>
            {loginRequired ? (
              <Link
                href={`/logowanie?returnTo=${encodeURIComponent(`/aukcje/${listingId}?bid=${amount}&confirmBid=1`)}`}
                className={`inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-800 px-4 text-sm font-bold text-white ${!validAmount ? "pointer-events-none opacity-50" : ""}`}
              >
                Zaloguj się i licytuj
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setShowModal(true)}
                disabled={!validAmount || !liveCanBid || !commitmentAccepted}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-800 px-4 text-sm font-bold text-white disabled:opacity-50"
              >
                Potwierdź ofertę
              </button>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bid-modal-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 id="bid-modal-title" className="text-xl font-bold text-ink">
              Potwierdź ofertę
            </h2>
            <p className="mt-4 text-3xl font-bold tracking-[-.03em] text-brand-800">
              Licytujesz: {formatMoney(amount)}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Jeśli Twoja oferta pozostanie najwyższa po zakończeniu aukcji,
              zobowiązujesz się wpłacić {formatMoney(amount)} bezpośrednio na
              oficjalną zbiórkę „{campaignName}”.
            </p>

            <div className="mt-5 rounded-lg border border-brand-100 bg-brand-50/70 p-4">
              <p className="text-sm font-bold text-brand-900">Co stanie się dalej?</p>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
                <ModalStep icon={GavelIcon}>Jeśli ktoś Cię przebije, możesz złożyć wyższą ofertę.</ModalStep>
                <ModalStep icon={TrophyIcon}>Jeśli wygrasz, otrzymasz kontakt do wystawiającego.</ModalStep>
                <ModalStep icon={PackageIcon}>Wpłacisz na zbiórkę i samodzielnie ustalisz odbiór osobisty.</ModalStep>
              </ul>
            </div>

            <label className="mt-5 flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
              <input
                type="checkbox"
                checked={commitmentAccepted}
                onChange={(event) => setCommitmentAccepted(event.target.checked)}
                className="mt-1 h-4 w-4 accent-brand-700"
              />
              <span>Potwierdzam, że moja oferta jest wiążąca.</span>
            </label>

            {requiresTermsAcceptance && (
              <label className="mt-3 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-brand-700"
                />
                <span>Akceptuję aktualne zasady licytacji.</span>
              </label>
            )}

            <form action={formAction} className="mt-5 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="auctionId" value={auctionId} />
              <input type="hidden" name="amount" value={amount} />
              <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
              <input
                type="hidden"
                name="acceptCurrentBiddingTerms"
                value={termsAccepted ? "on" : ""}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={pending}
              >
                Anuluj
              </Button>
              <button
                ref={confirmRef}
                type="submit"
                disabled={pending || !termsAccepted || !commitmentAccepted}
                className="min-h-11 rounded-lg bg-brand-800 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {pending ? "Zapisywanie…" : "Potwierdzam ofertę"}
              </button>
            </form>
            <p className="mt-4 text-center text-xs leading-5 text-slate-500">
              LicytujDobro nie przyjmuje ani nie weryfikuje wpłat — pieniądze trafiają bezpośrednio na zbiórkę.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function AuctionStep({
  icon: Icon,
  number,
  children,
}: {
  icon: typeof GavelIcon;
  number: string;
  children: ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-800 text-[11px] font-bold text-white">
        {number}
      </span>
      <span className="flex items-start gap-2">
        <Icon size={15} className="mt-1 shrink-0 text-brand-700" />
        <span>{children}</span>
      </span>
    </li>
  );
}

function ModalStep({
  icon: Icon,
  children,
}: {
  icon: typeof GavelIcon;
  children: ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-brand-800 shadow-sm">
        <Icon size={14} />
      </span>
      <span>{children}</span>
    </li>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="grid grid-cols-[105px_1fr] gap-4 py-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`${bold ? "font-bold text-brand-800" : "text-ink"} text-right`}>
        {value}
      </dd>
    </div>
  );
}
