"use client";

import { useActionState } from "react";
import { declareInterestAction, type InterestResult } from "@/actions/interests";
import { Alert, Button } from "@/components/ui";

const initialState: InterestResult = { ok: false };

export function InterestPanel({ auctionId, amount, deadline, count, alreadyInterested, canJoin, disabledReason }: {
  auctionId: string;
  amount: number;
  deadline: string;
  count: number;
  alreadyInterested: boolean;
  canJoin: boolean;
  disabledReason?: string;
}) {
  const [state, action, pending] = useActionState(declareInterestAction, initialState);
  const shownCount = state.count ?? count;
  return <section className="rounded-2xl border border-brand-200 bg-brand-50 p-5">
    <p className="text-xs font-bold uppercase tracking-[.1em] text-brand-700">Najpierw zgłoszenia zainteresowania</p>
    <p className="mt-2 text-3xl font-bold text-ink">{amount.toFixed(2).replace(".", ",")} zł</p>
    <p className="mt-1 text-sm text-slate-600">Kwota wsparcia, gdy zgłosi się jedna osoba.</p>
    <div className="mt-4 rounded-xl bg-white p-4 text-sm leading-6 text-slate-700">
      <strong>{shownCount} {shownCount === 1 ? "osoba zainteresowana" : "osób zainteresowanych"}</strong><br />
      Zapisy do {new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(deadline))}.
      Gdy zainteresowanych będzie co najmniej dwoje, system uruchomi 24-godzinną licytację.
    </div>
    {state.error && <div className="mt-3"><Alert tone="danger">{state.error}</Alert></div>}
    {state.ok && <div className="mt-3"><Alert tone="success">Zainteresowanie zapisane.</Alert></div>}
    {alreadyInterested || state.ok ? <p className="mt-4 font-semibold text-brand-800">Jesteś zapisany na ten przedmiot.</p> : <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="auctionId" value={auctionId} />
      <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
        <input type="checkbox" name="acceptCommitment" className="mt-1 h-4 w-4" required />
        <span>Rozumiem, że jeśli będę jedyną zainteresowaną osobą, zobowiązuję się wpłacić {amount.toFixed(2).replace(".", ",")} zł na oficjalną zbiórkę Adasia i odebrać przedmiot.</span>
      </label>
      <Button type="submit" disabled={!canJoin || pending}>{pending ? "Zapisywanie…" : "Chcę ten przedmiot"}</Button>
      {!canJoin && disabledReason ? <p className="text-sm text-slate-600">{disabledReason}</p> : null}
    </form>}
  </section>;
}
