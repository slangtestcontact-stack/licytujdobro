"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { placeBidAction, type BidResult } from "@/actions/bidding";
import { Alert, Button, inputClass } from "@/components/ui";
import { ClockIcon, GavelIcon, MapPinIcon, ShieldIcon } from "@/components/icons";
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
    endAt ? formatCountdown(new Date(endAt)) : "-",
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
  const router = useRouter();
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
  const [showModal, setShowModal] = useState(openOnLoad && canBid);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [state, formAction, pending] = useActionState(placeBidAction, initial);
  const confirmRef = useRef<HTMLButtonElement>(null);

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
    if (!state.ok) return;
    queueMicrotask(() => {
      setShowModal(false);
      setIdempotencyKey(crypto.randomUUID());
      if (state.minNextBid) setAmount(state.minNextBid);
      router.refresh();
    });
  }, [state, router]);

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
            <Button
              size="lg"
              className="mt-4 w-full"
              disabled={!validAmount || !liveCanBid}
              onClick={() => setShowModal(true)}
            >
              <GavelIcon size={18} /> Złóż ofertę
            </Button>
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

      <div className="mt-5 grid gap-2 text-xs leading-5 text-slate-600">
        <p className="inline-flex items-start gap-2">
          <MapPinIcon size={15} className="mt-0.5 shrink-0 text-brand-700" />
          Odbiór osobisty: {city}
        </p>
        <p className="inline-flex items-start gap-2">
          <ShieldIcon size={15} className="mt-0.5 shrink-0 text-brand-700" />
          Wpłata trafia bezpośrednio na „{campaignName}” w Siepomaga.
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

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bid-modal-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 id="bid-modal-title" className="text-xl font-bold text-ink">
              Potwierdź wiążącą ofertę
            </h2>
            <dl className="mt-5 divide-y divide-slate-100 border-y border-slate-100 text-sm">
              <Row label="Przedmiot" value={listingTitle} />
              <Row label="Aktualna oferta" value={formatMoney(live.currentPrice)} />
              <Row label="Twoja oferta" value={formatMoney(amount)} bold />
              <Row label="Zbiórka" value={campaignName} />
              <Row label="Odbiór" value={city} />
            </dl>
            <div className="mt-5">
              <Alert tone="warning">
                W razie wygranej ta kwota stanie się Twoją wpłatą dla Adasia.
              </Alert>
            </div>
            {requiresTermsAcceptance && (
              <label className="mt-4 flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                  className="mt-1 accent-brand-700"
                />
                <span>
                  Rozumiem, że wygrana oznacza obowiązek wpłaty przez Siepomaga i
                  odbioru przedmiotu.
                </span>
              </label>
            )}
            <form action={formAction} className="mt-5 flex flex-col gap-2">
              <input type="hidden" name="auctionId" value={auctionId} />
              <input type="hidden" name="amount" value={amount} />
              <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
              <input
                type="hidden"
                name="acceptCurrentBiddingTerms"
                value={termsAccepted ? "on" : ""}
              />
              <button
                ref={confirmRef}
                type="submit"
                disabled={pending || !termsAccepted}
                className="min-h-12 rounded-lg bg-brand-800 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {pending ? "Zapisywanie…" : `Licytuję ${formatMoney(amount)} dla Adasia`}
              </button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowModal(false)}
                disabled={pending}
              >
                Anuluj
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
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
