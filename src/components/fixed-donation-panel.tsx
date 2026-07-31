"use client";

import Link from "next/link";
import { type ReactNode, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  reserveFixedDonationAction,
  type FixedDonationResult,
} from "@/actions/fixed-donation";
import { Alert, Button } from "@/components/ui";
import { CheckIcon, HandHeartIcon, PackageIcon, ShieldIcon } from "@/components/icons";
import { formatMoney } from "@/lib/auction-logic";

const initialState: FixedDonationResult = { ok: false };

export function FixedDonationPanel({
  auctionId,
  listingId,
  amount,
  canReserve,
  loginRequired,
  disabledReason,
  campaignName,
}: {
  auctionId: string;
  listingId: string;
  amount: number;
  canReserve: boolean;
  loginRequired: boolean;
  disabledReason?: string;
  campaignName: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    reserveFixedDonationAction,
    initialState,
  );

  useEffect(() => {
    if (state.ok && state.transactionId) {
      router.push(`/transakcje/${state.transactionId}`);
    }
  }, [router, state.ok, state.transactionId]);

  return (
    <section className="rounded-xl border border-brand-200 bg-brand-50/70 p-5 shadow-[0_5px_18px_rgba(16,40,32,.06)] sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[.12em] text-brand-700">
        Za stałą wpłatę
      </p>
      <p className="mt-2 text-sm text-slate-600">Kwota wsparcia</p>
      <p className="mt-1 text-4xl font-bold tracking-[-.035em] text-brand-800">
        {formatMoney(amount)}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        Pierwsza osoba, która zarezerwuje przedmiot, wpłaca zadeklarowaną kwotę
        bezpośrednio na zbiórkę i ustala z wystawiającym odbiór osobisty.
      </p>

      <div className="mt-5 rounded-lg border border-white bg-white p-4">
        <p className="font-semibold text-ink">Jak to działa?</p>
        <ol className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
          <Step icon={CheckIcon}>Rezerwujesz przedmiot za {formatMoney(amount)}.</Step>
          <Step icon={HandHeartIcon}>Wpłacasz bezpośrednio na „{campaignName}”.</Step>
          <Step icon={PackageIcon}>Kontaktujesz się z wystawiającym i ustalacie odbiór osobisty.</Step>
        </ol>
      </div>

      {state.error ? (
        <div className="mt-4"><Alert tone="danger">{state.error}</Alert></div>
      ) : null}

      {loginRequired ? (
        <Link
          href={`/logowanie?returnTo=${encodeURIComponent(`/aukcje/${listingId}`)}`}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-brand-800 px-5 text-sm font-bold text-white hover:bg-brand-700"
        >
          Zaloguj się i zarezerwuj
        </Link>
      ) : canReserve ? (
        <form action={action} className="mt-5 space-y-4">
          <input type="hidden" name="auctionId" value={auctionId} />
          <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
            <input
              type="checkbox"
              name="acceptCommitment"
              required
              className="mt-1 h-4 w-4 accent-brand-700"
            />
            <span>
              Rozumiem, że rezerwacja oznacza deklarację wpłaty {formatMoney(amount)}
              bezpośrednio na oficjalną zbiórkę oraz osobistego odbioru przedmiotu.
            </span>
          </label>
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Rezerwowanie…" : `Rezerwuję za wpłatę ${formatMoney(amount)}`}
          </Button>
        </form>
      ) : (
        <div className="mt-5"><Alert tone="warning">{disabledReason ?? "Przedmiot nie jest dostępny."}</Alert></div>
      )}

      <p className="mt-5 flex items-start gap-2 border-t border-brand-200 pt-4 text-xs leading-5 text-brand-900">
        <ShieldIcon size={16} className="mt-0.5 shrink-0" />
        Nie płacisz wystawiającemu. LicytujDobro nie przyjmuje ani nie weryfikuje wpłat.
      </p>
    </section>
  );
}

function Step({ icon: Icon, children }: { icon: typeof CheckIcon; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800">
        <Icon size={14} />
      </span>
      <span>{children}</span>
    </li>
  );
}
